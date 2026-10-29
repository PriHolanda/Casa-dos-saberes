// Dados simulados do frontend; não representam confirmação de reserva.
const csaDadosAgenda = (() => {
  const espacos = [
    { id: 'auditorio', nome: 'Auditório', visual: 'auditorio' },
    { id: 'quintal', nome: 'Quintal', visual: 'quintal' },
    { id: 'salas', nome: 'Salas Expositivas', visual: 'salas' },
    { id: 'varanda', nome: 'Varanda', visual: 'varanda' }
  ];
  const turnos = [
    { id: 'manha', nome: 'Manhã', inicio: 0, fim: 12 },
    { id: 'tarde', nome: 'Tarde', inicio: 12, fim: 18 },
    { id: 'noite', nome: 'Noite', inicio: 18, fim: 24 }
  ];
  const eventos = [
    { id: 'evt-01', nome: 'Campeonato de Farmar Aura', espacoId: 'auditorio', inicio: '2026-09-21T09:00:00', termino: '2026-09-21T12:00:00', status: 'aceito' },
    { id: 'evt-02', nome: 'Apresentação da banda', espacoId: 'quintal', inicio: '2026-09-21T10:00:00', termino: '2026-09-21T12:00:00', status: 'aceito' },
    { id: 'evt-03', nome: 'Campeonato de FreeFire', espacoId: 'salas', inicio: '2026-09-21T14:00:00', termino: '2026-09-21T16:00:00', status: 'aceito' },
    { id: 'evt-04', nome: 'Apresentação Legal', espacoId: 'varanda', inicio: '2026-09-22T14:00:00', termino: '2026-09-22T16:00:00', status: 'pendente', solicitante: 'João Ferreira da Silva', celular: '(85) 12345-6789', publico: '100 pessoas', descricao: 'Apresentação cultural com música regional e participação da comunidade.' },
    { id: 'evt-05', nome: 'Campeonato de Farmar Aura', espacoId: 'auditorio', inicio: '2026-09-24T09:00:00', termino: '2026-09-24T12:00:00', status: 'aceito' },
    { id: 'evt-06', nome: 'Apresentação da banda', espacoId: 'quintal', inicio: '2026-09-24T15:00:00', termino: '2026-09-24T17:00:00', status: 'aceito' },
    { id: 'evt-07', nome: 'Campeonato de FreeFire', espacoId: 'salas', inicio: '2026-09-25T09:00:00', termino: '2026-09-25T12:00:00', status: 'aceito' }
  ];
  let proximoId = 8;
  function buscarEvento(id) {
    const evento = eventos.find(item => String(item.id) === String(id));
    return evento ? csaAgendaModelo.normalizarEvento(evento, espacos) : null;
  }
  function adicionarEvento(evento) {
    const novo = { ...evento, id: `evt-novo-${proximoId++}`, status: 'pendente' };
    const validado = csaAgendaModelo.normalizarEvento(novo, espacos);
    if (!validado) throw new Error('Não foi possível cadastrar: confira os dados do evento.');
    eventos.push(novo);
    return csaAgendaModelo.normalizarEvento(novo, espacos);
  }
  function atualizarStatus(id, status) {
    if (!['aceito', 'pendente'].includes(status)) throw new Error('Status de evento inválido.');
    const evento = eventos.find(item => String(item.id) === String(id));
    if (!evento) throw new Error('Evento não encontrado.');
    evento.status = status;
    return csaAgendaModelo.normalizarEvento(evento, espacos);
  }
  function removerEvento(id) {
    const indice = eventos.findIndex(item => String(item.id) === String(id));
    if (indice < 0) throw new Error('Evento não encontrado.');
    eventos.splice(indice, 1);
  }
  return {
    dataInicial: '2026-09-21', espacos, turnos,
    buscarEvento,
    adicionarEvento,
    atualizarStatus,
    removerEvento,
    consultarPeriodo(inicio, fim) {
      const primeiroDia = csaAgendaModelo.lerDia(inicio);
      const ultimoDia = csaAgendaModelo.lerDia(fim);
      if (primeiroDia === null || ultimoDia === null || primeiroDia > ultimoDia) throw new Error('Período inválido.');
      const ids = new Set();
      const selecionados = eventos
        .map(evento => csaAgendaModelo.normalizarEvento(evento, espacos))
        .filter(evento => {
          if (!evento || ids.has(evento.id)) return false;
          ids.add(evento.id);
          return evento.inicioMs < ultimoDia + 86400000 && evento.terminoMs > primeiroDia;
        });
      return {
        espacos: espacos.map(espaco => ({ ...espaco })),
        turnos: turnos.map(turno => ({ ...turno })),
        eventos: selecionados
      };
    }
  };
})();