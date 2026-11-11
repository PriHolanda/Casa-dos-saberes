
// Controlador das páginas de informações de eventos e visitas.
// Os cards são definidos no HTML e preenchidos com os dados consultados.
//
// INTEGRAÇÃO COM A AGENDA PÚBLICA:
// - Sobre o evento: detalhes-reserva.html?eventoId=ID
// - Espaço livre: a agenda encaminha diretamente para reservas.html
// - Visitas: detalhes-visita.html?espacoId=ID
//
// O parâmetro ?demo=1 é destinado aos testes das interfaces.
// As páginas de detalhes não encaminham para formulários.

const csaDetalhes = (() => {
  const tipo = document.body.dataset.csaTipo;

  if (!['reserva', 'visita'].includes(tipo)) return null;

  const parametros = new URLSearchParams(location.search);

  const grade = document.getElementById('csa-detalhes-grade');
  const mensagem = document.getElementById('csa-detalhes-mensagem');

  const porId = id => document.getElementById(`csa-detalhes-${id}`);

  const campos = {
    categoria: porId('categoria'),
    titulo: porId('titulo'),
    descricao: porId('descricao'),
    descricaoTitulo: porId('descricao-titulo'),
    espaco: porId('espaco'),
    classificacao: porId('classificacao'),
    data: porId('data'),
    horario: porId('horario'),
    orientacoes: porId('orientacoes'),
    regras: porId('regras')
  };

  const secoes = {
    descricao: porId('descricao-secao'),
    orientacoes: porId('orientacoes-secao'),
    regras: porId('regras-secao'),
    metadados: porId('metadados'),
    data: porId('data-container'),
    horario: porId('horario-container'),
    classificacao: porId('classificacao-container')
  };

  function preencher(no, valor) {
    no.textContent = valor || '';
  }

  function mostrarMensagem(texto, erro = false) {
    grade.hidden = true;
    grade.setAttribute('aria-busy', 'false');

    mensagem.textContent = texto;
    mensagem.hidden = !texto;

    mensagem.classList.toggle(
      'csa-detalhes__mensagem--erro',
      erro
    );
  }

  function apresentar(entrada) {
    let dados;

    try {
      dados = csaDetalhesModelo.normalizarApresentacao(entrada);
    } catch {
      mostrarMensagem(
        'Não foi possível apresentar as informações selecionadas.',
        true
      );
      return false;
    }

    preencher(campos.categoria, dados.categoria);
    preencher(campos.titulo, dados.titulo);
    preencher(campos.descricao, dados.descricao);
    preencher(campos.espaco, dados.espaco || 'Não informado');

    campos.descricaoTitulo.textContent =
      dados.descricaoTitulo ||
      (dados.modalidade === 'evento'
        ? 'Sobre o evento'
        : 'Sobre a visita');

    secoes.descricao.hidden = !dados.descricao;

    // Informações de data.
    secoes.data.hidden = !dados.data;

    preencher(
      campos.data,
      dados.data
        ? csaDetalhesModelo.formatarData(dados.data)
        : ''
    );

    if (dados.data) {
      campos.data.setAttribute('datetime', dados.data);
    } else {
      campos.data.removeAttribute('datetime');
    }

    // Informações de horário.
    secoes.horario.hidden = !dados.horario;

    preencher(
      campos.horario,
      dados.horario
        ? csaDetalhesModelo.formatarHorario(dados.horario)
        : ''
    );

    secoes.metadados.hidden = !(dados.data || dados.horario);

    // Informações complementares.
    secoes.classificacao.hidden = !dados.classificacao;
    preencher(campos.classificacao, dados.classificacao);

    secoes.orientacoes.hidden = !dados.orientacoes;
    preencher(campos.orientacoes, dados.orientacoes);

    // Somente os itens da lista de regras são criados dinamicamente.
    // A estrutura principal dos cards permanece definida no HTML.
    campos.regras.replaceChildren();

    for (const regra of dados.regras) {
      const item = document.createElement('li');
      item.textContent = regra;
      campos.regras.append(item);
    }

    secoes.regras.hidden = dados.regras.length === 0;

    // Apresenta os cards após o preenchimento.
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
      botao.setAttribute(
        'aria-label',
        aberto ? 'Abrir menu' : 'Fechar menu'
      );
    });

    document.addEventListener('keydown', evento => {
      if (evento.key === 'Escape' && !menu.hidden) {
        fechar();
        botao.focus();
      }
    });

    document.addEventListener('click', evento => {
      if (
        !menu.contains(evento.target) &&
        !botao.contains(evento.target)
      ) {
        fechar();
      }
    });
  }

  async function carregar() {
    mostrarMensagem('Carregando informações…');
    grade.setAttribute('aria-busy', 'true');

    try {
      // Modo demonstrativo: permite testar as páginas sem backend.
      if (parametros.get('demo') === '1') {
        const exemplo = csaDadosDetalhes.consultarExemplo(tipo);

        const dados = tipo === 'reserva'
          ? csaDetalhesModelo.prepararEvento(
              exemplo.evento,
              exemplo.espaco
            )
          : csaDetalhesModelo.prepararVisita(
              exemplo.visita,
              exemplo.espaco
            );

        return apresentar(dados);
      }

      // Permite receber dados preparados pela integração externa.
      if (window.csaDetalhesEntrada) {
        return apresentar(window.csaDetalhesEntrada);
      }

      // EVENTOS:
      // A agenda pública envia o ID do evento cadastrado.
      // Não há tratamento de espaço livre nesta página.
      if (tipo === 'reserva') {
        const eventoId =
          parametros.get('eventoId') || parametros.get('id');

        if (eventoId) {
          const { evento, espaco } =
            await csaDadosDetalhes.consultarEvento(eventoId);

          return apresentar(
            csaDetalhesModelo.prepararEvento(evento, espaco)
          );
        }
      }

      // VISITAS:
      // Mantém a consulta ao catálogo de espaços relacionados.
      // Esse fluxo é independente da reserva de espaços livres.
      if (tipo === 'visita' && parametros.has('espacoId')) {
        const espaco = await csaDadosDetalhes.consultarEspaco(
          parametros.get('espacoId')
        );

        return apresentar(
          csaDetalhesModelo.prepararVisita({}, espaco)
        );
      }

      mostrarMensagem(
        'Selecione uma opção na agenda para visualizar as informações.'
      );

      return false;
    } catch (erro) {
      console.error(
        '[Detalhes] Falha ao carregar informações:',
        erro
      );

      mostrarMensagem(
        'Não foi possível carregar as informações. Volte à agenda ou tente novamente.',
        true
      );

      return false;
    }
  }

  configurarMenu();

  const pronto = carregar();

  return Object.freeze({
    apresentar,
    carregar,
    pronto
  });
})();
