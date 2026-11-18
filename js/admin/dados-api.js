const csaDadosAgenda = (() => {
  // A API aceita um identificador inteiro; o catálogo ainda não possui rota própria.
  const espacos = [
    { id: '1', nome: 'Auditório', visual: 'auditorio' },
    { id: '2', nome: 'Quintal', visual: 'quintal' },
    { id: '3', nome: 'Salas Expositivas', visual: 'salas' },
    { id: '4', nome: 'Varanda', visual: 'varanda' }
  ];
  const turnos = [
    { id: 'manha', nome: 'Manhã', inicio: 0, fim: 12 },
    { id: 'tarde', nome: 'Tarde', inicio: 12, fim: 18 },
    { id: 'noite', nome: 'Noite', inicio: 18, fim: 24 }
  ];
  let eventos = [];
  const statusPersistidos = new Set();
  function dataCivil(valor) {
    if (!/(Z|[+-]\d\d:\d\d)$/.test(valor)) return valor.slice(0, 19);
    const data = new Date(valor);
    const partes = new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Fortaleza', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).format(data);
    return partes.replace(' ', 'T');
  }
  function adaptar(item) {
    if (['aceito', 'pendente'].includes(item.status)) statusPersistidos.add(String(item.id));
    else statusPersistidos.delete(String(item.id));
    const espacoId = String(item.espaco_id);
    if (!espacos.some(e => e.id === espacoId)) throw new Error(`O evento ${item.id} possui um espaço inválido.`);
    const evento = csaAgendaModelo.normalizarEvento({
      id: item.id, nome: item.titulo, descricao: item.descricao,
      inicio: dataCivil(item.data_inicio), termino: dataCivil(item.data_fim),
      espacoId, solicitante: item.responsavel || '',
      publico: item.publico_estimado == null ? '' : String(item.publico_estimado),
      classificacao: item.classificacao_indicativa || '', celular: item.celular || '',
      status: item.status || 'pendente'
    }, espacos);
    if (!evento) throw new Error(`O evento ${item.id} possui datas ou dados inválidos. Corrija-o no backend.`);
    return evento;
  }
  function payload(evento) {
    return { status: evento.status || 'pendente', celular: evento.celular || null, titulo: evento.nome, descricao: evento.descricao, data_inicio: evento.inicio, data_fim: evento.termino,
      espaco_id: Number(evento.espacoId), responsavel: evento.solicitante || null,
      publico_estimado: evento.publico === '' ? null : Number(evento.publico), classificacao_indicativa: evento.classificacao || null };
  }
  async function carregar() {
    const resultado = await csaApi.requisitar('/eventos/');
    const novos = resultado.eventos.map(adaptar);
    eventos = novos;
  }
  async function salvar(evento, id) {
    const novo = adaptar(await csaApi.requisitar(id ? `/eventos/${encodeURIComponent(id)}` : '/eventos/', { metodo: id ? 'PUT' : 'POST', dados: payload(evento) }));
    eventos = eventos.filter(e => e.id !== novo.id).concat(novo);
    return novo;
  }
  return {
    dataInicial: new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Fortaleza' }).format(new Date()),
    espacos, turnos, carregar, salvar, diasSemana: 7,
    buscarEvento: id => eventos.find(e => e.id === String(id)),
    async atualizarStatus(id, status) {
      const evento = eventos.find(e => e.id === String(id));
      if (!evento) throw new Error('Evento não encontrado.');
      if (!['aceito', 'pendente'].includes(status)) throw new Error('Status inválido.');
      if (!statusPersistidos.has(String(id))) {
        throw new Error('A API ainda não salva o status do evento. Aplique o ajuste de status no backend e recarregue a página para aprovar.');
      }
      const resposta = await csaApi.requisitar(`/eventos/${encodeURIComponent(id)}`, {
        metodo: 'PUT', dados: payload({ ...evento, status })
      });
      if (resposta.status !== status) throw new Error('A API não confirmou a alteração de status. Recarregue a página.');
      const atualizado = adaptar(resposta);
      eventos = eventos.map(e => e.id === String(id) ? atualizado : e);
      return atualizado;
    },
    async removerEvento(id) {
      await csaApi.requisitar(`/eventos/${encodeURIComponent(id)}`, { metodo: 'DELETE' });
      eventos = eventos.filter(e => e.id !== String(id));
    },
    consultarPeriodo(inicio, fim) {
      const de = csaAgendaModelo.lerDia(inicio), ate = csaAgendaModelo.lerDia(fim) + 86400000;
      return { espacos, turnos, eventos: eventos.filter(e => e.inicioMs < ate && e.terminoMs > de) };
    }
  };
})();
