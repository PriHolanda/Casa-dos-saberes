(() => {
  const { chaveFormulario, formulario: lerFormulario } = csaVisitasModelo;
  const essenciais = new Set(['responsavel', 'telefone', 'email', 'quantidade']);
  const principal = document.getElementById('csa-visita-campos-principais');
  const complementar = document.getElementById('csa-visita-campos-complementares');
  const editor = document.getElementById('csa-visita-editor');
  const corpo = document.getElementById('csa-visita-editor-conteudo');
  const formulario = document.getElementById('csa-visita-editor-form');
  const aviso = document.getElementById('csa-visita-formulario-aviso');
  const adicionar = document.getElementById('csa-visita-adicionar');
  let campos = lerFormulario();
  let indice = -1;
  let rascunho;
  let origem;

  function persistir(proximos) {
    try {
      localStorage.setItem(chaveFormulario, JSON.stringify(proximos));
      aviso.hidden = true;
      campos = proximos;
      return true;
    } catch {
      aviso.textContent = 'Não foi possível guardar as alterações neste navegador.';
      aviso.hidden = false;
      return false;
    }
  }

  function elemento(tag, classe, texto) {
    const el = document.createElement(tag);
    if (classe) el.className = classe;
    if (texto) el.textContent = texto;
    return el;
  }

  function botao(classe, texto, acao, rotulo) {
    const el = elemento('button', classe, texto);
    el.type = 'button';
    if (rotulo) el.setAttribute('aria-label', rotulo);
    el.addEventListener('click', acao);
    return el;
  }

  function renderizarCampos() {
    principal.replaceChildren();
    complementar.replaceChildren();
    campos.forEach((campo, posicao) => {
      const secao = elemento('section', 'csa-visita-campo');
      const titulo = elemento('h2', '', campo.titulo);
      if (campo.opcional) titulo.append(' ', elemento('small', '', '*opcional'));
      titulo.append(' ', botao('csa-visita-campo__editar', 'Editar', evento => abrir(posicao, evento.currentTarget), `Editar ${campo.titulo}`));
      const linha = elemento('div', 'csa-visita-campo__linha');
      if (campo.opcoes) {
        const lista = elemento('ul', 'csa-visita-campo__opcoes');
        campo.opcoes.forEach(opcao => {
          const item = elemento('li', '', '');
          const marca = elemento('span', `csa-visita-formulario__marca${campo.multipla ? ' csa-visita-formulario__marca--quadrada' : ''}`);
          marca.setAttribute('aria-hidden', 'true');
          const texto = elemento('span', '', opcao);
          if (campo.outro && opcao === 'Outro') texto.append(elemento('span', 'csa-visita-campo__outro'));
          item.append(marca, texto);
          lista.append(item);
        });
        linha.append(lista);
      } else {
        linha.append(elemento('span', `csa-visita-campo__entrada${campo.email ? ' csa-visita-campo__entrada--email' : ''}${campo.dica ? ' csa-visita-campo__entrada--preenchida' : ''}`, campo.dica || 'Digite aqui'));
      }
      const remover = botao('csa-visitas-botao csa-visita-campo__remover', 'x', () => {
        if (essenciais.has(campo.id)) return;
        if (!persistir(campos.filter((_, item) => item !== posicao))) return;
        renderizarCampos();
        (document.querySelectorAll('.csa-visita-campo__editar')[posicao] || adicionar).focus();
      }, `Remover ${campo.titulo}`);
      remover.disabled = essenciais.has(campo.id);
      if (remover.disabled) remover.title = 'Campo obrigatório para solicitar uma visita.';
      linha.append(remover);
      secao.append(titulo, linha);
      (campo.complementar ? complementar : principal).append(secao);
    });
  }

  function editarTexto(conteiner, texto, descricao, atualizar, classe, textoBotao = 'Editar') {
    const inicio = elemento('span', '', texto);
    const editar = botao('csa-visita-editor__editar', textoBotao, () => {
      const input = elemento('input', 'csa-visita-editor__entrada');
      input.type = 'text';
      input.setAttribute('aria-label', descricao);
      input.value = texto;
      input.addEventListener('input', () => atualizar(input.value));
      conteiner.replaceChildren(input);
      input.focus();
      input.select();
    }, `Editar ${descricao}`);
    conteiner.className = classe;
    conteiner.append(inicio, ' ', editar);
    return conteiner;
  }

  function escolha(nome, valor, texto, marcado, alterar) {
    const label = elemento('label', 'csa-visita-editor__escolha');
    const input = elemento('input');
    input.type = 'radio';
    input.name = nome;
    input.value = valor;
    input.checked = marcado;
    input.addEventListener('change', alterar);
    label.append(input, texto);
    return label;
  }

  function renderizarEditor() {
    corpo.replaceChildren();
    const novo = indice < 0;
    const selecao = Array.isArray(rascunho.opcoes);
    if (novo) {
      const tipos = elemento('fieldset', 'csa-visita-editor__tipos');
      tipos.setAttribute('aria-label', 'Tipo de campo');
      tipos.append(
        escolha('tipo', 'texto', 'Texto', !selecao, () => { delete rascunho.opcoes; renderizarEditor(); }),
        escolha('tipo', 'selecao', 'Caixa de seleção', selecao, () => { rascunho.opcoes = []; renderizarEditor(); })
      );
      corpo.append(tipos);
    }
    const titulo = elemento('h2');
    titulo.id = 'csa-visita-editor-titulo';
    corpo.append(editarTexto(titulo, rascunho.titulo, 'título do campo', valor => { rascunho.titulo = valor; }, 'csa-visita-editor__titulo', !novo && !selecao ? 'editar' : 'Editar'));
    if (!selecao) {
      corpo.append(editarTexto(elemento('div'), rascunho.dica || 'Digite aqui', 'texto de exemplo', valor => { rascunho.dica = valor; }, 'csa-visita-editor__dica', 'editar'));
      return;
    }
    const lista = elemento('ul', 'csa-visita-editor__opcoes');
    rascunho.opcoes.forEach((opcao, posicao) => {
      const item = elemento('li');
      const remover = botao('csa-visitas-botao csa-visita-editor__remover', 'x', () => {
        rascunho.opcoes.splice(posicao, 1);
        renderizarEditor();
        corpo.querySelector('.csa-visita-editor__adicionar').focus();
      }, `Remover opção ${posicao + 1}`);
      const marca = elemento('span', 'csa-visita-formulario__marca csa-visita-formulario__marca--quadrada');
      marca.setAttribute('aria-hidden', 'true');
      item.append(remover, marca, editarTexto(elemento('div'), opcao, `opção ${posicao + 1}`, valor => { rascunho.opcoes[posicao] = valor; }, 'csa-visita-editor__opcao'));
      lista.append(item);
    });
    corpo.append(lista, botao('csa-visita-editor__adicionar', 'Adicionar', () => {
      rascunho.opcoes.push('Nova opção');
      renderizarEditor();
      corpo.querySelector('.csa-visita-editor__opcoes li:last-child .csa-visita-editor__editar').click();
    }));
    if (novo) {
      const multipla = elemento('fieldset', 'csa-visita-editor__multipla');
      multipla.append(
        elemento('legend', '', 'Multipla escolha?'),
        escolha('multipla', 'sim', 'Sim', rascunho.multipla, () => { rascunho.multipla = true; }),
        escolha('multipla', 'nao', 'Não', !rascunho.multipla, () => { rascunho.multipla = false; })
      );
      corpo.append(multipla);
    }
  }

  function abrir(posicao, gatilho) {
    indice = posicao;
    origem = gatilho;
    rascunho = posicao < 0
      ? { id: `campo-${crypto.randomUUID()}`, titulo: 'Adicione um título', opcoes: [], multipla: true, complementar: true }
      : structuredClone(campos[posicao]);
    editor.classList.toggle('csa-visita-editor--texto', !rascunho.opcoes);
    editor.classList.toggle('csa-visita-editor--novo', posicao < 0);
    renderizarEditor();
    editor.showModal();
  }

  adicionar.addEventListener('click', () => abrir(-1, adicionar));
  editor.querySelector('.csa-visita-editor__fechar').addEventListener('click', () => editor.close());
  editor.addEventListener('close', () => {
    if (origem?.isConnected) origem.focus();
    else (document.querySelectorAll('.csa-visita-campo__editar')[indice] || adicionar).focus();
  });
  formulario.addEventListener('submit', evento => {
    evento.preventDefault();
    rascunho.titulo = rascunho.titulo.trim();
    if (!rascunho.titulo || (rascunho.opcoes && !rascunho.opcoes.some(opcao => opcao.trim()))) {
      const campo = !rascunho.titulo ? '.csa-visita-editor__titulo' : '.csa-visita-editor__opcoes';
      const el = corpo.querySelector(campo);
      if (campo.endsWith('opcoes') && !rascunho.opcoes.length) corpo.querySelector('.csa-visita-editor__adicionar').focus();
      else (el.querySelector('input') || el.querySelector('.csa-visita-editor__editar')).focus();
      return;
    }
    if (rascunho.opcoes) rascunho.opcoes = rascunho.opcoes.map(opcao => opcao.trim()).filter(Boolean);
    const proximos = campos.slice();
    if (indice < 0) proximos.push(rascunho);
    else proximos[indice] = rascunho;
    const guardado = persistir(proximos);
    if (guardado) renderizarCampos();
    editor.close();
  });
  renderizarCampos();
})();
