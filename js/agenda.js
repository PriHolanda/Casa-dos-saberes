// data-evento-id/data-data/data-turno permitem integrar ações futuramente.
// Os componentes desta etapa são somente informativos.
const csaAgenda = (() => {
  const modelo = csaAgendaModelo;
  const estado = { visao: 'semanal', data: csaDadosAgenda.dataInicial, status: 'todos' };
  let numeroConsulta = 0;
  let atualizacao;
  const dias = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const escapar = valor => String(valor).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const lerData = data => new Date(modelo.lerDia(data));
  const somarDias = modelo.somarDias;
  function periodo() {
    const inicio = estado.visao === 'semanal' ? somarDias(estado.data, -((lerData(estado.data).getUTCDay() + 6) % 7)) : estado.data;
    return Array.from({ length: estado.visao === 'semanal' ? 6 : 1 }, (_, i) => somarDias(inicio, i));
  }
  function EventCard(evento, espaco) {
    if (!espaco) return '';
    const validado = modelo.normalizarEvento(evento, [espaco]);
    if (!validado) return '';
    evento = validado;
    const status = modelo.definirStatus(evento.status);
    return `<article class="csa-event-card csa-event-card--${escapar(espaco.visual)}" data-evento-id="${escapar(evento.id)}">
      <h3 class="csa-event-card__espaco">${escapar(espaco.nome)}</h3>
      <p class="csa-event-card__nome">${escapar(evento.nome)}</p>
      <p class="csa-event-card__horario">${escapar(evento.horarioInicio)} às ${escapar(evento.horarioTermino)}</p>
      <p class="csa-event-card__status csa-event-card__status--${status.visual}" title="${escapar(evento.status)}"><span aria-hidden="true"></span>${escapar(status.rotulo)}</p>
    </article>`;
  }
  function AvailabilityCard(registro, turno, temEventos, espacos) {
    const nomes = registro.espacoIds.map(id => espacos.find(e => e.id === id)?.nome).filter(Boolean).join(', ');
    const disponivel = registro.situacao === 'disponivel' && nomes.length > 0;
    const rotulo = disponivel ? 'Disponível' : registro.situacao === 'indisponivel' ? 'Indisponível' : 'Disponibilidade não informada';
    const descricao = disponivel ? `Espaços disponíveis: ${nomes}` : rotulo;
    const compacto = temEventos && disponivel;
    return `<div class="csa-disponibilidade${compacto ? ' csa-disponibilidade--compacta' : ''}" data-data="${escapar(registro.data)}" data-turno="${escapar(turno.id)}" title="${escapar(descricao)}" aria-label="${escapar(turno.nome)}: ${escapar(descricao)}">
      ${compacto ? '' : `<p class="csa-disponibilidade__titulo">${escapar(turno.nome)}<br>${rotulo}</p><svg class="csa-disponibilidade__icone" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><rect x="4" y="5" width="16" height="16" rx="2"/><path d="M4 10h16M8 2v6M16 2v6"/></svg>`}
      ${disponivel ? '<div class="csa-disponibilidade__adicionar" aria-disabled="true"><span aria-hidden="true">+</span><p>Adicionar<br>Evento</p></div>' : ''}
    </div>`;
  }
  function AgendaCell(data, turno, dados, filtro = 'todos') {
    const { inicio, fim } = modelo.intervalo(data, turno);
    const todos = dados.eventos.filter(e => e.inicioMs < fim && e.terminoMs > inicio);
    const eventos = todos.filter(e => filtro === 'todos' || e.status === filtro).sort((a, b) => a.inicioMs - b.inicioMs);
    const disponibilidade = dados.disponibilidade.find(d => d.data === data && d.turno === turno.id)
      || { data, espacoIds: [], situacao: 'nao_informada' };
    const cards = eventos.map(e => EventCard(e, dados.espacos.find(s => s.id === e.espacoId))).join('');
    // O filtro não transforma eventos ocultos em horários livres.
    const livre = AvailabilityCard(disponibilidade, turno, todos.length > 0, dados.espacos);
    const vazio = !cards && todos.length && disponibilidade.situacao !== 'disponivel'
      ? '<p class="csa-grid__vazio">Sem eventos neste filtro</p>' : '';
    return `<td class="csa-grid__celula"><div class="csa-grid__conteudo">${cards}${livre}${vazio}</div></td>`;
  }
  function AgendaGrid(datas, dados, visao = 'semanal', filtro = 'todos') {
    return `<table class="csa-grid${visao === 'diaria' ? ' csa-grid--diaria' : ''}"><caption class="csa-grid__caption">Agenda ${visao === 'diaria' ? 'diária' : 'semanal'} por dia e turno</caption>
      <thead><tr><th scope="col"><span class="csa-grid__caption">Turno</span></th>${datas.map(data => `<th scope="col"><strong>${dias[lerData(data).getUTCDay()]}</strong><span>${data.slice(8, 10)}/${data.slice(5, 7)}</span></th>`).join('')}</tr></thead>
      <tbody>${dados.turnos.map(turno => `<tr><th scope="row">${escapar(turno.nome)}</th>${datas.map(data => AgendaCell(data, turno, dados, filtro)).join('')}</tr>`).join('')}</tbody></table>`;
  }
  async function desenhar() {
    const consulta = ++numeroConsulta;
    const datas = periodo();
    const visao = estado.visao;
    const filtro = estado.status;
    const container = document.getElementById('csa-agenda');
    container.setAttribute('aria-busy', 'true');
    container.innerHTML = '<p class="csa-grid__vazio" role="status">Carregando agenda…</p>';
    const formatar = modelo.formatarDia;
    const inicio = lerData(datas[0]);
    const fim = lerData(datas[datas.length - 1]);
    const texto = estado.visao === 'diaria' ? formatar(datas[0]) :
      inicio.getUTCMonth() === fim.getUTCMonth() && inicio.getUTCFullYear() === fim.getUTCFullYear()
        ? `${inicio.getUTCDate()} a ${formatar(datas[datas.length - 1])}`
        : `${formatar(datas[0])} a ${formatar(datas[datas.length - 1])}`;
    document.getElementById('csa-data').innerHTML = `<i class="fa-regular fa-calendar" aria-hidden="true"></i> ${escapar(texto)}`;
    document.querySelectorAll('[data-visao]').forEach(botao => {
      const ativo = botao.dataset.visao === estado.visao;
      botao.classList.toggle('csa-alternador__botao--ativo', ativo);
      botao.setAttribute('aria-pressed', String(ativo));
    });
    try {
      const dados = await csaDadosAgenda.consultarPeriodo(datas[0], datas[datas.length - 1]);
      if (consulta !== numeroConsulta) return;
      const aviso = dados.avisos.length ? '<p class="csa-grid__vazio" role="status">Alguns dados inconsistentes não puderam ser exibidos.</p>' : '';
      container.innerHTML = aviso + AgendaGrid(datas, dados, visao, filtro);
    } catch {
      if (consulta !== numeroConsulta) return;
      container.innerHTML = '<p class="csa-grid__vazio" role="alert">Não foi possível carregar a agenda. Tente novamente usando os controles.</p>';
    } finally {
      if (consulta === numeroConsulta) container.setAttribute('aria-busy', 'false');
    }
  }
  function recarregar() {
    atualizacao = desenhar();
    return atualizacao;
  }
  document.addEventListener('csa:mudar-data', e => {
    if (![-1, 1].includes(e.detail?.direcao)) return;
    estado.data = somarDias(estado.data, e.detail.direcao * (estado.visao === 'semanal' ? 7 : 1));
    recarregar();
  });
  document.addEventListener('csa:mudar-visao', e => {
    if (!['diaria', 'semanal'].includes(e.detail?.visao)) return;
    estado.visao = e.detail.visao;
    recarregar();
  });
  document.addEventListener('csa:mudar-filtro', e => {
    if (!['todos', 'aceito', 'pendente'].includes(e.detail?.status)) return;
    estado.status = e.detail.status;
    recarregar();
  });
  document.addEventListener('csa:evento-atualizado', recarregar);
  recarregar();
  return { EventCard, AvailabilityCard, AgendaCell, AgendaGrid, recarregar, quandoPronta: () => atualizacao };
})();
