// Controlador: usa os cards já existentes nos dois HTMLs.
// Não altera a agenda administrativa nem os formulários de outras tarefas.
const csaDetalhes = (() => {
  const tipo = document.body.dataset.csaTipo;
  if (!['reserva', 'visita'].includes(tipo)) return null;

  const parametros = new URLSearchParams(location.search);
  const grade = document.getElementById('csa-detalhes-grade');
  const mensagem = document.getElementById('csa-detalhes-mensagem');
  const porId = id => document.getElementById(`csa-detalhes-${id}`);
  const campos = {
    categoria: porId('categoria'), titulo: porId('titulo'),
    descricao: porId('descricao'), descricaoTitulo: porId('descricao-titulo'),
    espaco: porId('espaco'), classificacao: porId('classificacao'),
    data: porId('data'), horario: porId('horario'), turno: porId('turno'),
    orientacoes: porId('orientacoes'), regras: porId('regras')
  };
  const secoes = {
    descricao: porId('descricao-secao'), orientacoes: porId('orientacoes-secao'),
    regras: porId('regras-secao'), metadados: porId('metadados'),
    data: porId('data-container'), horario: porId('horario-container'),
    classificacao: porId('classificacao-container'), turno: porId('turno-container'),
    acoes: porId('acoes')
  };
  const continuar = porId('continuar');

  function preencher(no, valor) {
    no.textContent = valor || '';
  }

  function mostrarMensagem(texto, erro = false) {
    grade.hidden = true;
    grade.setAttribute('aria-busy', 'false');
    mensagem.textContent = texto;
    mensagem.hidden = !texto;
    mensagem.classList.toggle('csa-detalhes__mensagem--erro', erro);
  }

  function urlSegura(caminho) {
    if (typeof caminho !== 'string' || !caminho.trim()) return null;
    try {
      const url = new URL(caminho, location.href);
      if (['http:', 'https:'].includes(url.protocol) && url.origin === location.origin) return url.href;
    } catch { /* O botão continuará oculto. */ }
    return null;
  }

  function apresentar(entrada) {
    let dados;
    try {
      dados = csaDetalhesModelo.normalizarApresentacao(entrada);
    } catch {
      mostrarMensagem('Não foi possível apresentar as informações selecionadas.', true);
      return false;
    }

    preencher(campos.categoria, dados.categoria);
    preencher(campos.titulo, dados.titulo);
    preencher(campos.descricao, dados.descricao);
    preencher(campos.espaco, dados.espaco || 'Não informado');
    campos.descricaoTitulo.textContent = dados.descricaoTitulo || (dados.modalidade === 'evento'
      ? 'Sobre o evento' : dados.modalidade === 'espaco' ? 'Sobre o espaço' : 'Sobre a visita');
    secoes.descricao.hidden = !dados.descricao;

    secoes.data.hidden = !dados.data;
    preencher(campos.data, dados.data ? csaDetalhesModelo.formatarData(dados.data) : '');
    if (dados.data) campos.data.setAttribute('datetime', dados.data);
    else campos.data.removeAttribute('datetime');

    secoes.horario.hidden = !dados.horario;
    preencher(campos.horario, dados.horario ? csaDetalhesModelo.formatarHorario(dados.horario) : '');
    secoes.metadados.hidden = !(dados.data || dados.horario);

    secoes.classificacao.hidden = !dados.classificacao;
    preencher(campos.classificacao, dados.classificacao);
    secoes.turno.hidden = !dados.turno;
    preencher(campos.turno, dados.turno);

    secoes.orientacoes.hidden = !dados.orientacoes;
    preencher(campos.orientacoes, dados.orientacoes);

    // Somente itens de uma lista variável são criados no JS. Os cards são HTML fixo.
    campos.regras.replaceChildren();
    for (const regra of dados.regras) {
      const item = document.createElement('li');
      item.textContent = regra;
      campos.regras.append(item);
    }
    secoes.regras.hidden = dados.regras.length === 0;

    continuar.removeAttribute('href');
    const endereco = urlSegura(dados.urlContinuar);
    secoes.acoes.hidden = !endereco;
    if (endereco) continuar.href = endereco;

    mensagem.hidden = true;
    mensagem.textContent = '';
    grade.hidden = false;
    grade.setAttribute('aria-busy', 'false');
    document.title = `${dados.titulo} | Casa dos Saberes`;
    return true;
  }

  function configurarMenu() {
    const botao = document.querySelector('.csa-detalhes-menu__botao');
    const menu = document.getElementById('csa-detalhes-menu');
    function fechar() {
      menu.hidden = true;
      botao.setAttribute('aria-expanded', 'false');
      botao.setAttribute('aria-label', 'Abrir menu');
    }
    botao.addEventListener('click', () => {
      const aberto = !menu.hidden;
      menu.hidden = aberto;
      botao.setAttribute('aria-expanded', String(!aberto));
      botao.setAttribute('aria-label', aberto ? 'Abrir menu' : 'Fechar menu');
    });
    document.addEventListener('keydown', evento => {
      if (evento.key === 'Escape' && !menu.hidden) {
        fechar();
        botao.focus();
      }
    });
    document.addEventListener('click', evento => {
      if (!menu.contains(evento.target) && !botao.contains(evento.target)) fechar();
    });
  }

  async function carregar() {
    mostrarMensagem('Carregando informações…');
    grade.setAttribute('aria-busy', 'true');
    try {
      const formularioVisita = globalThis.csaConfig?.formularioVisitaUrl || '';
      if (parametros.get('demo') === '1') {
        const exemplo = csaDadosDetalhes.consultarExemplo(tipo);
        const dados = tipo === 'reserva'
          ? csaDetalhesModelo.prepararEvento(exemplo.evento, exemplo.espaco)
          : csaDetalhesModelo.prepararVisita(exemplo.visita, exemplo.espaco, formularioVisita);
        return apresentar(dados);
      }
      if (window.csaDetalhesEntrada) return apresentar(window.csaDetalhesEntrada);

      if (tipo === 'reserva') {
        const eventoId = parametros.get('eventoId') || parametros.get('id');
        if (eventoId) {
          const { evento, espaco } = await csaDadosDetalhes.consultarEvento(eventoId);
          return apresentar(csaDetalhesModelo.prepararEvento(evento, espaco));
        }
        if (parametros.has('espacoId')) {
          const espaco = await csaDadosDetalhes.consultarEspaco(parametros.get('espacoId'));
          return apresentar(csaDetalhesModelo.prepararEspaco(espaco, {
            data: parametros.get('data') || '', turno: parametros.get('turno') || ''
          }));
        }
      }
      if (tipo === 'visita' && parametros.has('espacoId')) {
        const espaco = await csaDadosDetalhes.consultarEspaco(parametros.get('espacoId'));
        return apresentar(csaDetalhesModelo.prepararVisita({}, espaco, formularioVisita));
      }
      mostrarMensagem('Selecione uma opção na agenda para visualizar as informações.');
      return false;
    } catch (erro) {
      console.error('[Detalhes] Falha ao carregar informações:', erro);
      mostrarMensagem('Não foi possível carregar as informações. Volte à agenda ou tente novamente.', true);
      return false;
    }
  }

  configurarMenu();
  const pronto = carregar();
  return Object.freeze({ apresentar, carregar, pronto });
})();
