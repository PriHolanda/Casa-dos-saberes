(() => {
  const parametros = new URLSearchParams(location.search);
  const demonstracao = parametros.get('demo') === '1' && ['localhost', '127.0.0.1', '[::1]', ''].includes(location.hostname);
  const mobile = matchMedia('(max-width: 760px), (pointer: coarse)');
  const dataCompleta = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
  const diaSemana = new Intl.DateTimeFormat('pt-BR', { weekday: 'short' });
  const diaMes = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' });
  const botoesVisao = document.querySelectorAll('[data-visao]');
  const filtro = document.getElementById('csa-visitas-filtro');
  const periodo = document.getElementById('csa-visitas-periodo');
  const grade = document.getElementById('csa-visitas-grade');
  const mensagem = document.getElementById('csa-visitas-mensagem');
  const dialogo = document.getElementById('csa-visita-detalhe');
  const titulo = document.getElementById('csa-visita-detalhe-titulo');
  const quadros = document.getElementById('csa-visita-detalhe-dados');
  const aviso = document.getElementById('csa-visita-detalhe-aviso');
  const acoes = dialogo.querySelectorAll('[data-acao]');
  const turnos = ['Manhã', 'Tarde'];
  let data = demonstracao ? new Date(2026, 8, 21) : new Date();
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
    return Array.from({ length: 6 }, (_, indice) => somarDias(segunda, indice));
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
          data_inicio: `2026-09-${dia}T08:00:00`,
          data_fim: `2026-09-${dia}T09:00:00`
        });
      });
    }
    return itens;
  }

  function visitasDoTurno(dia, turno) {
    const chave = dataISO(dia);
    return visitas.filter(visita => {
      const inicio = visita.data_inicio;
      const visitaTurno = visita.turno ?? Number(hora(inicio) >= '12:00');
      return inicio?.slice(0, 10) === chave && turno === visitaTurno && (filtro.value === 'todos' || visita.status === filtro.value);
    });
  }

  function cartao(visita) {
    const pendente = visita.status === 'pendente';
    const botao = elemento('button', 'csa-visitas-card');
    botao.type = 'button';
    botao.dataset.visitaId = visita.id;
    const status = elemento('span', `csa-visitas-card__status${pendente ? ' csa-visitas-card__status--pendente' : ''}`);
    const indicador = elemento('span', `csa-visitas-indicador${pendente ? ' csa-visitas-indicador--pendente' : ''}`);
    indicador.setAttribute('aria-hidden', 'true');
    status.append(indicador, pendente ? 'Pendente' : 'Aceito');
    const horario = elemento('time', '', `${hora(visita.data_inicio)} - ${hora(visita.data_fim)}`);
    horario.dateTime = visita.data_inicio;
    botao.append(elemento('span', 'csa-visitas-card__categoria', 'Visita Mediada'), elemento('strong', '', visita.instituicao || visita.nome_responsavel), horario, status);
    botao.addEventListener('click', () => abrirDetalhe(visita, botao));
    return botao;
  }

  function renderizarDiaria(dia) {
    const lista = elemento('div', 'csa-visitas-turnos');
    turnos.forEach((turno, indice) => {
      const detalhes = elemento('details');
      detalhes.open = true;
      detalhes.append(elemento('summary', '', turno));
      const itens = visitasDoTurno(dia, indice);
      detalhes.append(...(itens.length ? itens.map(cartao) : [elemento('p', 'csa-visitas-vazio', 'Sem visitas neste turno.') ]));
      lista.append(detalhes);
    });
    return lista;
  }

  function renderizarSemanal(dias) {
    const secao = elemento('div', 'csa-visitas-semana');
    secao.tabIndex = 0;
    secao.setAttribute('role', 'region');
    secao.setAttribute('aria-label', 'Visitas da semana');
    const tabela = elemento('table');
    const cabecalho = tabela.createTHead().insertRow();
    cabecalho.append(elemento('th'));
    dias.forEach(dia => {
      const coluna = elemento('th');
      coluna.scope = 'col';
      const nomeDia = diaSemana.format(dia).replace('.', '');
      coluna.append(nomeDia[0].toUpperCase() + nomeDia.slice(1), elemento('span', '', diaMes.format(dia)));
      cabecalho.append(coluna);
    });
    const corpo = tabela.createTBody();
    turnos.forEach((turno, indice) => {
      const linha = corpo.insertRow();
      const rotulo = elemento('th', '', turno);
      rotulo.scope = 'row';
      linha.append(rotulo);
      dias.forEach(dia => linha.insertCell().append(...visitasDoTurno(dia, indice).map(cartao)));
    });
    secao.append(tabela);
    return secao;
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
    grade.replaceChildren(visao === 'diaria' ? renderizarDiaria(inicio) : renderizarSemanal(dias));
    grade.hidden = false;
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
    const pendente = visita.status === 'pendente';
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
    acoes.forEach(botaoAcao => { botaoAcao.hidden = pendente === (botaoAcao.dataset.acao === 'cancelar'); });
    aviso.hidden = true;
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
  document.getElementById('csa-visitas-exportar').addEventListener('click', () => window.print());
  dialogo.querySelector('.csa-visita-detalhe__fechar').addEventListener('click', () => dialogo.close());
  dialogo.addEventListener('close', () => {
    const novoGatilho = [...grade.querySelectorAll('[data-visita-id]')].find(botao => botao.dataset.visitaId === String(ativa.id));
    (gatilho.isConnected ? gatilho : novoGatilho || botoesVisao[visao === 'diaria' ? 0 : 1]).focus();
  });
  acoes.forEach(botao => botao.addEventListener('click', () => {
    if (!demonstracao) {
      aviso.textContent = 'A alteração de status de visitas ainda não está disponível no servidor.';
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
      visitas = dados.slice().sort((a, b) => String(a.data_inicio).localeCompare(String(b.data_inicio)));
      mensagem.hidden = true;
      atualizar();
    } catch (erro) {
      mensagem.textContent = erro.message;
    }
  }
  carregar();
})();
