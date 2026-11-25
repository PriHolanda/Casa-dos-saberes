const csaVisitasModelo = (() => {
  const chaveFormulario = 'csa:formulario-visita:1';
  const chaveExposicoes = 'csa:exposicoes:1';
  const salas = ['Sala expositiva 1', 'Sala expositiva 2', 'Corredor', 'Varanda'];
  const modelo = {
    nome: 'Exposição X', descricao: 'Uma exposição legal que vai trazer alegria alegria alegria alegria alegria e felicidade felicidade.',
    classificacao: '14 anos', pausada: false
  };
  const campos = [
    { id: 'responsavel', titulo: 'Responsável pelo visita', dica: 'Nome' },
    { id: 'telefone', titulo: 'Telefone do responsável', dica: '(xx) x xxxx-xxxx' },
    { id: 'email', titulo: 'E-mail do responsável', dica: 'loremipsum@gmail.com', email: true },
    { id: 'formacao', titulo: 'Formação do responsável' },
    { id: 'disciplina', titulo: 'Disciplina que ministra' },
    { id: 'instituicao', titulo: 'Nome da Instituição' },
    { id: 'natureza', titulo: 'Natureza da Instituição', opcoes: ['Municipal', 'Estadual', 'Federal', 'Privada', 'ONG', 'Outro'], outro: true },
    { id: 'escolaridade', titulo: 'Grau de escolaridade', opcoes: ['Ensino infantil', 'Ensino fundamental', 'Ensino médio', 'Ensino superior', 'Outro'], outro: true },
    { id: 'curso', titulo: 'Para o ensino superior: qual o curso e o semestre da turma?', opcional: true },
    { id: 'trabalho', titulo: 'O grupo está trabalhando ou pretende trabalhar alguma questão em sala de aula referente as exposições, há interesse em algum tema específico que a mediação possa contribuir de alguma forma? Conte-nos como.' },
    { id: 'quantidade', titulo: 'Quantidade de pessoas:', complementar: true },
    { id: 'faixaEtaria', titulo: 'Faixa etária', complementar: true },
    { id: 'grupo', titulo: 'O grupo na maioria é composto por:', complementar: true, outro: true, opcoes: ['Pessoas idosas', 'Pessoas com deficiência', 'Bebês e crianças de colo', 'Crianças', 'Adolescentes', 'Pessoas em situação de vulnerabilidade social', 'Adultos', 'Outro'] },
    { id: 'acessibilidade', titulo: 'O grupo terá pessoas com deficiência?', complementar: true, multipla: true, opcoes: ['Não', 'Pessoa com deficiência visual e baixa visão', 'Pessoa com deficiência física', 'Pessoa com deficiência intelectual', 'Pessoa surda e sinalizante', 'Pessoa com deficiência auditiva e não sinalizante', 'Pessoa com paralisia cerebral', 'Pessoa com baixa mobilidade', 'Pessoa com doenças raras', 'Pessoa ostomizada', 'Outro'] },
    { id: 'quantidadePcd', titulo: 'Número de pessoas com deficiência', complementar: true },
    { id: 'primeiraVisita', titulo: 'É a primeira vez que a turma visita a Casa de Saberes Cego Aderaldo?', complementar: true },
    { id: 'objetivo', titulo: 'Qual o objetivo da visita à Casa de Saberes Cego Aderaldo, bem como a exposição?', complementar: true },
    { id: 'preparacao', titulo: 'Foi realizada alguma atividade de preparação da turma para a visitação ao equipamento? Se sim, descreva', complementar: true }
  ];

  const obrigatorios = ['responsavel', 'telefone', 'email', 'quantidade'];

  function lerLegado(chave) {
    try {
      const dados = JSON.parse(localStorage.getItem(chave));
      return Array.isArray(dados) ? dados : null;
    } catch { return null; }
  }

  function formularioLocal() {
    const dados = lerLegado(chaveFormulario);
    return dados?.every(campo => typeof campo?.id === 'string' && typeof campo.titulo === 'string') ? dados : null;
  }

  function exposicaoLocal(salaId) {
    const dados = lerLegado(chaveExposicoes);
    const exposicao = dados?.[salaId - 1];
    return typeof exposicao?.nome === 'string' ? exposicao : null;
  }

  function exposicoesDemo() {
    return salas.map((sala, indice) => ({ ...modelo, sala, sala_id: indice + 1 }));
  }

  function completarFormulario(definicao) {
    const necessarios = definicao.some(campo => campo.id === 'acessibilidade')
      ? [...obrigatorios, 'quantidadePcd']
      : obrigatorios;
    const ids = new Set(definicao.map(campo => campo.id));
    return [...definicao, ...necessarios.filter(id => !ids.has(id)).map(id => campos.find(campo => campo.id === id))];
  }

  return { salas, campos, obrigatorios, formularioLocal, exposicaoLocal, exposicoesDemo, completarFormulario };
})();
