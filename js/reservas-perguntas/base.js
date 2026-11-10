// Cada instância tem título, descrição/placeholder e corpo, identificados pelo ID da pergunta.
const csaPerguntaBase = (() => {
  function escapar(valor) {
    return String(valor ?? '').replace(/[&<>"']/g, caractere => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[caractere]);
  }

  function id(pergunta) { return `csa-pergunta-${pergunta.id}`; }
  function referencias(pergunta) {
    const base = id(pergunta);
    return `${base}-erro${pergunta.tipo !== 'aberta' && (pergunta.descricao || pergunta.mobile?.descricao) ? ` ${base}-descricao` : ''}`;
  }

  function renderizar(pergunta, corpo) {
    const base = id(pergunta);
    const e = escapar;
    const aberta = pergunta.tipo === 'aberta';
    const titulo = aberta
      ? `<label class="csa-pergunta__titulo${pergunta.tituloVisivel === false ? ' csa-reservas__sr' : ''}" for="${e(base)}">${e(pergunta.titulo)}</label>`
      : `<legend class="csa-pergunta__titulo" id="${e(base)}-titulo">${e(pergunta.titulo)}</legend>`;
    const descricao = !aberta && (pergunta.descricao || pergunta.mobile?.descricao)
      ? `<p class="csa-pergunta__descricao" id="${e(base)}-descricao" ${pergunta.descricao ? '' : 'hidden'}>${e(pergunta.descricao)}</p>` : '';
    const tag = aberta ? 'div' : 'fieldset';
    return `<${tag} class="csa-pergunta csa-pergunta--${e(pergunta.tipo)}" data-pergunta-id="${e(pergunta.id)}">
      ${titulo}${descricao}<div class="csa-pergunta__corpo">${corpo}</div>
      <p class="csa-pergunta__erro" id="${e(base)}-erro" hidden></p>
    </${tag}>`;
  }

  return { escapar, id, referencias, renderizar };
})();
