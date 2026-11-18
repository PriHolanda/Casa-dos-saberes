const csaPerguntaEscolha = (() => {
  function renderizar(pergunta, valor = pergunta.multipla ? [] : '') {
    const { escapar: e, id, referencias } = csaPerguntaBase;
    const selecionados = new Set(Array.isArray(valor) ? valor : [valor]);
    const corpo = pergunta.opcoes.map((opcao, indice) => `<label class="csa-pergunta__opcao" for="${e(id(pergunta))}-${indice}">
      <input class="csa-pergunta__selecao" id="${e(id(pergunta))}-${indice}" type="${pergunta.multipla ? 'checkbox' : 'radio'}"
        name="${e(pergunta.id)}" value="${e(opcao.id)}" aria-describedby="${e(referencias(pergunta))}"
        ${selecionados.has(opcao.id) ? 'checked' : ''} ${!pergunta.multipla && pergunta.obrigatoria ? 'required' : ''}>
      <span>${e(opcao.titulo)}</span>
    </label>`).join('');
    return csaPerguntaBase.renderizar(pergunta, `<div class="csa-pergunta__opcoes">${corpo}</div>`);
  }
  return { renderizar };
})();
