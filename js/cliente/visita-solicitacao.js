const csaVisitaSolicitacao = (() => {
  const camposApi = {
    responsavel: 'nome_responsavel', telefone: 'telefone', email: 'email', formacao: 'formacao',
    disciplina: 'disciplina', instituicao: 'instituicao', escolaridade: 'grau_escolaridade',
    curso: 'curso_semestre', faixaEtaria: 'faixa_etaria', grupo: 'composicao_grupo'
  };
  const titulosObservacoes = {
    endereco: 'Endereço da instituição', trabalho: 'Trabalho pedagógico', objetivo: 'Objetivo da visita',
    primeiraVisita: 'Primeira visita', preparacao: 'Preparação da turma'
  };

  function termino(inicio) {
    return `${String(Number(inicio.slice(0, 2)) + 1).padStart(2, '0')}${inicio.slice(2)}`;
  }

  function horarioDisponivel(janelas, dia, inicio) {
    const instante = valor => Date.parse(/(?:Z|[+-]\d{2}:\d{2})$/.test(valor) ? valor : `${valor}-03:00`);
    const de = instante(`${dia}T${inicio}:00`);
    const ate = instante(`${dia}T${termino(inicio)}:00`);
    return janelas.some(janela => instante(janela.data_inicio) <= de && instante(janela.data_fim) >= ate);
  }

  function valores(respostas, id) {
    if (!Object.hasOwn(respostas, id)) return [];
    const complemento = respostas[`${id}-outro`];
    return [respostas[id]].flat().filter(Boolean).map(valor => valor === 'Outro' && complemento ? complemento : valor);
  }

  function montar({ dia, hora, respostas, campos }) {
    const texto = id => valores(respostas, id).join(', ');
    const dados = {
      ...Object.fromEntries(Object.entries(camposApi).map(([id, chave]) => [chave, texto(id) || null])),
      data_inicio: `${dia}T${hora}:00`,
      data_fim: `${dia}T${termino(hora)}:00`,
      quantidade_pessoas: Number(texto('quantidade')),
      aceitou_termos: Boolean(respostas.ciencia && respostas.logos)
    };
    if (!dados.aceitou_termos) throw new Error('Aceite os termos obrigatórios para continuar.');

    const natureza = texto('natureza');
    const tipo = natureza.toLocaleLowerCase('pt-BR');
    if (natureza) {
      if (['municipal', 'estadual', 'federal', 'pública', 'publica'].includes(tipo)) dados.natureza_instituicao = 'publica';
      else if (tipo === 'privada') dados.natureza_instituicao = 'privada';
      else dados.natureza_instituicao = 'outra';
    }

    const acessibilidade = valores(respostas, 'acessibilidade').filter(valor => valor !== 'Não');
    const quantidadePcd = Number(texto('quantidadePcd'));
    dados.possui_pcd = acessibilidade.length > 0 || quantidadePcd > 0;
    if (dados.possui_pcd) {
      if (!Number.isSafeInteger(quantidadePcd) || quantidadePcd <= 0 || quantidadePcd > dados.quantidade_pessoas) {
        throw new Error('Informe uma quantidade de pessoas com deficiência entre 1 e o total de visitantes.');
      }
      dados.tipos_deficiencia = acessibilidade.join(', ') || null;
      dados.quantidade_pcd = quantidadePcd;
    }

    const mapeados = new Set([...Object.keys(camposApi), 'natureza', 'quantidade', 'acessibilidade', 'quantidadePcd']);
    const observacoes = [];
    if (natureza && !['pública', 'publica', 'privada'].includes(tipo)) observacoes.push(`Natureza da instituição: ${natureza}`);
    for (const campo of campos) {
      if (mapeados.has(campo.id)) continue;
      const valor = texto(campo.id);
      if (valor) observacoes.push(`${Object.hasOwn(titulosObservacoes, campo.id) ? titulosObservacoes[campo.id] : campo.titulo}: ${valor}`);
    }
    if (respostas.imagem) observacoes.push('Uso de imagem e áudio autorizado.');
    if (observacoes.length) {
      dados.observacoes = observacoes.join('\n');
      if (Array.from(dados.observacoes).length > 1000) {
        throw new Error('As respostas complementares somam mais de 1.000 caracteres. Reduza o texto para continuar.');
      }
    }
    return dados;
  }

  return { termino, horarioDisponivel, valores, montar };
})();
