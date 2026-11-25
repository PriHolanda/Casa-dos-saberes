(() => {
  const { exposicaoLocal } = csaVisitasModelo;
  const inicio = document.getElementById('csa-exposicoes-inicio');
  const edicao = document.getElementById('csa-exposicoes-edicao');
  const sucesso = document.getElementById('csa-exposicoes-sucesso');
  const lista = document.getElementById('csa-exposicoes-lista');
  const escolhas = document.getElementById('csa-exposicoes-salas');
  const formulario = document.getElementById('csa-exposicoes-form');
  const nome = formulario.elements.nome;
  const descricao = formulario.elements.descricao;
  const classificacao = formulario.elements.classificacao;
  const tituloSala = document.getElementById('csa-exposicoes-sala');
  const status = document.getElementById('csa-exposicoes-status');
  const alternar = document.getElementById('csa-exposicoes-alternar');
  const tituloAlternar = document.getElementById('csa-exposicoes-alternar-titulo');
  const aviso = document.getElementById('csa-exposicoes-aviso');
  const contador = formulario.querySelector('output');
  const carregamento = document.getElementById('csa-exposicoes-carregamento');
  const importar = document.getElementById('csa-exposicoes-importar');
  const salvar = formulario.querySelector('[type="submit"]');
  const exposicoes = new Map();
  let salas;
  let salvando = false;
  let selecionada;
  let rascunho;

  function elemento(tag, classe, texto) {
    const el = document.createElement(tag);
    if (classe) el.className = classe;
    if (texto) el.textContent = texto;
    return el;
  }

  function cartao(sala, selecao = false) {
    const { id, nome: nomeSala } = sala;
    const exposicao = selecao && id === selecionada ? rascunho : exposicoes.get(id);
    const cartao = elemento(selecao ? 'button' : 'article', 'csa-exposicoes-cartao');
    cartao.dataset.sala = id - 1;
    cartao.append(elemento('span', 'csa-exposicoes-cartao__sala', nomeSala), elemento('strong', '', exposicao?.nome || 'Sem exposição'));
    if (selecao) {
      cartao.type = 'button';
      cartao.setAttribute('aria-pressed', String(id === selecionada));
      cartao.addEventListener('click', () => {
        if (salvando || id === selecionada) return;
        location.search = new URLSearchParams({ sala: id });
      });
      return cartao;
    }
    const rodape = elemento('div', 'csa-exposicoes-cartao__rodape');
    const pausada = exposicao?.pausada;
    const estado = elemento('span', `csa-exposicoes-cartao__status${pausada ? ' csa-exposicoes-cartao__status--pausado' : ''}`);
    const ponto = elemento('span', `csa-visitas-indicador${pausada ? ' csa-exposicoes__indicador--pausado' : ''}`);
    ponto.setAttribute('aria-hidden', 'true');
    if (exposicao) estado.append(ponto, pausada ? 'Pausado' : 'Ativo');
    const editar = elemento('a', 'csa-visitas-botao', exposicao ? 'Editar' : 'Publicar');
    editar.href = `?sala=${id}`;
    editar.setAttribute('aria-label', `${editar.textContent} exposição em ${nomeSala}`);
    cartao.classList.toggle('csa-exposicoes-cartao--pausado', Boolean(pausada));
    rodape.append(estado, editar);
    cartao.append(rodape);
    return cartao;
  }

  function atualizarContador() {
    contador.textContent = `${descricao.value.length}/${descricao.maxLength}`;
  }

  function atualizarStatus() {
    const temExposicao = exposicoes.has(selecionada);
    status.textContent = temExposicao ? (rascunho.pausada ? 'Exposição pausada' : 'Exposição ativa') : 'Sem exposição';
    alternar.closest('section').hidden = !temExposicao && !rascunho.pausada;
    status.classList.toggle('csa-exposicoes-edicao__status--pausado', rascunho.pausada);
    alternar.textContent = rascunho.pausada ? 'Reativar' : 'Pausar';
    alternar.classList.toggle('csa-exposicoes-edicao__reativar', rascunho.pausada);
    tituloAlternar.textContent = `Você deseja ${rascunho.pausada ? 'reativar' : 'pausar'} essa exposição?`;
  }

  function mostrarEdicao(sala) {
    selecionada = sala.id;
    rascunho = { nome: '', descricao: '', classificacao: '', pausada: false, ...exposicoes.get(selecionada) };
    inicio.hidden = true;
    edicao.hidden = false;
    escolhas.replaceChildren(...salas.map(item => cartao(item, true)));
    tituloSala.textContent = sala.nome;
    tituloSala.dataset.sala = selecionada - 1;
    importar.hidden = !exposicaoLocal(selecionada);
    preencherEdicao();
  }

  function preencherEdicao() {
    nome.value = rascunho.nome;
    descricao.value = rascunho.descricao;
    classificacao.value = rascunho.classificacao;
    atualizarContador();
    atualizarStatus();
  }

  descricao.addEventListener('input', atualizarContador);
  alternar.addEventListener('click', () => {
    rascunho.pausada = !rascunho.pausada;
    atualizarStatus();
  });
  importar.addEventListener('click', () => {
    if (salvando) return;
    const local = exposicaoLocal(selecionada);
    if (!local) return;
    const titulo = exposicoes.get(selecionada)?.nome;
    if ((titulo || nome.value) && !window.confirm('Substituir os dados exibidos pelos dados deste navegador?')) return;
    rascunho = {
      nome: local.nome,
      descricao: typeof local.descricao === 'string' ? local.descricao : '',
      classificacao: typeof local.classificacao === 'string' ? local.classificacao : '',
      pausada: local.pausada === true
    };
    preencherEdicao();
    aviso.textContent = 'Dados preenchidos. Salve para publicar as alterações.';
    aviso.hidden = false;
    nome.focus();
  });
  formulario.addEventListener('submit', async evento => {
    evento.preventDefault();
    if (salvando) return;
    const titulo = nome.value.trim();
    if (!titulo) { nome.focus(); return; }
    const dados = { nome: titulo, descricao: descricao.value.trim(), classificacao: classificacao.value.trim() };
    if (rascunho.pausada !== (exposicoes.get(selecionada)?.pausada ?? false)) dados.pausada = rascunho.pausada;
    salvando = true;
    const controles = [nome, descricao, classificacao, alternar, importar, salvar];
    controles.forEach(controle => { controle.disabled = true; });
    aviso.textContent = 'Salvando exposição…';
    aviso.hidden = false;
    try {
      await csaVisitasApi.salvarExposicao(selecionada, dados);
      aviso.hidden = true;
      edicao.hidden = true;
      sucesso.hidden = false;
      window.scrollTo(0, 0);
      sucesso.querySelector('h1').focus({ preventScroll: true });
    } catch (erro) {
      aviso.textContent = erro.message;
    } finally {
      salvando = false;
      controles.forEach(controle => { controle.disabled = false; });
    }
  });

  async function carregar() {
    try {
      const painel = await csaVisitasApi.editorExposicoes();
      salas = painel.salas;
      painel.exposicoes.forEach(exposicao => exposicoes.set(exposicao.sala_id, exposicao));
      carregamento.hidden = true;
      const id = Number(new URLSearchParams(location.search).get('sala'));
      const sala = salas.find(item => item.id === id);
      if (sala) mostrarEdicao(sala);
      else lista.replaceChildren(...salas.map(item => cartao(item)));
    } catch (erro) {
      carregamento.textContent = erro.message;
    }
  }

  carregar();
})();
