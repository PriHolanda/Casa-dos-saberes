// Controlador da página. Não envia solicitações nem grava respostas nesta etapa.
const csaReservas = (() => {
  const formulario = document.getElementById('csa-reservas-form');
  const perguntas = document.getElementById('csa-reservas-perguntas');
  const mensagem = document.getElementById('csa-reservas-mensagem');
  const enviar = formulario.querySelector('[type="submit"]');
  // A mesma condição está no CSS: telefones/tablets de toque usam mobile também na horizontal.
  const visaoMobile = window.matchMedia('(max-width: 760px), (hover: none) and (pointer: coarse)');
  let definicao;
  let tentouEnviar = false;
  let errosExibidos = {};

  function atualizarApresentacao() {
    if (!definicao) return;
    definicao.perguntas.forEach(pergunta => {
      const base = csaPerguntaBase.id(pergunta);
      const bloco = document.getElementById(`${base}-erro`).closest('[data-pergunta-id]');
      const textos = csaReservasModelo.apresentacao(pergunta, visaoMobile.matches);
      bloco.querySelector('.csa-pergunta__titulo').textContent = textos.titulo;
      if (pergunta.tipo === 'aberta') document.getElementById(base).placeholder = textos.descricao;
      const descricao = document.getElementById(`${base}-descricao`);
      if (descricao) { descricao.textContent = textos.descricao; descricao.hidden = !textos.descricao; }
      if (pergunta.tipo === 'anexo') document.getElementById(base).setAttribute('aria-label', textos.titulo);
    });
  }
  visaoMobile.addEventListener('change', atualizarApresentacao);

  function avisar(texto, erro = false) {
    mensagem.textContent = texto;
    mensagem.hidden = !texto;
    mensagem.classList.toggle('csa-reservas__mensagem--erro', erro);
  }

  function coletarRespostas() {
    const dados = new FormData(formulario);
    return Object.fromEntries(definicao.perguntas.map(pergunta => {
      let valor;
      if (pergunta.tipo === 'anexo') {
        valor = document.getElementById(csaPerguntaBase.id(pergunta)).files[0] || null;
      } else if (pergunta.tipo === 'termo') valor = dados.has(pergunta.id);
      else if (pergunta.tipo === 'escolha' && pergunta.multipla) valor = dados.getAll(pergunta.id);
      else valor = dados.get(pergunta.id) ?? '';
      return [pergunta.id, valor];
    }));
  }

  function exibirErros(erros) {
    errosExibidos = erros;
    definicao.perguntas.forEach(pergunta => {
      const base = csaPerguntaBase.id(pergunta);
      const aviso = document.getElementById(`${base}-erro`);
      const bloco = aviso.closest('[data-pergunta-id]');
      aviso.textContent = erros[pergunta.id] || '';
      aviso.hidden = !erros[pergunta.id];
      bloco.classList.toggle('csa-pergunta--invalida', Boolean(erros[pergunta.id]));
      bloco.querySelectorAll('input, textarea').forEach(campo => {
        if (erros[pergunta.id]) campo.setAttribute('aria-invalid', 'true');
        else campo.removeAttribute('aria-invalid');
      });
    });
  }

  function atualizarAnexo(id) {
    const pergunta = definicao.perguntas.find(item => item.id === id);
    const campo = document.getElementById(csaPerguntaBase.id(pergunta));
    const bloco = campo.closest('[data-pergunta-id]');
    const arquivo = campo.files[0];
    const resumo = bloco.querySelector('.csa-pergunta__arquivo');
    resumo.hidden = !arquivo;
    bloco.querySelector('.csa-pergunta__arquivo-nome').textContent = arquivo ? `${arquivo.name} · ${(arquivo.size / 1024 / 1024).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} MB` : '';
    const erros = { ...errosExibidos };
    const erro = arquivo ? csaReservasModelo.validarResposta(pergunta, arquivo) : '';
    if (erro) erros[id] = erro;
    else delete erros[id];
    exibirErros(erros);
  }

  async function carregar() {
    try {
      definicao = csaReservasModelo.prepararDefinicao(await csaDadosReservas.consultarFormulario('reservas'));
      perguntas.innerHTML = ['principal', 'complementar'].map(coluna => `<div class="csa-reservas__coluna csa-reservas__coluna--${coluna}">
        ${definicao.perguntas.filter(pergunta => pergunta.coluna === coluna).sort((a, b) => a.ordem - b.ordem)
          .map(pergunta => csaPerguntasReserva.renderizar(pergunta)).join('')}
      </div>`).join('');
      atualizarApresentacao();
      enviar.disabled = false;
    } catch {
      avisar('Não foi possível carregar o formulário. Atualize a página para tentar novamente.', true);
    } finally { perguntas.setAttribute('aria-busy', 'false'); }
  }

  formulario.addEventListener('submit', evento => {
    evento.preventDefault();
    if (!definicao) return;
    tentouEnviar = true;
    const respostas = coletarRespostas();
    const erros = csaReservasModelo.validar(definicao, respostas);
    exibirErros(erros);
    if (Object.keys(erros).length) {
      avisar('Revise as perguntas indicadas para continuar.', true);
      formulario.querySelector('[aria-invalid="true"]').focus();
      return;
    }
    const detalhe = csaReservasModelo.prepararEnvio(definicao, respostas);
    document.dispatchEvent(new CustomEvent('csa:reserva-preparada', { detail: detalhe }));
    avisar('Suas respostas foram validadas. O envio estará disponível em breve; nenhuma solicitação foi enviada.');
    mensagem.focus();
  });

  formulario.addEventListener('input', evento => {
    if (!definicao || !evento.target.closest('[data-pergunta-id]')) return;
    avisar('');
    if (tentouEnviar) exibirErros(csaReservasModelo.validar(definicao, coletarRespostas()));
  });

  formulario.addEventListener('change', evento => {
    if (!definicao || evento.target.type !== 'file') return;
    atualizarAnexo(evento.target.name);
    if (tentouEnviar) exibirErros(csaReservasModelo.validar(definicao, coletarRespostas()));
  });

  formulario.addEventListener('click', evento => {
    const botao = evento.target.closest('[data-remover-anexo]');
    if (!botao || !definicao) return;
    const pergunta = definicao.perguntas.find(item => item.id === botao.dataset.removerAnexo);
    const campo = document.getElementById(csaPerguntaBase.id(pergunta));
    campo.value = '';
    atualizarAnexo(pergunta.id);
    avisar('');
    if (tentouEnviar) exibirErros(csaReservasModelo.validar(definicao, coletarRespostas()));
    campo.focus();
  });

  const botaoMenu = document.querySelector('.csa-reservas-menu__botao');
  const menu = document.getElementById('csa-reservas-menu');
  function fecharMenu() {
    menu.hidden = true;
    botaoMenu.setAttribute('aria-expanded', 'false');
    botaoMenu.setAttribute('aria-label', 'Abrir menu');
  }
  botaoMenu.addEventListener('click', () => {
    menu.hidden = !menu.hidden;
    botaoMenu.setAttribute('aria-expanded', String(!menu.hidden));
    botaoMenu.setAttribute('aria-label', menu.hidden ? 'Abrir menu' : 'Fechar menu');
  });
  document.addEventListener('keydown', evento => {
    if (evento.key === 'Escape' && !menu.hidden) { fecharMenu(); botaoMenu.focus(); }
  });
  document.addEventListener('click', evento => {
    if (!menu.contains(evento.target) && !botaoMenu.contains(evento.target)) fecharMenu();
  });

  const pronto = carregar();
  return { pronto };
})();
