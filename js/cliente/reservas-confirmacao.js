(() => {
  'use strict';
  const demo = new URLSearchParams(location.search).get('demo') === '1'
    && (['localhost', '127.0.0.1', '[::1]'].includes(location.hostname) || location.protocol === 'file:');
  const formulario = document.getElementById('csa-reservas-form');
  const chave = demo ? 'csa-reserva-rascunho-demo' : 'csa-reserva-rascunho';
  let ocupado = false;

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
    document.addEventListener('csa:reserva-preparada', async evento => {
      if (ocupado) return;
      ocupado = true;
      const botao = formulario.querySelector('[type="submit"]');
      botao.disabled = true;
      try {
        await rascunho('put', evento.detail);
        location.assign('confirmacao-reserva.html' + (demo ? '?demo=1' : ''));
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
        if (!salvo) return;
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
      const definicao = await csaDadosReservas.consultarFormulario(salvo.dados.formularioId);
      const respostas = salvo.dados.respostas;
      function opcao(id) {
        const pergunta = definicao.perguntas.find(item => item.id === id);
        const valores = Array.isArray(respostas[id]) ? respostas[id] : [respostas[id]];
        return valores.map(valor => pergunta.opcoes.find(item => item.id === valor)?.titulo || valor).join(', ');
      }
      const arquivo = salvo.arquivos.proposta;
      const dados = {
        ...respostas,
        segmento: opcao('segmentos'), pauta: opcao('pautas'),
        classificacao: opcao('classificacao'), periodicidade: opcao('periodicidade'),
        arquivo: arquivo ? `${arquivo.name} · ${(arquivo.size / 1024 / 1024).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} MB · ${arquivo.type || 'application/pdf'}` : '',
        link: respostas['link-proposta']
      };
      window.csaConfirmacao.revisar({ dados }, {
        voltar: () => location.assign('reservas.html' + (demo ? '?demo=1' : '')),
        enviar: async () => {
          if (typeof window.csaEnviarReserva !== 'function') {
            throw new Error('Não foi possível enviar a solicitação. Suas informações foram preservadas; tente novamente mais tarde.');
          }
          return window.csaEnviarReserva(structuredClone(salvo));
        }
      });
    } catch {
      avisar('Não foi possível recuperar suas informações. Retorne ao formulário para tentar novamente.');
    }
  })();
})();
