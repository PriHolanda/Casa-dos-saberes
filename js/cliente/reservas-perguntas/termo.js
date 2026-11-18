const csaPerguntaTermo = (() => {
  function renderizar(pergunta, valor = false) {
    const { escapar: e, id, referencias } = csaPerguntaBase;
    return csaPerguntaBase.renderizar(pergunta, `<label class="csa-pergunta__opcao csa-pergunta__opcao--termo" for="${e(id(pergunta))}">
      <input class="csa-pergunta__selecao" type="checkbox" id="${e(id(pergunta))}" name="${e(pergunta.id)}"
        aria-describedby="${e(referencias(pergunta))}" ${valor === true ? 'checked' : ''} ${pergunta.obrigatoria ? 'required' : ''}>
      <span>${e(pergunta.texto)}</span>
    </label>`);
  }
  return { renderizar };
})();
