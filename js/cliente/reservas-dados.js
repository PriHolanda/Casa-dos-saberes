// Fonte local da definição. A futura API entra aqui, sem alterar os componentes.
const csaDadosReservas = (() => {
  const formulario = {
    id: 'reservas',
    versao: 1,
    perguntas: [
      { id: 'responsavel', tipo: 'aberta', titulo: 'Responsável pelo agendamento', descricao: 'Nome',
        mobile: { descricao: 'Digite o nome' },
        campo: 'text', autocomplete: 'name', obrigatoria: true, limite: 255, coluna: 'principal', ordem: 10 },
      { id: 'telefone', tipo: 'aberta', titulo: 'Telefone para contato', descricao: '(xx) x xxxx-xxxx',
        mobile: { descricao: '(XX) X XXXX-XXXX' },
        campo: 'tel', autocomplete: 'tel', obrigatoria: true, limite: 25, coluna: 'principal', ordem: 20 },
      { id: 'email', tipo: 'aberta', titulo: 'E-mail', descricao: 'loremipsum@gmail.com',
        mobile: { descricao: 'exemplo@gmail.com' },
        campo: 'email', autocomplete: 'email', obrigatoria: true, limite: 254, coluna: 'principal', ordem: 30 },
      { id: 'instituicao', tipo: 'aberta', titulo: 'Instituição, grupo ou coletivo', descricao: 'Digite aqui',
        mobile: { descricao: 'Digite aqui.' },
        campo: 'text', autocomplete: 'organization', obrigatoria: true, limite: 255, coluna: 'principal', ordem: 40 },
      { id: 'segmentos', tipo: 'escolha', titulo: 'Com qual segmento sua proposta dialoga?', descricao: '',
        multipla: true, obrigatoria: true, coluna: 'principal', ordem: 50,
        opcoes: [
          { id: 'teatro', titulo: 'Teatro' }, { id: 'musica', titulo: 'Música' },
          { id: 'artes-visuais', titulo: 'Artes visuais' }, { id: 'audiovisual', titulo: 'Audiovisual' },
          { id: 'gestao-cultural', titulo: 'Gestão cultural' }, { id: 'danca', titulo: 'Dança' },
          { id: 'outro', titulo: 'Outro' }
        ] },
      { id: 'pautas', tipo: 'escolha', titulo: 'Com qual pauta sua proposta dialoga?', descricao: '',
        multipla: true, obrigatoria: true, coluna: 'principal', ordem: 60,
        opcoes: [
          { id: 'racial', titulo: 'Racial' }, { id: 'social', titulo: 'Social' },
          { id: 'indigena', titulo: 'Indígena' }, { id: 'pcd', titulo: 'Pessoas com deficiência' },
          { id: 'lgbtqiap', titulo: 'Comunidade LGBTQIAP+' }, { id: 'outro', titulo: 'Outro' }
        ] },
      { id: 'periodicidade', tipo: 'escolha', titulo: 'Qual a periodicidade da sua atividade?', descricao: '',
        multipla: false, obrigatoria: true, coluna: 'principal', ordem: 70,
        opcoes: [
          { id: 'semanal', titulo: 'Semanal' }, { id: 'mensal', titulo: 'Mensal' },
          { id: 'unica', titulo: 'Somente na data escolhida' }
        ] },
      { id: 'classificacao', tipo: 'escolha', titulo: 'Qual a classificação indicativa da sua atividade?', descricao: '',
        mobile: { titulo: 'Qual a classificação indicativa?' },
        multipla: false, obrigatoria: true, coluna: 'principal', ordem: 80,
        opcoes: [
          { id: 'livre', titulo: 'Livre' }, { id: '10', titulo: '10 anos' },
          { id: '12', titulo: '12 anos' }, { id: '14', titulo: '14 anos' },
          { id: '16', titulo: '16 anos' }, { id: '18', titulo: '18 anos' }
        ] },
      { id: 'publico', tipo: 'aberta', titulo: 'Público estimado', descricao: 'Ex: 80',
        mobile: { descricao: 'Digite aqui' },
        campo: 'number', minimo: 1, obrigatoria: true, coluna: 'principal', ordem: 90 },
      { id: 'proposta', tipo: 'anexo',
        titulo: 'Anexe a sua proposta em formato PDF ou o link para a proposta para que tenhamos acesso a mais detalhes',
        descricao: 'Precisamos do máximo de informações possíveis para ter uma dimensão do que está sendo proposto.',
        mobile: {
          titulo: 'Anexe a sua proposta em formato PDF ou o link para a proposta.\npara que tenhamos acesso a mais detalhes',
          descricao: 'Apresentar a proposta em detalhes. Precisamos do máximo de informações possíveis para ter uma dimensão do que está sendo proposto.'
        },
        obrigatoria: true, aceita: '.pdf,application/pdf', limiteBytes: 10 * 1024 * 1024,
        coluna: 'complementar', ordem: 10 },
      { id: 'link-proposta', tipo: 'aberta', titulo: 'Link da proposta', descricao: 'Cole o link aqui (Opcional)',
        mobile: { descricao: 'Cole o link aqui. (Opcional)' },
        tituloVisivel: false, campo: 'url', obrigatoria: false, limite: 2048, coluna: 'complementar', ordem: 20 },
      { id: 'ciencia-analise', tipo: 'termo', titulo: 'Termo de Ciência sobre Análise e Aprovação da solicitação', descricao: '',
        texto: 'Declaro estar ciente de que esta solicitação não garante a realização do evento, estando sua análise e aprovação sujeitas à avaliação da gestão do espaço cultural solicitado, que poderá autorizar, negar ou solicitar ajustes à proposta.',
        obrigatoria: true, coluna: 'complementar', ordem: 30 },
      { id: 'ciencia-logos', tipo: 'termo', titulo: 'Termo de Ciência sobre Uso da Régua de Logos Institucional', descricao: '',
        texto: 'Declaro estar ciente de que, em caso de aprovação da presente solicitação, deverá ser utilizado em todos os materiais de divulgação (como cards, flyers, pôsteres e/ou publicações) o uso obrigatório da régua de logos padrão do equipamento cultural, conforme disponibilizado.',
        obrigatoria: true, coluna: 'complementar', ordem: 40 }
    ],
    // Regras entre perguntas são declarativas e também podem vir da API.
    alternativasObrigatorias: [{ ids: ['proposta', 'link-proposta'], mensagem: 'Adicione a proposta em PDF ou informe um link para ela.' }]
  };

  async function consultarFormulario(id = 'reservas') {
    if (id !== formulario.id) throw new Error('Formulário não encontrado.');
    return structuredClone(formulario);
  }

  async function consultarPergunta(formularioId, perguntaId) {
    const definicao = await consultarFormulario(formularioId);
    const pergunta = definicao.perguntas.find(item => item.id === perguntaId);
    if (!pergunta) throw new Error('Pergunta não encontrada.');
    return pergunta;
  }

  return { consultarFormulario, consultarPergunta };
})();
