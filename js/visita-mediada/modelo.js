const csaVisitasModelo = (() => {
  const demonstracao = new URLSearchParams(location.search).get('demo') === '1' && ['localhost', '127.0.0.1', '[::1]', ''].includes(location.hostname);
  const chaveFormulario = demonstracao ? 'csa:formulario-visita:demo:1' : 'csa:formulario-visita:1';
  const chaveExposicoes = demonstracao ? 'csa:exposicoes:demo:1' : 'csa:exposicoes:1';
  const salas = ['Sala expositiva 1', 'Sala expositiva 2', 'Corredor', 'Varanda'];
  const modelo = {
    nome: 'Exposição X', descricao: 'Uma exposição legal que vai trazer alegria alegria alegria alegria alegria e felicidade felicidade.',
    classificacao: '14 anos', pausada: false
  };
  const campos = [
    { id: 'responsavel', titulo: 'Responsável pela visita', dica: 'Nome' },
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
    const lista = lerLista(chaveFormulario, campos, dados => dados.every(campo => typeof campo?.id === 'string' && typeof campo.titulo === 'string' && (!campo.opcoes || (Array.isArray(campo.opcoes) && campo.opcoes.every(opcao => typeof opcao === 'string')))));
    for (const id of ['responsavel', 'telefone', 'email', 'quantidade']) {
      if (!lista.some(campo => campo.id === id)) lista.push(structuredClone(campos.find(campo => campo.id === id)));
    }
    return lista;
  }

  function exposicoes() {
    const vazia = { nome: '', descricao: '', classificacao: '', pausada: true };
    return lerLista(chaveExposicoes, salas.map(() => demonstracao ? modelo : vazia), dados => dados.length === salas.length && dados.every(item => typeof item?.nome === 'string')).map(item => !demonstracao && item.nome === modelo.nome && item.descricao === modelo.descricao ? { ...vazia } : item);
  }

  function status(valor) {
    if (valor === 'aprovada' || valor === 'aceito') return { valor: 'aceito', rotulo: 'Aceito' };
    if (valor === 'pendente') return { valor: 'pendente', rotulo: 'Pendente' };
    if (valor === 'negada') return { valor: 'negada', rotulo: 'Negada' };
    if (valor === 'cancelada') return { valor: 'cancelada', rotulo: 'Cancelada' };
    return { valor: 'desconhecido', rotulo: 'Status desconhecido' };
  }

  function dataCivil(valor) {
    if (typeof valor !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})?$/.test(valor)) return null;
    const civil = valor.slice(0, 19).padEnd(19, ':00');
    const instante = new Date(`${civil}Z`);
    if (!Number.isFinite(instante.getTime()) || instante.toISOString().slice(0, 19) !== civil) return null;
    if (!/(Z|[+-]\d{2}:\d{2})$/.test(valor)) return civil;
    const data = new Date(valor);
    if (!Number.isFinite(data.getTime())) return null;
    return new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Fortaleza', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).format(data).replace(' ', 'T');
  }

  function normalizarVisita(visita) {
    if (!visita || !['string', 'number'].includes(typeof visita.id) || !String(visita.id).trim()) throw new Error('A resposta contém uma visita sem identificador.');
    const inicio = dataCivil(visita.data_inicio);
    const fim = dataCivil(visita.data_fim);
    if (!inicio || !fim || fim <= inicio) throw new Error('A resposta contém uma visita com datas ou horários inválidos.');
    return { ...visita, id: String(visita.id), data_inicio: inicio, data_fim: fim };
  }

  return { chaveFormulario, chaveExposicoes, salas, campos, formulario, exposicoes, status, dataCivil, normalizarVisita, demonstracao };
})();
