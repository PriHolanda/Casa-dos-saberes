// Regras puras: não acessam DOM, API ou armazenamento do navegador.
const csaReservasModelo = (() => {
  const tipos = ['aberta', 'escolha', 'anexo', 'termo'];
  const identificador = /^[a-z][a-z0-9-]*$/;

  function prepararDefinicao(definicao) {
    const copia = structuredClone(definicao);
    if (!identificador.test(copia?.id) || !Number.isSafeInteger(copia.versao) || copia.versao < 1 || !Array.isArray(copia.perguntas)) {
      throw new Error('Definição do formulário inválida.');
    }
    const ids = new Set();
    copia.perguntas.forEach(pergunta => {
      if (!identificador.test(pergunta.id) || ids.has(pergunta.id) || !tipos.includes(pergunta.tipo)
        || !['principal', 'complementar'].includes(pergunta.coluna) || !Number.isFinite(pergunta.ordem)
        || typeof pergunta.titulo !== 'string' || !pergunta.titulo.trim()) {
        throw new Error('A definição contém uma pergunta inválida ou repetida.');
      }
      ids.add(pergunta.id);
      pergunta.descricao = typeof pergunta.descricao === 'string' ? pergunta.descricao : '';
      pergunta.obrigatoria = pergunta.obrigatoria === true;
      if (pergunta.mobile !== undefined && (!pergunta.mobile || typeof pergunta.mobile !== 'object'
        || Array.isArray(pergunta.mobile) || ['titulo', 'descricao'].some(campo =>
          pergunta.mobile[campo] !== undefined && typeof pergunta.mobile[campo] !== 'string')
        || pergunta.mobile.titulo?.trim() === '')) {
        throw new Error('Apresentação mobile da pergunta inválida.');
      }
      if (pergunta.tipo === 'escolha') {
        const opcoes = new Set();
        if (!Array.isArray(pergunta.opcoes) || !pergunta.opcoes.length) throw new Error('Pergunta sem opções.');
        pergunta.opcoes.forEach(opcao => {
          if (!identificador.test(`opcao-${opcao.id}`) || opcoes.has(opcao.id)
            || typeof opcao.id !== 'string' || typeof opcao.titulo !== 'string' || !opcao.titulo.trim()) {
            throw new Error('Opção inválida ou repetida.');
          }
          opcoes.add(opcao.id);
        });
      }
      if (pergunta.tipo === 'termo' && (typeof pergunta.texto !== 'string' || !pergunta.texto.trim())) {
        throw new Error('Termo sem texto.');
      }
    });
    copia.alternativasObrigatorias ??= [];
    if (!Array.isArray(copia.alternativasObrigatorias)) throw new Error('Regras do formulário inválidas.');
    copia.alternativasObrigatorias.forEach(regra => {
      if (!Array.isArray(regra.ids) || !regra.ids.length || regra.ids.some(id => !ids.has(id))
        || typeof regra.mensagem !== 'string' || !regra.mensagem.trim()) {
        throw new Error('Regra com referência a pergunta inexistente.');
      }
    });
    return copia;
  }

  function valorInicial(pergunta) {
    if (pergunta.tipo === 'termo') return false;
    if (pergunta.tipo === 'anexo') return null;
    return pergunta.tipo === 'escolha' && pergunta.multipla ? [] : '';
  }

  // Varia somente os textos de apresentação; IDs, valores e regras continuam os mesmos.
  function apresentacao(pergunta, mobile = false) {
    return {
      titulo: mobile ? (pergunta.mobile?.titulo ?? pergunta.titulo) : pergunta.titulo,
      descricao: mobile ? (pergunta.mobile?.descricao ?? pergunta.descricao) : pergunta.descricao
    };
  }

  function preenchida(valor) {
    if (typeof valor === 'string') return Boolean(valor.trim());
    if (Array.isArray(valor)) return valor.length > 0;
    return valor !== null && valor !== undefined && valor !== false && valor !== '';
  }

  function validarResposta(pergunta, valor, obrigatoria = pergunta.obrigatoria) {
    if (!preenchida(valor)) return obrigatoria ? (pergunta.tipo === 'termo' ? 'Aceite este termo para continuar.' : 'Responda esta pergunta para continuar.') : '';
    if (pergunta.tipo === 'termo') return valor === true ? '' : 'Aceite este termo para continuar.';
    if (pergunta.tipo === 'escolha') {
      const valores = pergunta.multipla ? valor : [valor];
      if (!Array.isArray(valores) || valores.some(id => !pergunta.opcoes.some(opcao => opcao.id === id))) return 'Selecione uma opção válida.';
      return '';
    }
    if (pergunta.tipo === 'anexo') {
      if (typeof valor.name !== 'string' || !/\.pdf$/i.test(valor.name)
        || (valor.type && valor.type !== 'application/pdf')) return 'Selecione um arquivo PDF.';
      if (!Number.isFinite(valor.size) || valor.size <= 0) return 'O arquivo está vazio.';
      if (valor.size > pergunta.limiteBytes) return `O PDF deve ter até ${pergunta.limiteBytes / 1024 / 1024} MB.`;
      return '';
    }
    if (typeof valor !== 'string' && typeof valor !== 'number') return 'Informe uma resposta válida.';
    const texto = String(valor).trim();
    if (pergunta.limite && texto.length > pergunta.limite) return `Use até ${pergunta.limite} caracteres.`;
    if (pergunta.campo === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(texto)) return 'Informe um e-mail válido.';
    if (pergunta.campo === 'tel') {
      const digitos = texto.replace(/\D/g, '');
      if (!/^[+\d\s().-]+$/.test(texto) || !(/^(?:\d{10,11}|55\d{10,11})$/.test(digitos))) return 'Informe um telefone com DDD.';
    }
    if (pergunta.campo === 'number' && (!/^\d+$/.test(texto) || !Number.isSafeInteger(Number(texto)) || Number(texto) < (pergunta.minimo ?? 0))) {
      return `Informe um número inteiro a partir de ${pergunta.minimo ?? 0}.`;
    }
    if (pergunta.campo === 'url') {
      try {
        const url = new URL(texto);
        if (!['http:', 'https:'].includes(url.protocol) || !url.hostname) return 'Informe um link que comece com https:// ou http://.';
      } catch { return 'Informe um link completo, começando com https:// ou http://.'; }
    }
    return '';
  }

  function validar(definicao, respostas) {
    const erros = {};
    const alternativas = new Set(definicao.alternativasObrigatorias.flatMap(regra => regra.ids));
    definicao.perguntas.forEach(pergunta => {
      const erro = validarResposta(pergunta, respostas[pergunta.id], alternativas.has(pergunta.id) ? false : pergunta.obrigatoria);
      if (erro) erros[pergunta.id] = erro;
    });
    definicao.alternativasObrigatorias.forEach(regra => {
      if (!regra.ids.some(id => preenchida(respostas[id]))) erros[regra.ids[0]] = regra.mensagem;
    });
    return erros;
  }

  function prepararEnvio(definicao, respostas) {
    if (Object.keys(validar(definicao, respostas)).length) throw new Error('Revise as respostas do formulário.');
    const valores = {};
    const arquivos = {};
    definicao.perguntas.forEach(pergunta => {
      const valor = respostas[pergunta.id] ?? valorInicial(pergunta);
      if (pergunta.tipo === 'anexo') {
        valores[pergunta.id] = valor ? { nome: valor.name, tamanho: valor.size, tipo: valor.type || 'application/pdf' } : null;
        if (valor) arquivos[pergunta.id] = valor;
      } else if (pergunta.tipo === 'aberta') {
        valores[pergunta.id] = pergunta.campo === 'number' ? (preenchida(valor) ? Number(valor) : null) : String(valor).trim();
      } else valores[pergunta.id] = structuredClone(valor);
    });
    return { dados: { formularioId: definicao.id, versao: definicao.versao, respostas: valores }, arquivos };
  }

  return { prepararDefinicao, valorInicial, apresentacao, validarResposta, validar, prepararEnvio };
})();
