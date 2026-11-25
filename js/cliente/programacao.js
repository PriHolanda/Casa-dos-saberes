const csaProgramacao = (() => {
  const { espacos, lerDia, dataCivil, normalizarEvento } = csaAgendaModelo;
  // Janelas de solicitação já apresentadas na agenda pública.
  const turnos = {
    morning: { nome: 'Manhã', inicio: '09:00', fim: '12:00' },
    afternoon: { nome: 'Tarde', inicio: '14:00', fim: '17:00' }
  };

  function lerReserva(parametros) {
    const espaco = espacos.find(item => item.id === parametros.get('espacoId'));
    const data = parametros.get('data');
    const turno = parametros.get('turno');
    if (!espaco || lerDia(data) === null || !Object.hasOwn(turnos, turno)) return null;
    return { espacoId: espaco.id, data, turno };
  }

  function parametrosReserva(reserva) {
    return new URLSearchParams(reserva || {}).toString();
  }

  async function consultarEventos() {
    const resposta = await csaApi.requisitar('/eventos/aceitos', { autenticado: false });
    if (!Array.isArray(resposta?.eventos)) throw new Error('Não foi possível consultar a programação.');
    return resposta.eventos.filter(item => item?.status === 'aceito').map(item => {
      const evento = normalizarEvento({
        id: item.id, nome: item.titulo, descricao: item.descricao,
        inicio: dataCivil(item.data_inicio), termino: dataCivil(item.data_fim),
        espacoId: item.espaco_id, status: item.status, classificacao: item.classificacao_indicativa
      }, espacos);
      if (!evento) throw new Error('A programação contém dados inválidos.');
      return evento;
    }).sort((a, b) => a.inicioMs - b.inicioMs || a.nome.localeCompare(b.nome, 'pt-BR'));
  }

  return { turnos, lerReserva, parametrosReserva, consultarEventos };
})();
