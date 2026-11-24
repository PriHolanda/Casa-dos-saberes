(() => {
  const { chaveExposicoes, salas, exposicoes: lerExposicoes } = csaVisitasModelo;
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
  const exposicoes = lerExposicoes();
  let selecionada;
  let rascunho;

  function elemento(tag, classe, texto) {
    const el = document.createElement(tag);
    if (classe) el.className = classe;
    if (texto) el.textContent = texto;
    return el;
  }

  function cartao(indice, selecao = false) {
    const exposicao = selecao && indice === selecionada ? rascunho : exposicoes[indice];
    const cartao = elemento(selecao ? 'button' : 'article', 'csa-exposicoes-cartao');
    cartao.dataset.sala = indice;
    cartao.append(elemento('span', 'csa-exposicoes-cartao__sala', salas[indice]), elemento('strong', '', exposicao.nome || 'Nenhuma exposição cadastrada'));
    if (selecao) {
      cartao.type = 'button';
      cartao.setAttribute('aria-pressed', String(indice === selecionada));
      cartao.addEventListener('click', () => {
        if (indice === selecionada) return;
        location.search = new URLSearchParams({ sala: indice + 1 });
      });
      return cartao;
    }
    const rodape = elemento('div', 'csa-exposicoes-cartao__rodape');
    const estado = elemento('span', `csa-exposicoes-cartao__status${exposicao.pausada ? ' csa-exposicoes-cartao__status--pausado' : ''}`);
    const ponto = elemento('span', `csa-visitas-indicador${exposicao.pausada ? ' csa-exposicoes__indicador--pausado' : ''}`);
    ponto.setAttribute('aria-hidden', 'true');
    estado.append(ponto, exposicao.pausada ? 'Pausado' : 'Ativo');
    const editar = elemento('a', 'csa-visitas-botao', 'Editar');
    editar.href = `?sala=${indice + 1}`;
    editar.setAttribute('aria-label', `Editar exposição em ${salas[indice]}`);
    cartao.classList.toggle('csa-exposicoes-cartao--pausado', exposicao.pausada);
    rodape.append(estado, editar);
    cartao.append(rodape);
    return cartao;
  }

  function atualizarContador() {
    contador.textContent = `${descricao.value.length}/${descricao.maxLength}`;
  }

  function atualizarStatus() {
    status.textContent = rascunho.pausada ? 'Evento pausado' : 'Evento ativo';
    status.classList.toggle('csa-exposicoes-edicao__status--pausado', rascunho.pausada);
    alternar.textContent = rascunho.pausada ? 'Reativar' : 'Pausar';
    alternar.classList.toggle('csa-exposicoes-edicao__reativar', rascunho.pausada);
    tituloAlternar.textContent = `Você deseja ${rascunho.pausada ? 'reativar' : 'pausar'} essa exposição?`;
  }

  function mostrarEdicao(indice) {
    selecionada = indice;
    rascunho = { ...exposicoes[indice] };
    inicio.hidden = true;
    edicao.hidden = false;
    escolhas.replaceChildren(...salas.map((_, posicao) => cartao(posicao, true)));
    tituloSala.textContent = salas[indice];
    tituloSala.dataset.sala = indice;
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
  formulario.addEventListener('submit', evento => {
    evento.preventDefault();
    const titulo = nome.value.trim();
    if (!titulo) { nome.focus(); return; }
    const novas = lerExposicoes().map((exposicao, indice) => {
      if (selecionada !== indice) return exposicao;
      return { ...rascunho, nome: titulo, descricao: descricao.value.trim(), classificacao: classificacao.value.trim() };
    });
    try {
      localStorage.setItem(chaveExposicoes, JSON.stringify(novas));
    } catch {
      aviso.textContent = 'Não foi possível guardar as alterações neste navegador.';
      aviso.hidden = false;
      return;
    }
    edicao.hidden = true;
    sucesso.hidden = false;
    window.scrollTo(0, 0);
    sucesso.querySelector('h1').focus({ preventScroll: true });
  });

  const indice = Number(new URLSearchParams(location.search).get('sala')) - 1;
  if (Number.isInteger(indice) && salas[indice]) mostrarEdicao(indice);
  else lista.replaceChildren(...salas.map((_, posicao) => cartao(posicao)));
})();
