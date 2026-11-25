(() => {
  const parametros = new URLSearchParams(location.search);
  const demo = parametros.get('demo') === '1' && ['localhost', '127.0.0.1', '[::1]', ''].includes(location.hostname);
  const chave = demo ? 'csa-visita-rascunho-demo' : 'csa-visita-rascunho';
  const pagina = document.body.dataset.visitaPagina;
  const turnos = [
    { nome: 'Manhã', faixa: '8:00 as 12:00', horas: ['08:00', '09:20', '10:40'] },
    { nome: 'Tarde', faixa: '14:00 as 18:00', horas: ['14:00', '15:20', '16:40'] }
  ];
  const horas = turnos.flatMap(turno => turno.horas);
  const hoje = new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Fortaleza', dateStyle: 'short' }).format(new Date());
  const pedido = parametros.get('dia');
  const hora = parametros.get('hora');
  const horario = horas.includes(hora) ? hora : '';
  let dia = dataValida(pedido) ? pedido : demo ? '2026-09-21' : hoje;

  function dataValida(valor) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(valor ?? '')) return false;
    const data = new Date(`${valor}T12:00:00Z`);
    return Number.isFinite(data.getTime()) && data.toISOString().slice(0, 10) === valor;
  }

  function link(nome, extras = {}) {
    const busca = new URLSearchParams({ dia, ...extras });
    if (demo) busca.set('demo', '1');
    return `${nome}?${busca}`;
  }

  function elemento(tag, classe, texto) {
    const el = document.createElement(tag);
    if (classe) el.className = classe;
    if (texto) el.textContent = texto;
    return el;
  }

  function atualizarRetornos() {
    document.querySelectorAll('[data-visita-retorno]').forEach(a => { a.href = link('visitas.html'); });
  }

  function rascunho() {
    try { return JSON.parse(sessionStorage.getItem(chave)); } catch { return null; }
  }

  function guardar(valor) { sessionStorage.setItem(chave, JSON.stringify(valor)); }
  function limpar() { sessionStorage.removeItem(chave); }

  async function mostrarAgenda() {
    const lista = document.getElementById('csa-vp-exposicoes');
    const calendario = document.getElementById('csa-vp-dia');
    const periodo = document.getElementById('csa-vp-data-texto');
    const avancar = document.getElementById('csa-vp-agendar');
    function atualizar() {
      const formato = new Intl.DateTimeFormat('pt-BR', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
      const data = formato.format(new Date(`${dia}T12:00:00Z`)).replace('.', '').replace(/ de (\p{L})/u, (_, letra) => ` de ${letra.toUpperCase()}`);
      calendario.value = dia;
      periodo.dateTime = dia;
      periodo.textContent = data[0].toUpperCase() + data.slice(1);
      avancar.href = link('horarios-visita.html');
      atualizarRetornos();
    }
    document.getElementById('csa-vp-escolher-dia').addEventListener('click', () => {
      if (typeof calendario.showPicker === 'function') calendario.showPicker();
      else calendario.focus();
    });
    calendario.addEventListener('change', () => {
      if (!dataValida(calendario.value)) return;
      dia = calendario.value;
      atualizar();
    });
    document.querySelectorAll('[data-vp-dia]').forEach(botao => botao.addEventListener('click', () => {
      const data = new Date(`${dia}T12:00:00Z`);
      data.setUTCDate(data.getUTCDate() + Number(botao.dataset.vpDia));
      dia = data.toISOString().slice(0, 10);
      atualizar();
    }));
    atualizar();
    const desktop = matchMedia('(min-width: 761px) and (not (pointer: coarse))');
    function carregarLibras() {
      if (!desktop.matches || document.getElementById('csa-vp-plugin-libras')) return;
      const script = document.createElement('script');
      script.id = 'csa-vp-plugin-libras';
      script.src = 'https://vlibras.gov.br/app/vlibras-plugin.js';
      script.onload = () => {
        if (window.VLibras?.Widget) new window.VLibras.Widget('https://vlibras.gov.br/app');
      };
      document.head.append(script);
    }
    desktop.addEventListener('change', carregarLibras);
    carregarLibras();

    lista.setAttribute('aria-busy', 'true');
    lista.append(elemento('p', '', 'Carregando exposições…'));
    try {
      const exposicoes = demo ? csaVisitasModelo.exposicoesDemo() : await csaVisitasApi.exposicoes();
      lista.replaceChildren();
      for (const exposicao of exposicoes) {
        if (exposicao.pausada) continue;
        const cartao = elemento('article', 'csa-vp-exposicao');
        cartao.dataset.sala = exposicao.sala_id - 1;
        const detalhes = elemento('a', '', 'Ver detalhes');
        detalhes.href = link('detalhes-visita.html', { exposicao: exposicao.sala_id });
        detalhes.setAttribute('aria-label', `Ver detalhes de ${exposicao.nome} em ${exposicao.sala}`);
        cartao.append(elemento('h3', '', exposicao.sala), elemento('p', '', exposicao.nome), detalhes);
        lista.append(cartao);
      }
      if (!lista.childElementCount) lista.append(elemento('p', '', 'Nenhuma exposição em cartaz.'));
    } catch (erro) {
      lista.replaceChildren(elemento('p', 'csa-vp-aviso', erro.message));
    } finally {
      lista.removeAttribute('aria-busy');
    }
  }

  const rotuloHorario = horario => horario.replace(':', 'H').replace(/^0/, '');

  async function mostrarHorarios() {
    const opcoes = document.getElementById('csa-vp-turnos');
    const form = document.getElementById('csa-vp-horarios');
    const enviar = form.querySelector('[type="submit"]');
    const aviso = document.getElementById('csa-vp-aviso');
    const rascunhoAtual = rascunho();
    const pedidoAnterior = rascunhoAtual?.dia === dia ? rascunhoAtual.hora : '';
    opcoes.setAttribute('aria-busy', 'true');
    try {
      const janelas = demo ? [] : await csaVisitasApi.disponibilidade(dia);
      let temHorario = false;
      turnos.forEach(turno => {
        const secao = elemento('fieldset', 'csa-vp-turno');
        const titulo = elemento('legend');
        titulo.append(elemento('span', '', turno.nome), elemento('span', '', turno.faixa));
        const grade = elemento('div', 'csa-vp-turno__grade');
        turno.horas.forEach(inicio => {
          const termino = csaVisitaSolicitacao.termino(inicio);
          const bloqueado = demo ? inicio === '09:20' : !csaVisitaSolicitacao.horarioDisponivel(janelas, dia, inicio);
          if (!bloqueado) temHorario = true;
          const label = elemento('label', 'csa-vp-turno__opcao');
          const input = elemento('input');
          input.type = 'radio'; input.name = 'horario'; input.value = inicio;
          input.required = true; input.disabled = bloqueado;
          input.checked = !bloqueado && inicio === (pedidoAnterior || (demo ? '10:40' : ''));
          label.append(input, elemento('strong', '', `${rotuloHorario(inicio)} - ${rotuloHorario(termino)}`), elemento('span', '', bloqueado ? 'Indisponível' : 'Disponível'));
          grade.append(label);
        });
        secao.append(titulo, grade);
        opcoes.append(secao);
      });
      enviar.disabled = !form.elements.horario.value;
      if (!temHorario) {
        aviso.textContent = 'Não há horários de visita disponíveis nesta data.';
        aviso.hidden = false;
      }
    } catch (erro) {
      aviso.textContent = erro.message;
      aviso.hidden = false;
    } finally { opcoes.removeAttribute('aria-busy'); }
    form.addEventListener('change', () => { enviar.disabled = !form.elements.horario?.value; });
    form.addEventListener('submit', evento => {
      evento.preventDefault();
      const escolhido = form.elements.horario?.value;
      if (horas.includes(escolhido)) location.assign(link('formulario-visita.html', { hora: escolhido }));
    });
  }

  const camposDoResumo = ['responsavel', 'telefone', 'email', 'formacao', 'disciplina', 'instituicao', 'endereco', 'natureza', 'escolaridade', 'curso', 'quantidade', 'faixaEtaria', 'objetivo', 'primeiraVisita', 'trabalho', 'preparacao', 'grupo', 'acessibilidade', 'quantidadePcd'];
  const titulos = {
    responsavel: 'Responsável pela visita', instituicao: 'Nome da instituição ou organização social', natureza: 'Natureza da instituição',
    objetivo: 'Qual o objetivo da visita à Casa de Saberes Cego Aderaldo, bem como à exposição?',
    acessibilidade: 'Seu grupo terá pessoas com deficiência?', quantidade: 'Quantidade de pessoas',
    trabalho: 'O grupo está trabalhando ou pretende trabalhar alguma questão em sala de aula referente às exposições, há interesse em algum tema específico que a mediação possa contribuir de alguma forma? Conte-nos como.'
  };
  const dicas = { responsavel: 'Digite o nome', telefone: '(XX) X XXXX-XXXX', email: 'exemplo@gmail.com' };
  const tipos = { telefone: 'tel', email: 'email', quantidade: 'number', quantidadePcd: 'number' };
  const { obrigatorios, completarFormulario } = csaVisitasModelo;
  const limitesTexto = {
    responsavel: [3, 120], telefone: [8, 20], formacao: [0, 150], disciplina: [0, 150],
    instituicao: [2, 150], escolaridade: [0, 100], curso: [0, 150], faixaEtaria: [0, 100]
  };
  const termos = [
    { id: 'ciencia', titulo: 'Termo de Ciência sobre Análise e Aprovação da solicitação', texto: 'Declaro estar ciente de que esta solicitação não confirma a visita, estando sua análise e aprovação sujeitas à avaliação da gestão do espaço cultural solicitado, que poderá autorizar ou negar a solicitação.', obrigatorio: true },
    { id: 'imagem', titulo: 'Autorizo em definitivo e de maneira irretratável a Casa de Saberes Cego Aderaldo a gravação do áudio e realização de fotografias e filmagens durante a atividade, de acordo com a lei 13.709/2018. Para utilização em materiais institucionais do equipamento, podendo depositar o referido material em seu banco de dados, podendo usá-lo, publicá-lo e reproduzi-lo livremente, desde que para fins institucionais e/ou para divulgação da produção cultural local.', texto: 'Sim, concordo com os termos.' },
    { id: 'logos', titulo: 'Termo de Ciência sobre Uso da Régua de Logos Institucional', texto: 'Declaro estar ciente de que, em caso de aprovação da presente solicitação, deverá ser utilizado em todos os materiais de divulgação (como cards, flyers, pôsteres e/ou publicações) o uso obrigatório da régua de logos padrão do equipamento cultural, conforme disponibilizado.', obrigatorio: true }
  ];

  function tituloPergunta(campo) {
    const padrao = csaVisitasModelo.campos.find(item => item.id === campo.id);
    return campo.titulo === padrao?.titulo ? titulos[campo.id] || campo.titulo : campo.titulo;
  }

  function pergunta(campo, salvo) {
    const padrao = csaVisitasModelo.campos.find(item => item.id === campo.id);
    const titulo = tituloPergunta(campo);
    const obrigatorio = obrigatorios.includes(campo.id) || (!padrao && campo.id !== 'endereco' && !campo.opcional);
    const bloco = elemento(campo.opcoes ? 'fieldset' : 'div', 'csa-vp-campo');
    const rotulo = elemento(campo.opcoes ? 'legend' : 'label', '', titulo);
    if (campo.opcional) rotulo.append(' ', elemento('small', '', '*opcional'));
    bloco.append(rotulo);
    if (!campo.opcoes) {
      const input = elemento('input');
      input.id = `visita-${campo.id}`;
      input.name = campo.id;
      input.type = Object.hasOwn(tipos, campo.id) ? tipos[campo.id] : campo.email ? 'email' : 'text';
      input.placeholder = campo.dica === padrao?.dica ? dicas[campo.id] || campo.dica || 'Digite aqui' : campo.dica || 'Digite aqui';
      input.required = obrigatorio;
      if (Object.hasOwn(limitesTexto, campo.id)) [input.minLength, input.maxLength] = limitesTexto[campo.id];
      input.value = salvo[campo.id] ?? '';
      const completar = { responsavel: 'name', telefone: 'tel', email: 'email', instituicao: 'organization' }[campo.id];
      if (completar) input.autocomplete = completar;
      if (input.type === 'number') { input.min = campo.id === 'quantidade' ? '1' : '0'; input.step = '1'; }
      rotulo.htmlFor = input.id;
      bloco.append(input);
      return bloco;
    }
    const opcoes = elemento('div', 'csa-vp-campo__opcoes');
    const valores = [salvo[campo.id] ?? []].flat();
    let outro;
    campo.opcoes.forEach((opcao, indice) => {
      const linha = elemento('div', 'csa-vp-campo__linha');
      const label = elemento('label');
      const input = elemento('input');
      input.type = campo.multipla ? 'checkbox' : 'radio';
      input.required = obrigatorio && !campo.multipla;
      input.name = campo.id; input.value = opcao; input.checked = valores.includes(opcao);
      const detalhar = opcao === 'Outro' && (campo.outro || campo.id === 'acessibilidade');
      label.append(input, detalhar ? 'Outro:' : opcao);
      linha.append(label);
      if (detalhar) {
        outro = elemento('input', 'csa-vp-campo__outro');
        outro.type = 'text'; outro.name = `${campo.id}-outro`; outro.id = `visita-outro-${campo.id}-${indice}`;
        outro.setAttribute('aria-label', `Outra resposta para ${titulo}`);
        outro.value = salvo[outro.name] ?? '';
        linha.append(outro);
      }
      opcoes.append(linha);
    });
    function validarSelecao() {
      if (!obrigatorio || !campo.multipla) return;
      opcoes.querySelector('input[type="checkbox"]').setCustomValidity(
        opcoes.querySelector('input[type="checkbox"]:checked') ? '' : 'Selecione ao menos uma opção.'
      );
    }
    function definirOutro() {
      if (!outro) return;
      const marcado = Boolean(opcoes.querySelector('input[value="Outro"]:checked'));
      outro.disabled = !marcado;
      outro.required = marcado;
    }
    opcoes.addEventListener('change', evento => {
      if (campo.id === 'acessibilidade' && evento.target.checked) {
        const selecionouNao = evento.target.value === 'Não';
        opcoes.querySelectorAll('input[type="checkbox"]').forEach(input => {
          if (input !== evento.target && (selecionouNao || input.value === 'Não')) input.checked = false;
        });
      }
      definirOutro();
      validarSelecao();
    });
    definirOutro();
    validarSelecao();
    bloco.append(opcoes);
    return bloco;
  }

  function termo(dados, salvo) {
    const grupo = elemento('fieldset', 'csa-vp-termo');
    const texto = elemento('label');
    const controle = elemento('input');
    controle.type = 'checkbox'; controle.name = dados.id; controle.required = Boolean(dados.obrigatorio);
    controle.checked = Boolean(salvo[dados.id]);
    texto.append(controle, elemento('span', '', dados.texto));
    grupo.append(elemento('legend', '', dados.titulo), texto);
    return grupo;
  }

  async function mostrarFormulario() {
    const form = document.getElementById('csa-vp-formulario');
    const perguntas = document.getElementById('csa-vp-perguntas');
    const aviso = document.getElementById('csa-vp-aviso');
    let campos;
    perguntas.setAttribute('aria-busy', 'true');
    perguntas.textContent = 'Carregando perguntas…';
    try {
      const definicao = demo ? csaVisitasModelo.campos : await csaVisitasApi.formulario();
      campos = completarFormulario(definicao);
      const posicaoInstituicao = campos.findIndex(campo => campo.id === 'instituicao');
      if (posicaoInstituicao >= 0 && !campos.some(campo => campo.id === 'endereco')) {
        campos.splice(posicaoInstituicao + 1, 0, { id: 'endereco', titulo: 'Endereço da instituição', opcional: true });
      }
    } catch (erro) {
      perguntas.textContent = '';
      aviso.textContent = erro.message;
      aviso.hidden = false;
      return;
    } finally {
      perguntas.removeAttribute('aria-busy');
    }
    const anterior = rascunho();
    const salvo = anterior?.dia === dia && anterior?.hora === horario ? anterior.respostas || {} : {};
    const esquerda = elemento('div', 'csa-vp-coluna');
    const direita = elemento('div', 'csa-vp-coluna');
    const ciencia = termo(termos[0], salvo);
    const termosFinais = termos.slice(1).map(item => termo(item, salvo));
    const blocos = campos.map(campo => ({
      no: pergunta(campo, salvo),
      complementar: campo.id === 'trabalho' || (campo.complementar && !['quantidade', 'faixaEtaria'].includes(campo.id))
    }));
    const mobile = matchMedia('(max-width: 760px), (pointer: coarse)');
    const blocoInicial = elemento('div', 'csa-vp-perguntas__inicio');
    function organizar() {
      const foco = document.activeElement;
      if (mobile.matches) {
        blocoInicial.replaceChildren(ciencia, ...blocos.slice(0, 6).map(bloco => bloco.no));
        perguntas.replaceChildren(blocoInicial, ...blocos.slice(6).map(bloco => bloco.no), ...termosFinais);
      } else {
        esquerda.replaceChildren(ciencia, ...blocos.filter(bloco => !bloco.complementar).map(bloco => bloco.no));
        direita.replaceChildren(...blocos.filter(bloco => bloco.complementar).map(bloco => bloco.no), ...termosFinais);
        perguntas.replaceChildren(esquerda, direita);
      }
      if (perguntas.contains(foco)) foco.focus({ preventScroll: true });
    }
    mobile.addEventListener('change', organizar);
    organizar();
    form.querySelector('[type="submit"]').disabled = false;
    form.addEventListener('submit', evento => {
      evento.preventDefault();
      if (!horario || !dataValida(pedido)) {
        aviso.replaceChildren('Escolha um horário para continuar. ', Object.assign(elemento('a', '', 'Ver horários'), { href: link('horarios-visita.html') }));
        aviso.hidden = false;
        aviso.focus();
        return;
      }
      const valores = new FormData(form);
      const multiplos = new Set(campos.filter(campo => campo.multipla && campo.opcoes).map(campo => campo.id));
      const respostas = Object.fromEntries([...valores].map(([id, valor]) => [
        id, multiplos.has(id) ? valores.getAll(id) : valor.trim()
      ]));
      const solicitacao = { dia, hora: horario, respostas, campos };
      if (!demo) {
        try {
          csaVisitaSolicitacao.montar(solicitacao);
        } catch (erro) {
          aviso.textContent = erro.message;
          aviso.hidden = false;
          aviso.focus();
          return;
        }
      }
      try {
        guardar(solicitacao);
        location.assign(link('confirmacao-visita.html', { fluxo: '1' }));
      } catch {
        aviso.textContent = 'Não foi possível guardar as respostas para revisão. Tente novamente.';
        aviso.hidden = false;
        aviso.focus();
      }
    });
  }

  async function mostrarRevisao() {
    if (!parametros.has('fluxo')) return;
    const salvo = rascunho();
    const respostas = salvo?.respostas;
    if (salvo?.dia !== dia || !horas.includes(salvo?.hora) || !respostas) return;
    let campos = salvo.campos;
    if (!Array.isArray(campos)) {
      try {
        campos = completarFormulario(demo ? csaVisitasModelo.campos : await csaVisitasApi.formulario());
        if (respostas.endereco && !campos.some(campo => campo.id === 'endereco')) {
          campos.push({ id: 'endereco', titulo: 'Endereço da instituição' });
        }
      } catch (erro) {
        const estado = document.getElementById('csa-confirmacao-estado');
        estado.replaceChildren(elemento('p', '', erro.message), Object.assign(elemento('a', '', 'Voltar ao formulário'), {
          href: link('formulario-visita.html', { hora: salvo.hora })
        }));
        return;
      }
    }
    const dados = Object.fromEntries(campos.map(campo => [
      campo.id, csaVisitaSolicitacao.valores(respostas, campo.id).join(', ')
    ]));
    const rotulos = Object.fromEntries(campos.map(campo => [campo.id, tituloPergunta(campo)]));
    const extras = campos.filter(campo => !camposDoResumo.includes(campo.id)).map(campo => [campo.id, rotulos[campo.id]]);
    for (const id of ['quantidade', 'quantidadePcd']) {
      if (dados[id]) dados[id] += Number(dados[id]) === 1 ? ' Pessoa' : ' Pessoas';
    }
    const solicitacao = { ...salvo, campos };
    window.csaConfirmacao.revisar({ dados, extras, rotulos }, {
      voltar: () => location.assign(link('formulario-visita.html', { hora: salvo.hora })),
      enviar: () => csaVisitasApi.enviar(csaVisitaSolicitacao.montar(solicitacao)),
      sucesso: () => {
        if (!demo) {
          try { limpar(); } catch { /* O servidor já confirmou o recebimento. */ }
        }
        document.querySelector('.csa-confirmacao-conteudo').hidden = true;
        document.body.classList.add('csa-visita-publica--sucesso');
        document.getElementById('csa-vp-sucesso').hidden = false;
        window.scrollTo(0, 0);
        document.getElementById('csa-vp-sucesso-titulo').focus({ preventScroll: true });
      }
    });
  }

  atualizarRetornos();
  if (pagina === 'agenda') mostrarAgenda();
  if (pagina === 'horarios') mostrarHorarios();
  if (pagina === 'formulario') mostrarFormulario();
  if (pagina === 'revisao') mostrarRevisao();
})();
