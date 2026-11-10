const csaPerguntaAberta = (() => {
  function renderizar(pergunta, valor = '') {
    const { escapar: e, id, referencias } = csaPerguntaBase;
    const campos = ['text', 'tel', 'email', 'url', 'number', 'textarea'];
    const tipo = campos.includes(pergunta.campo) ? pergunta.campo : 'text';
    const atributos = `id="${e(id(pergunta))}" name="${e(pergunta.id)}" class="csa-campo csa-pergunta__entrada"
      placeholder="${e(pergunta.descricao)}" aria-describedby="${e(referencias(pergunta))}"
      ${pergunta.obrigatoria ? 'required' : ''}
      ${pergunta.autocomplete ? `autocomplete="${e(pergunta.autocomplete)}"` : ''}
      ${pergunta.limite ? `maxlength="${e(pergunta.limite)}"` : ''}`;
    const corpo = tipo === 'textarea'
      ? `<textarea ${atributos} rows="4">${e(valor)}</textarea>`
      : `<input ${atributos} type="${tipo}" value="${e(valor)}"
          ${tipo === 'number' ? `step="1" min="${e(pergunta.minimo ?? 0)}" inputmode="numeric"` : ''}>`;
    return csaPerguntaBase.renderizar(pergunta, corpo);
  }
  return { renderizar };
})();
