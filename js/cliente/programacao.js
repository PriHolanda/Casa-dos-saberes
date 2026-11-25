const csaProgramacao = (() => {
  const { espacos, lerDia, lerDataHora, dataCivil, normalizarEvento } = csaAgendaModelo;
  const turnos = {
    morning: { nome: 'Manhã', inicio: '09:00', fim: '12:00' },
    afternoon: { nome: 'Tarde', inicio: '14:00', fim: '17:00' },
    night: { nome: 'Noite', inicio: '18:00', fim: '21:00' }
  };
  const minuto = 60000;
  const hora = 60 * minuto;

  function lerReserva(parametros) {
    const espaco = espacos.find(item => item.id === parametros.get('espacoId'));
    const data = parametros.get('data');
    const turno = parametros.get('turno');
    if (!espaco || lerDia(data) === null || !Object.hasOwn(turnos, turno)) return null;
    const reserva = { espacoId: espaco.id, data, turno };
    if (!parametros.has('inicio') && !parametros.has('fim')) return reserva;
    const inicio = parametros.get('inicio');
    const fim = parametros.get('fim');
    if (![inicio, fim].every(valor => /^\d\d:\d\d$/.test(valor ?? '') && Number.isFinite(lerDataHora(`${data}T${valor}`))) || fim <= inicio) return null;
    return { ...reserva, inicio, fim };
  }

  function parametrosReserva(reserva) {
    return new URLSearchParams(reserva || {}).toString();
  }

  function horarioReserva(reserva) {
    return reserva.inicio ? reserva : turnos[reserva.turno];
  }

  async function consultarDisponibilidade(data, espacoId) {
    const busca = new URLSearchParams({ data, espaco_id: espacoId });
    const resposta = await csaApi.requisitar(`/disponibilidade?${busca}`, { autenticado: false });
    const { duracao_minima_horas: minima, duracao_maxima_horas: maxima } = resposta || {};
    if (resposta?.data !== data || String(resposta.espaco_id) !== String(espacoId)
      || !Array.isArray(resposta.horarios_reservaveis) || !Number.isFinite(minima) || !Number.isFinite(maxima) || minima <= 0 || maxima < minima) {
      throw new Error('Não foi possível consultar os horários disponíveis.');
    }
    const janelas = resposta.horarios_reservaveis.map(janela => {
      const inicio = lerDataHora(dataCivil(janela?.data_inicio));
      const fim = lerDataHora(dataCivil(janela?.data_fim));
      if (!Number.isFinite(inicio) || !Number.isFinite(fim) || fim <= inicio) throw new Error('A disponibilidade contém um horário inválido.');
      return { inicio, fim };
    });
    return { janelas, minima: minima * hora, maxima: maxima * hora };
  }

  function opcoesReserva(disponibilidade, agora = Date.now()) {
    const horaLocal = 3 * hora;
    const primeiroMinuto = Math.floor((agora - horaLocal) / minuto) * minuto + minuto;
    const formatar = valor => new Date(valor).toISOString().slice(11, 16);
    return disponibilidade.janelas.flatMap(janela => {
      const inicio = Math.max(primeiroMinuto, Math.ceil(janela.inicio / minuto) * minuto);
      const fim = Math.min(Math.floor(janela.fim / minuto) * minuto, inicio + disponibilidade.maxima);
      if (fim - inicio < disponibilidade.minima) return [];
      const h = new Date(inicio).getUTCHours();
      return [{ turno: h < 12 ? 'morning' : h < 18 ? 'afternoon' : 'night', inicio: formatar(inicio), fim: formatar(fim) }];
    });
  }

  async function confirmarDisponibilidade(reserva) {
    const { inicio, fim } = horarioReserva(reserva);
    const inicioMs = lerDataHora(`${reserva.data}T${inicio}`);
    const fimMs = lerDataHora(`${reserva.data}T${fim}`);
    const { janelas, minima, maxima } = await consultarDisponibilidade(reserva.data, reserva.espacoId);
    if (inicioMs + 3 * hora <= Date.now() || fimMs - inicioMs < minima || fimMs - inicioMs > maxima
      || !janelas.some(janela => janela.inicio <= inicioMs && janela.fim >= fimMs)) {
      throw new Error('Esse horário não está mais disponível. Volte à agenda e escolha outro.');
    }
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
      return { ...evento, ocorrenciaId: item.ocorrencia_id };
    }).sort((a, b) => a.inicioMs - b.inicioMs || a.nome.localeCompare(b.nome, 'pt-BR'));
  }

  return { turnos, lerReserva, parametrosReserva, horarioReserva, consultarEventos, consultarDisponibilidade, opcoesReserva, confirmarDisponibilidade };
})();
