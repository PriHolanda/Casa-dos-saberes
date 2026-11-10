const csaPerguntaAnexo = (() => {
  function renderizar(pergunta) {
    const { escapar: e, id, referencias } = csaPerguntaBase;
    return csaPerguntaBase.renderizar(pergunta, `<label class="csa-pergunta__upload" for="${e(id(pergunta))}">
      <img src="../assets/reservas/arquivo.png" width="85" height="66" alt="">
      <span class="csa-pergunta__adicionar">Adicionar arquivo</span>
      <input class="csa-pergunta__arquivo-input" type="file" id="${e(id(pergunta))}" name="${e(pergunta.id)}"
        accept="${e(pergunta.aceita)}" aria-label="${e(pergunta.titulo)}" aria-describedby="${e(referencias(pergunta))}">
    </label>
    <div class="csa-pergunta__arquivo" hidden>
      <span class="csa-pergunta__arquivo-nome"></span>
      <button class="csa-pergunta__remover" type="button" data-remover-anexo="${e(pergunta.id)}">Remover arquivo</button>
    </div>`);
  }
  return { renderizar };
})();
