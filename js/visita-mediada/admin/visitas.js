(() => {
  const parametros = new URLSearchParams(location.search);
  const demonstracao = csaVisitasModelo.demonstracao;
  const mobile = matchMedia('(max-width: 768px)');
  const dataCompleta = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
  const diaSemana = new Intl.DateTimeFormat('pt-BR', { weekday: 'short' });
  const diaMes = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' });
  const botoesVisao = document.querySelectorAll('[data-visao]');
  const filtro = document.getElementById('csa-visitas-filtro');
  const periodo = document.getElementById('csa-visitas-periodo');
  const grade = document.getElementById('csa-agenda');
  const mensagem = document.getElementById('csa-visitas-mensagem');
  const dialogo = document.getElementById('csa-visita-detalhe');
  const titulo = document.getElementById('csa-visita-detalhe-titulo');
  const quadros = document.getElementById('csa-visita-detalhe-dados');
  const aviso = document.getElementById('csa-visita-detalhe-aviso');
  const acoes = dialogo.querySelectorAll('[data-acao]');
  const turnos = ['Manhã', 'Tarde'];
  const hoje = new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Fortaleza', dateStyle: 'short' }).format(new Date());
  const solicitada = parametros.get('dia');
  const diaInicial = csaVisitasModelo.dataCivil(`${solicitada}T12:00:00`) ? solicitada : demonstracao ? '2026-09-21' : hoje;
  let data = new Date(`${diaInicial}T12:00:00`);
  let visao = mobile.matches ? 'diaria' : 'semanal';
  let visaoEscolhida = false;
  let visitas;
  let ativa;
  let gatilho;

  function elemento(tag, classe, texto) {
    const el = document.createElement(tag);
    if (classe) el.className = classe;
    if (texto) el.textContent = texto;
    return el;
  }

  function somarDias(base, quantidade) {
    const dia = new Date(base);
    dia.setDate(dia.getDate() + quantidade);
    return dia;
  }

  function diasDoPeriodo() {
    if (visao === 'diaria') return [data];
    const segunda = somarDias(data, -((data.getDay() + 6) % 7));
    return Array.from({ length: 7 }, (_, indice) => somarDias(segunda, indice));
  }

  function dataISO(dia) {
    return `${dia.getFullYear()}-${String(dia.getMonth() + 1).padStart(2, '0')}-${String(dia.getDate()).padStart(2, '0')}`;
  }

  function hora(iso) {
    return typeof iso === 'string' ? iso.slice(11, 16) : '';
  }

  function dadosDemonstrativos() {
    const base = {
      status: 'aprovada', nome_responsavel: 'Rafael Santos Silva', telefone: '85 99162-6347',
      email: 'rafaelsantossilva1203@gmail.com', instituicao: 'Universidade Federal do Ceará',
      formacao: 'Mestrado em Ciências da Computação', disciplina: 'PAA',
      endereco: 'Rua da balada, 129, Centro, Quixadá', natureza: 'Federal', escolaridade: 'Ensino superior',
      curso: 'Sistemas de Informação, Terceiro semestre', local: 'Sala expositiva - Exposição X',
      quantidade_pessoas: 15, faixa_etaria: '18 a 22 Anos', grupo: 'Adultos',
      acessibilidade: 'Pessoa com deficiência visual e baixa visão', quantidade_pcd: '1 Pessoa',
      trabalho: 'Não', primeira_visita: 'Sim', objetivo: 'Conhecer', preparacao: 'Não'
    };
    const itens = [];
    for (let dia = 21; dia <= 26; dia++) {
      [0, 0, 0, 1, 1, 1].slice(dia === 26 ? 3 : 0, dia === 21 ? 5 : 6).forEach((turno, indice) => {
        itens.push({
          ...base,
          id: itens.length + 1,
          status: dia === 22 && indice === 0 ? 'pendente' : base.status,
          turno,
          data_inicio: `2026-09-${dia}T${turno ? '14' : '08'}:00:00`,
          data_fim: `2026-09-${dia}T${turno ? '15' : '09'}:00:00`
        });
      });
    }
    return itens;
  }

  function visitasDoTurno(dia, turno) {
    const chave = dataISO(dia);
    return visitas.filter(visita => {
      const inicio = visita.data_inicio;
      const comeco = `${chave}T${turno === 0 ? '00' : '12'}:00:00`;
      const fim = `${chave}T${turno === 0 ? '12' : '23'}:${turno === 0 ? '00:00' : '59:59'}`;
      const estado = csaVisitasModelo.status(visita.status).valor;
      return inicio < fim && visita.data_fim > comeco && (filtro.value === 'todos' || estado === (filtro.value === 'aprovada' ? 'aceito' : filtro.value));
    });
  }

  function cartao(visita) {
    const estado = csaVisitasModelo.status(visita.status);
    const pendente = estado.valor === 'pendente';
    const botao = elemento('button', 'csa-visitas-card csa-event-card');
    botao.type = 'button';
    botao.dataset.visitaId = visita.id;
    const status = elemento('span', `csa-visitas-card__status csa-event-card__status--${estado.valor}${pendente ? ' csa-visitas-card__status--pendente' : ''}`);
    const indicador = elemento('span', `csa-visitas-indicador csa-visitas-indicador--${estado.valor}`);
    indicador.setAttribute('aria-hidden', 'true');
    status.append(indicador, estado.rotulo);
    const horario = elemento('time', '', `${hora(visita.data_inicio)} às ${hora(visita.data_fim)}`);
    horario.dateTime = visita.data_inicio;
    botao.append(elemento('span', 'csa-visitas-card__categoria', 'Visita Mediada'), elemento('strong', '', visita.instituicao || visita.nome_responsavel || 'Responsável não informado'), horario, status);
    return botao;
  }

  function renderizarAgenda(dias) {
    const tabela = elemento('table', `csa-grid${visao === 'diaria' ? ' csa-grid--diaria' : ''}`);
    tabela.append(elemento('caption', 'csa-grid__caption', `Agenda ${visao === 'diaria' ? 'diária' : 'semanal'} de visitas por dia e turno`));
    const cabecalho = tabela.createTHead().insertRow();
    const turno = elemento('th');
    turno.scope = 'col';
    turno.append(elemento('span', 'csa-grid__caption', 'Turno'));
    cabecalho.append(turno);
    dias.forEach(dia => {
      const coluna = elemento('th');
      coluna.scope = 'col';
      const nomeDia = diaSemana.format(dia).replace('.', '');
      coluna.append(elemento('strong', '', nomeDia[0].toUpperCase() + nomeDia.slice(1)), elemento('span', '', diaMes.format(dia)));
      cabecalho.append(coluna);
    });
    const corpo = tabela.createTBody();
    turnos.forEach((turno, indice) => {
      const linha = corpo.insertRow();
      linha.dataset.turno = indice === 0 ? 'manha' : 'tarde';
      const rotulo = elemento('th', '', turno);
      rotulo.scope = 'row';
      linha.append(rotulo);
      dias.forEach(dia => {
        const celula = linha.insertCell();
        celula.className = 'csa-grid__celula';
        const conteudo = elemento('div', 'csa-grid__conteudo');
        conteudo.dataset.turno = linha.dataset.turno;
        const referencia = elemento('span');
        referencia.dataset.data = dataISO(dia);
        referencia.hidden = true;
        const itens = visitasDoTurno(dia, indice);
        conteudo.append(...itens.map(cartao), referencia);
        if (visao === 'diaria' && !itens.length) conteudo.prepend(elemento('p', 'csa-vazio-turno', 'Nenhum registro neste turno.'));
        celula.append(conteudo);
      });
    });
    return tabela;
  }

  function atualizar() {
    const dias = diasDoPeriodo();
    const inicio = dias[0];
    const fim = dias[dias.length - 1];
    const formato = dataCompleta.format(fim).replace(/ de (\p{L})/u, (_, letra) => ` de ${letra.toUpperCase()}`);
    periodo.textContent = visao === 'diaria' ? formato : `${inicio.getMonth() === fim.getMonth() ? inicio.getDate() : diaMes.format(inicio)} a ${formato}`;
    botoesVisao.forEach(botao => botao.setAttribute('aria-pressed', String(botao.dataset.visao === visao)));
    document.getElementById('csa-visitas-filtro-texto').textContent = filtro.selectedOptions[0].textContent;
    if (!visitas) return;
    grade.replaceChildren(renderizarAgenda(dias));
    document.getElementById('csa-visitas-grade').hidden = false;
  }

  function quadro(nome, grupos) {
    const secao = elemento('section', 'csa-visita-detalhe__quadro');
    secao.append(elemento('h3', '', nome));
    const colunas = elemento('div', 'csa-visita-detalhe__colunas');
    grupos.forEach(grupo => {
      const lista = elemento('dl');
      grupo.forEach(([rotulo, valor]) => {
        if (valor === undefined || valor === null || valor === '') return;
        const par = elemento('div');
        par.append(elemento('dt', '', rotulo), elemento('dd', '', String(valor)));
        lista.append(par);
      });
      if (lista.childElementCount) colunas.append(lista);
    });
    if (colunas.childElementCount) secao.append(colunas);
    else secao.append(elemento('p', 'csa-visitas-vazio', 'Sem dados informados.'));
    return secao;
  }

  function abrirDetalhe(visita, botao) {
    ativa = visita;
    gatilho = botao;
    const estado = csaVisitasModelo.status(visita.status);
    const pendente = estado.valor === 'pendente';
    titulo.textContent = pendente ? 'Solicitação de visita mediada' : 'Detalhes da Visita Mediada';
    quadros.replaceChildren(
      quadro('Dados do responsável', [[
        ['Responsável pela visita', visita.nome_responsavel], ['Telefone', visita.telefone], ['E-mail', visita.email],
        ['Formação do responsável', visita.formacao], ['Disciplina que ministra', visita.disciplina]
      ]]),
      quadro('Sobre a instituição', [[
        ['Nome da instituição', visita.instituicao], ['Endereço da instituição', visita.endereco],
        ['Natureza da instituição', visita.natureza], ['Grau de escolaridade', visita.escolaridade], ['Curso e semestre', visita.curso]
      ]]),
      quadro('Sobre a visita', [
        [['Local solicitado', visita.local], ['Quantidade de pessoas', visita.quantidade_pessoas && `${visita.quantidade_pessoas} ${visita.quantidade_pessoas === 1 ? 'Pessoa' : 'Pessoas'}`],
          ['Faixa etária', visita.faixa_etaria], ['Grupo composto em sua maioria por:', visita.grupo]],
        [['Pessoas com deficiência?', visita.acessibilidade], ['Número de pessoas com deficiência', visita.quantidade_pcd],
          ['O grupo trabalhou ou pretende trabalhar alguma questão referente a exposição em sala de aula?', visita.trabalho]],
        [['Primeira vez visitando a Casa de Saberes Cego Aderaldo?', visita.primeira_visita], ['Objetivo da visita', visita.objetivo],
          ['Foi realizada alguma atividade de preparação para a visitação do equipamento?', visita.preparacao], ['Observações', visita.observacoes]]
      ])
    );
    acoes.forEach(botaoAcao => {
      botaoAcao.hidden = botaoAcao.dataset.acao === 'cancelar' ? estado.valor !== 'aceito' : !pendente;
      botaoAcao.disabled = !demonstracao;
    });
    aviso.textContent = demonstracao ? '' : 'A alteração desta solicitação não está disponível no momento.';
    aviso.hidden = !aviso.textContent;
    dialogo.showModal();
    dialogo.scrollTop = 0;
  }

  botoesVisao.forEach(botao => botao.addEventListener('click', () => {
    visaoEscolhida = true;
    visao = botao.dataset.visao;
    atualizar();
  }));
  mobile.addEventListener('change', () => {
    if (visaoEscolhida) return;
    visao = mobile.matches ? 'diaria' : 'semanal';
    atualizar();
  });
  document.querySelectorAll('[data-direcao]').forEach(botao => botao.addEventListener('click', () => {
    data = somarDias(data, Number(botao.dataset.direcao) * (visao === 'diaria' ? 1 : 7));
    atualizar();
  }));
  filtro.addEventListener('change', atualizar);
  grade.addEventListener('click', evento => {
    const botao = evento.target.closest('[data-visita-id]');
    if (botao) {
      const visita = visitas.find(item => item.id === botao.dataset.visitaId);
      if (visita) abrirDetalhe(visita, botao);
    }
  });
  document.getElementById('csa-visitas-exportar').addEventListener('click', () => window.print());
  dialogo.querySelector('.csa-visita-detalhe__fechar').addEventListener('click', () => dialogo.close());
  dialogo.addEventListener('close', () => {
    const novoGatilho = [...grade.querySelectorAll('[data-visita-id]')].find(botao => botao.dataset.visitaId === String(ativa.id) && botao.getClientRects().length);
    (gatilho.isConnected ? gatilho : novoGatilho || botoesVisao[visao === 'diaria' ? 0 : 1]).focus();
  });
  acoes.forEach(botao => botao.addEventListener('click', () => {
    if (!demonstracao) {
      aviso.textContent = 'Não foi possível alterar a solicitação. Tente novamente mais tarde.';
      aviso.hidden = false;
      return;
    }
    if (botao.dataset.acao === 'aprovar') ativa.status = 'aprovada';
    else visitas = visitas.filter(visita => visita !== ativa);
    atualizar();
    dialogo.close();
  }));

  async function carregar() {
    atualizar();
    try {
      const dados = demonstracao ? dadosDemonstrativos() : (await csaApi.requisitar('/visitas/'))?.visitas;
      if (!Array.isArray(dados)) throw new Error('Não foi possível carregar as visitas.');
      visitas = dados.map(csaVisitasModelo.normalizarVisita).sort((a, b) => a.data_inicio.localeCompare(b.data_inicio));
      if (new Set(visitas.map(visita => visita.id)).size !== visitas.length) throw new Error('A resposta contém visitas duplicadas.');
      mensagem.textContent = visitas.length ? '' : 'Nenhuma visita cadastrada.';
      mensagem.hidden = !mensagem.textContent;
      atualizar();
      const selecionada = visitas.find(visita => visita.id === parametros.get('visitaId'));
      const botao = selecionada && [...grade.querySelectorAll('[data-visita-id]')].find(item => item.dataset.visitaId === selecionada.id);
      if (botao) abrirDetalhe(selecionada, botao);
    } catch (erro) {
      mensagem.textContent = erro.message;
      mensagem.hidden = false;
    }
  }
  carregar();
})();
