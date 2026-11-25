const csaDashboard = (() => {
  let visitas = null;
  let falha = '';
  let eventosCarregados = false;
  let semana = '';
  const aviso = document.getElementById('csa-dashboard-aviso');
  const escapar = valor => String(valor ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function consultarPeriodo(inicio, fim) {
    return (visitas || []).filter(visita => visita.data_inicio < `${csaAgendaModelo.somarDias(fim, 1)}T00:00:00` && visita.data_fim > `${inicio}T00:00:00`);
  }

  function atualizar(data) {
    semana = data || semana;
    if (!semana) return;
    const dia = new Date(csaAgendaModelo.lerDia(semana));
    const inicio = csaAgendaModelo.somarDias(semana, -((dia.getUTCDay() + 6) % 7));
    const fim = csaAgendaModelo.somarDias(inicio, 6);
    const eventos = csaDadosAgenda.consultarPeriodo(inicio, fim).eventos;
    const registros = consultarPeriodo(inicio, fim);
    const completo = eventosCarregados && visitas !== null;
    const valores = {
      total: completo ? eventos.length + registros.length : '—',
      pautas: eventosCarregados ? eventos.filter(evento => evento.origem === 'solicitacao_publica').length : '—',
      visitas: visitas !== null ? registros.length : '—',
      pendentes: completo ? eventos.filter(evento => evento.status === 'pendente').length + registros.filter(visita => csaVisitasModelo.status(visita.status).valor === 'pendente').length : '—'
    };
    for (const [id, valor] of Object.entries(valores)) {
      const no = document.getElementById(`csa-indicador-${id}`);
      no.textContent = valor;
      const periodo = `Semana de ${csaAgendaModelo.formatarDia(inicio)} a ${csaAgendaModelo.formatarDia(fim)}.`;
      no.title = id === 'pautas' ? `${periodo} Solicitações de origem pública identificada.` : periodo;
    }
    aviso.textContent = falha;
  }

  async function carregar() {
    try {
      const resposta = csaDadosAgenda.demonstracao ? { visitas: csaDadosAgenda.consultarVisitasDemonstracao() } : await csaApi.requisitar('/visitas/');
      if (!Array.isArray(resposta?.visitas)) throw new Error('A resposta não contém uma lista de visitas.');
      const registros = resposta.visitas.map(csaVisitasModelo.normalizarVisita);
      if (new Set(registros.map(visita => visita.id)).size !== registros.length) throw new Error('A resposta contém visitas duplicadas.');
      visitas = registros;
      falha = '';
    } catch (erro) {
      visitas = null;
      falha = `Visitas indisponíveis: ${erro.message} A agenda de eventos permanece disponível; totais conjuntos não foram calculados.`;
    }
    atualizar();
  }

  function cartao(visita) {
    const status = csaVisitasModelo.status(visita.status);
    return `<button type="button" class="csa-event-card csa-event-card--visita" data-visita-id="${escapar(visita.id)}" aria-label="Ver visita de ${escapar(visita.instituicao || visita.nome_responsavel || 'Responsável não informado')}"><h3 class="csa-event-card__espaco">Visita Mediada</h3><p class="csa-event-card__nome">${escapar(visita.instituicao || visita.nome_responsavel || 'Responsável não informado')}</p><p class="csa-event-card__horario">${visita.data_inicio.slice(11, 16)} às ${visita.data_fim.slice(11, 16)}</p><p class="csa-event-card__status csa-event-card__status--${status.valor}"><span aria-hidden="true"></span>${status.rotulo}</p></button>`;
  }

  document.getElementById('csa-agenda').addEventListener('click', evento => {
    const cartao = evento.target.closest('[data-visita-id]');
    if (!cartao) return;
    evento.preventDefault();
    csaPainel.mostrarVisita(visitas?.find(visita => visita.id === cartao.dataset.visitaId));
  });

  return { carregar, atualizar, consultarPeriodo, cartao, eventosProntos() { eventosCarregados = true; atualizar(); } };
})();
