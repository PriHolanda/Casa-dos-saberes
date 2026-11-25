(() => {
  'use strict';
  const demo = new URLSearchParams(location.search).get('demo') === '1'
    && (['localhost', '127.0.0.1', '[::1]'].includes(location.hostname) || location.protocol === 'file:');
  const formulario = document.getElementById('csa-reservas-form');
  const chave = demo ? 'csa-reserva-rascunho-demo' : 'csa-reserva-rascunho';
  const parametros = new URLSearchParams(location.search);
  const reservaAtual = csaProgramacao.lerReserva(parametros);
  let ocupado = false;

  function pagina(nome, reserva) {
    const busca = new URLSearchParams(csaProgramacao.parametrosReserva(reserva));
    if (demo) busca.set('demo', '1');
    return busca.size ? `${nome}?${busca}` : nome;
  }

  function descreverReserva(reserva) {
    const espaco = csaAgendaModelo.espacos.find(item => item.id === reserva.espacoId);
    const turno = csaProgramacao.turnos[reserva.turno];
    return `${espaco.nome} · ${csaAgendaModelo.formatarDia(reserva.data)} · ${turno.inicio} às ${turno.fim}`;
  }

  async function enviarReserva({ dados: { respostas }, arquivos, reserva }, definicao) {
    if (arquivos.proposta) throw new Error('O envio de PDF está indisponível. Retire o anexo e informe o link da proposta para enviar.');
    if (respostas.segmentos.length !== 1 || respostas.pautas.length !== 1) {
      throw new Error('Para enviar pela agenda, selecione um segmento e uma pauta na proposta.');
    }
    function opcao(pergunta, id) {
      return definicao.perguntas.find(item => item.id === pergunta).opcoes.find(item => item.id === id)?.titulo;
    }
    const { inicio, fim } = csaProgramacao.turnos[reserva.turno];
    const dados = {
      titulo: respostas.titulo,
      descricao: respostas['descricao-evento'],
      espaco_id: Number(reserva.espacoId),
      data_inicio: `${reserva.data}T${inicio}:00`,
      data_fim: `${reserva.data}T${fim}:00`,
      responsavel: respostas.responsavel,
      celular: respostas.telefone,
      email: respostas.email,
      entidade: respostas.instituicao,
      segmento: respostas.segmentos[0] === 'gestao-cultural' ? 'Gestão Cultural' : opcao('segmentos', respostas.segmentos[0]),
      pauta: opcao('pautas', respostas.pautas[0]),
      periodicidade: opcao('periodicidade', respostas.periodicidade),
      classificacao_indicativa: opcao('classificacao', respostas.classificacao),
      publico_estimado: respostas.publico,
      link_complementar: respostas['link-proposta']
    };
    const resposta = await csaApi.requisitar('/eventos/', { metodo: 'POST', dados, autenticado: false });
    if (Number.isSafeInteger(resposta?.id) && resposta.id > 0 && resposta.status === 'pendente') {
      return { enviada: true, status: 'pendente', id: resposta.id };
    }
    throw new Error('O servidor não confirmou o recebimento da solicitação.');
  }

  function avisar(texto) {
    const mensagem = document.getElementById(formulario ? 'csa-reservas-mensagem' : 'csa-confirmacao-estado');
    mensagem.textContent = texto;
    mensagem.hidden = false;
    mensagem.focus();
  }

  async function rascunho(metodo, valor) {
    let id = sessionStorage.getItem(chave);
    if (!id && metodo === 'get') return null;
    if (!id) {
      id = crypto.randomUUID();
      sessionStorage.setItem(chave, id);
    }
    const banco = await new Promise((resolve, reject) => {
      const pedido = indexedDB.open('csa-reservas', 1);
      pedido.onupgradeneeded = () => pedido.result.createObjectStore('rascunhos');
      pedido.onsuccess = () => resolve(pedido.result);
      pedido.onerror = () => reject(pedido.error);
      pedido.onblocked = () => reject(new Error('Armazenamento indisponível.'));
    });
    try {
      return await new Promise((resolve, reject) => {
        const transacao = banco.transaction('rascunhos', metodo === 'get' ? 'readonly' : 'readwrite');
        const loja = transacao.objectStore('rascunhos');
        const pedido = metodo === 'get' ? loja.get(id) : loja.put(valor, id);
        transacao.oncomplete = () => resolve(pedido.result);
        transacao.onabort = () => reject(transacao.error);
        transacao.onerror = () => reject(transacao.error);
      });
    } finally { banco.close(); }
  }

  if (formulario) {
    const horario = document.getElementById('csa-reservas-horario');
    if (reservaAtual) {
      horario.textContent = descreverReserva(reservaAtual);
      document.querySelector('.csa-reservas__voltar').href = `agenda-cliente.html?data=${reservaAtual.data}`;
    } else if (!demo) {
      horario.append('Para enviar uma solicitação, ', Object.assign(document.createElement('a'), {
        href: 'agenda-cliente.html', textContent: 'escolha um espaço e horário na agenda'
      }), '.');
    }
    horario.hidden = !horario.textContent;

    document.addEventListener('csa:reserva-preparada', async evento => {
      if (ocupado) return;
      ocupado = true;
      const botao = formulario.querySelector('[type="submit"]');
      botao.disabled = true;
      try {
        await rascunho('put', evento.detail);
        location.assign(pagina('confirmacao-reserva.html', reservaAtual));
      } catch {
        avisar('Não foi possível guardar o rascunho para revisão. Suas respostas continuam no formulário. Tente novamente.');
        botao.disabled = false;
        ocupado = false;
      }
    });

    (async () => {
      try {
        await csaReservas.pronto;
        const salvo = await rascunho('get');
        if (!salvo || salvo.envio || csaProgramacao.parametrosReserva(salvo.reserva) !== csaProgramacao.parametrosReserva(reservaAtual)) return;
        for (const campo of formulario.elements) {
          if (!campo.name) continue;
          const valor = salvo.dados.respostas[campo.name];
          if (campo.type === 'file') {
            const arquivo = salvo.arquivos[campo.name];
            if (arquivo) {
              const transferencia = new DataTransfer();
              transferencia.items.add(arquivo);
              campo.files = transferencia.files;
              campo.dispatchEvent(new Event('change', { bubbles: true }));
            }
          } else if (campo.type === 'checkbox' || campo.type === 'radio') {
            campo.checked = Array.isArray(valor) ? valor.includes(campo.value) : typeof valor === 'boolean' ? valor : valor === campo.value;
          } else if (valor !== undefined && valor !== null) campo.value = valor;
        }
      } catch {
        avisar('Não foi possível recuperar o rascunho completo. Volte à confirmação e tente novamente antes de preencher uma nova solicitação.');
      }
    })();
    return;
  }

  if (document.body.dataset.csaTipo !== 'reserva') return;
  (async () => {
    try {
      const salvo = await rascunho('get');
      if (!salvo) return;
      if (reservaAtual && csaProgramacao.parametrosReserva(salvo.reserva) !== csaProgramacao.parametrosReserva(reservaAtual)) return;
      const definicao = await csaDadosReservas.consultarFormulario(salvo.dados.formularioId, Boolean(salvo.reserva));
      const respostas = salvo.dados.respostas;
      function opcao(id) {
        const pergunta = definicao.perguntas.find(item => item.id === id);
        const valores = Array.isArray(respostas[id]) ? respostas[id] : [respostas[id]];
        return valores.map(valor => pergunta.opcoes.find(item => item.id === valor)?.titulo || valor).join(', ');
      }
      const arquivo = salvo.arquivos.proposta;
      const dados = {
        ...respostas,
        horarioReserva: salvo.reserva ? descreverReserva(salvo.reserva) : '',
        segmento: opcao('segmentos'), pauta: opcao('pautas'),
        classificacao: opcao('classificacao'), periodicidade: opcao('periodicidade'),
        arquivo: arquivo ? `${arquivo.name} · ${(arquivo.size / 1024 / 1024).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} MB · ${arquivo.type || 'application/pdf'}` : '',
        link: respostas['link-proposta']
      };
      if (salvo.envio) {
        window.csaConfirmacao.apresentar({ dados, ...salvo.envio });
        return;
      }
      window.csaConfirmacao.revisar({ dados }, {
        voltar: () => location.assign(pagina('reservas.html', salvo.reserva)),
        enviar: async () => {
          if (typeof window.csaEnviarReserva === 'function') return window.csaEnviarReserva(structuredClone(salvo));
          if (!salvo.reserva) {
            throw new Error('O envio ainda não está disponível para este rascunho. Escolha um espaço e horário na agenda.');
          }
          const envio = await enviarReserva(salvo, definicao);
          try {
            await rascunho('put', { ...salvo, envio });
          } catch {
            // A API já gravou a solicitação. Evita oferecer um reenvio em caso de falha local.
            sessionStorage.removeItem(chave);
          }
          return envio;
        }
      });
    } catch {
      avisar('Não foi possível recuperar suas informações. Retorne ao formulário para tentar novamente.');
    }
  })();
})();
