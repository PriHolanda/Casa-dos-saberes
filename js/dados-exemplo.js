// Horários locais. Disponibilidade explícita, independente da lista de eventos.
const csaDadosAgenda = (() => {
  const espacos = [
    { id: 'auditorio', nome: 'Auditório', visual: 'auditorio' },
    { id: 'quintal', nome: 'Quintal', visual: 'quintal' },
    { id: 'salas', nome: 'Salas Expositivas', visual: 'salas' },
    { id: 'varanda', nome: 'Varanda', visual: 'varanda' }
  ];
  const turnos = csaAgendaModelo.turnos;
  let eventos = [
    { id: 'evt-01', nome: 'Campeonato de Farmar Aura', espacoId: 'auditorio', inicio: '2026-09-21T09:00:00', termino: '2026-09-21T12:00:00', status: 'aceito' },
    { id: 'evt-02', nome: 'Apresentação da banda', espacoId: 'quintal', inicio: '2026-09-21T10:00:00', termino: '2026-09-21T12:00:00', status: 'aceito' },
    { id: 'evt-03', nome: 'Campeonato de FreeFire', espacoId: 'salas', inicio: '2026-09-21T14:00:00', termino: '2026-09-21T16:00:00', status: 'aceito' },
    { id: 'evt-04', nome: 'Apresentação Legal', espacoId: 'varanda', inicio: '2026-09-22T14:00:00', termino: '2026-09-22T16:00:00', status: 'pendente' },
    { id: 'evt-05', nome: 'Campeonato de Farmar Aura', espacoId: 'auditorio', inicio: '2026-09-24T09:00:00', termino: '2026-09-24T12:00:00', status: 'aceito' },
    { id: 'evt-06', nome: 'Apresentação da banda', espacoId: 'quintal', inicio: '2026-09-24T15:00:00', termino: '2026-09-24T17:00:00', status: 'aceito' },
    { id: 'evt-07', nome: 'Campeonato de FreeFire', espacoId: 'salas', inicio: '2026-09-25T09:00:00', termino: '2026-09-25T12:00:00', status: 'aceito' }
  ];
  const disponibilidade = [
    { data: '2026-09-21', turno: 'manha', espacoIds: ['salas', 'varanda'] },
    { data: '2026-09-21', turno: 'tarde', espacoIds: ['auditorio', 'quintal', 'varanda'] },
    { data: '2026-09-21', turno: 'noite', espacoIds: ['auditorio', 'quintal', 'salas', 'varanda'] },
    { data: '2026-09-22', turno: 'manha', espacoIds: ['auditorio', 'quintal', 'salas', 'varanda'] },
    { data: '2026-09-22', turno: 'tarde', espacoIds: ['auditorio', 'quintal', 'salas'] },
    { data: '2026-09-22', turno: 'noite', espacoIds: ['auditorio', 'quintal', 'salas', 'varanda'] },
    { data: '2026-09-23', turno: 'manha', espacoIds: ['auditorio', 'quintal', 'salas', 'varanda'] },
    { data: '2026-09-23', turno: 'tarde', espacoIds: ['auditorio', 'quintal', 'salas', 'varanda'] },
    { data: '2026-09-23', turno: 'noite', espacoIds: ['auditorio', 'quintal', 'salas', 'varanda'] },
    { data: '2026-09-24', turno: 'manha', espacoIds: ['quintal', 'salas', 'varanda'] },
    { data: '2026-09-24', turno: 'tarde', espacoIds: ['auditorio', 'salas', 'varanda'] },
    { data: '2026-09-24', turno: 'noite', espacoIds: ['auditorio', 'quintal', 'salas', 'varanda'] },
    { data: '2026-09-25', turno: 'manha', espacoIds: ['auditorio', 'quintal', 'varanda'] },
    { data: '2026-09-25', turno: 'tarde', espacoIds: ['auditorio', 'quintal', 'salas', 'varanda'] },
    { data: '2026-09-25', turno: 'noite', espacoIds: ['auditorio', 'quintal', 'salas', 'varanda'] },
    { data: '2026-09-26', turno: 'manha', espacoIds: ['auditorio', 'quintal', 'salas', 'varanda'] },
    { data: '2026-09-26', turno: 'tarde', espacoIds: ['auditorio', 'quintal', 'salas', 'varanda'] },
    { data: '2026-09-26', turno: 'noite', espacoIds: ['auditorio', 'quintal', 'salas', 'varanda'] }
  ];
  const copiar = csaAgendaModelo.copiar;
  const fonteLocal = {
    consultarPeriodo() { return copiar({ espacos, eventos, disponibilidade }); },
    atualizarEvento(evento) {
      const indice = eventos.findIndex(e => String(e.id) === evento.id);
      if (indice < 0) eventos.push(copiar(evento));
      else eventos[indice] = copiar(evento);
      return copiar(evento);
    },
    removerEvento(id) {
      const quantidade = eventos.length;
      eventos = eventos.filter(e => String(e.id) !== id);
      return eventos.length < quantidade;
    }
  };
  let fonte = fonteLocal;
  let catalogo = copiar(espacos);
  let numeroConsulta = 0;
  return {
    dataInicial: '2026-09-21',
    get espacos() { return copiar(catalogo); },
    get turnos() { return copiar(turnos); },
    // Adaptador futuro: consultarPeriodo({inicio, fim, fusoHorario}) ->
    // Promise<{espacos, eventos, disponibilidade}>. Sem HTTP nesta etapa.
    definirFonte(novaFonte) {
      if (!novaFonte || typeof novaFonte.consultarPeriodo !== 'function') throw new Error('Fonte de dados inválida.');
      fonte = novaFonte;
      catalogo = [];
      numeroConsulta++;
    },
    async consultarPeriodo(inicio, fim) {
      if (csaAgendaModelo.lerDia(inicio) === null || csaAgendaModelo.lerDia(fim) === null || inicio > fim) throw new Error('Período inválido.');
      const fonteConsultada = fonte;
      const consulta = ++numeroConsulta;
      const resposta = await fonteConsultada.consultarPeriodo({ inicio, fim, fusoHorario: csaAgendaModelo.configuracao.fusoHorario });
      const dados = csaAgendaModelo.normalizarDados(resposta);
      if (fonte === fonteConsultada && consulta === numeroConsulta) catalogo = copiar(dados.espacos);
      const limiteInicial = csaAgendaModelo.intervalo(inicio, turnos[0]).inicio;
      const limiteFinal = csaAgendaModelo.intervalo(fim, turnos[2]).fim;
      dados.eventos = dados.eventos.filter(e => e.inicioMs < limiteFinal && e.terminoMs > limiteInicial);
      dados.disponibilidade = dados.disponibilidade.filter(d => d.data >= inicio && d.data <= fim);
      return copiar(dados); // Consumidores nunca recebem referências à fonte.
    },
    async atualizarEvento(registro) {
      const espacosAtualizacao = copiar(catalogo);
      const evento = csaAgendaModelo.normalizarEvento(registro, espacosAtualizacao);
      if (!evento) throw new Error('Evento inválido: confira campos, espaço e horários.');
      if (typeof fonte.atualizarEvento !== 'function') throw new Error('A fonte não permite atualizar eventos.');
      const resposta = await fonte.atualizarEvento(copiar(evento));
      const atualizado = csaAgendaModelo.normalizarEvento(resposta, espacosAtualizacao);
      if (!atualizado) throw new Error('Resposta de atualização inválida.');
      return copiar(atualizado);
    },
    async removerEvento(id) {
      if ((typeof id !== 'string' || !id.trim()) && !Number.isSafeInteger(id)) throw new Error('Identificador inválido.');
      if (typeof fonte.removerEvento !== 'function') throw new Error('A fonte não permite remover eventos.');
      return fonte.removerEvento(String(id));
    }
  };
})();
