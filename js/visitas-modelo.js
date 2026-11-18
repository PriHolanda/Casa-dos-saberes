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

  function lerLista(chave, padrao, validar) {
    try {
      const dados = JSON.parse(localStorage.getItem(chave));
      if (Array.isArray(dados) && validar(dados)) return dados;
    } catch { /* Usa o conteúdo inicial quando o armazenamento está indisponível. */ }
    return structuredClone(padrao);
  }

  function formulario() {
    return lerLista(chaveFormulario, campos, dados => dados.every(campo => typeof campo?.id === 'string' && typeof campo.titulo === 'string'));
  }

  function exposicoes() {
    return lerLista(chaveExposicoes, salas.map(() => modelo), dados => dados.length === salas.length && dados.every(item => typeof item?.nome === 'string'));
  }

  return { chaveFormulario, chaveExposicoes, salas, campos, formulario, exposicoes };
})();
