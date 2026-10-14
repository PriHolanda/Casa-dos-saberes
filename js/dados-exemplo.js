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
    { id: 'evt-04', nome: 'Apresentação Legal', espacoId: 'varanda', inicio: '2026-09-22T14:00:00', termino: '2026-09-22T16:00:00', status: 'pendente' },
    { id: 'evt-05', nome: 'Campeonato de Farmar Aura', espacoId: 'auditorio', inicio: '2026-09-24T09:00:00', termino: '2026-09-24T12:00:00', status: 'aceito' },
    { id: 'evt-06', nome: 'Apresentação da banda', espacoId: 'quintal', inicio: '2026-09-24T15:00:00', termino: '2026-09-24T17:00:00', status: 'aceito' },
    { id: 'evt-07', nome: 'Campeonato de FreeFire', espacoId: 'salas', inicio: '2026-09-25T09:00:00', termino: '2026-09-25T12:00:00', status: 'aceito' }
  ];
  return {
    dataInicial: '2026-09-21', espacos, turnos,
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