// data-evento-id/data-data/data-turno permitem integrar ações futuramente.
// Os componentes desta etapa são somente informativos.
const csaAgenda = (() => {
  const modelo = csaAgendaModelo;
  const estado = { visao: 'semanal', data: csaDadosAgenda.dataInicial, status: 'todos' };
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
    return `<article class="csa-event-card csa-event-card--${escapar(espaco.visual)}" data-evento-id="${escapar(evento.id)}" role="button" tabindex="0" aria-label="Ver detalhes de ${escapar(evento.nome)}">
      <h3 class="csa-event-card__espaco">${escapar(espaco.nome)}</h3>
      <p class="csa-event-card__nome">${escapar(evento.nome)}</p>
      <p class="csa-event-card__horario">${escapar(evento.horarioInicio)} às ${escapar(evento.horarioTermino)}</p>
      <p class="csa-event-card__status csa-event-card__status--${status.visual}" title="${escapar(evento.status)}"><span aria-hidden="true"></span>${escapar(status.rotulo)}</p>
    </article>`;
  }
  // Disponibilidade apenas visual: não confirma que um espaço pode ser reservado.
  function AvailabilityCard(registro, turno, temEventos) {
    return `<div class="csa-disponibilidade${temEventos ? ' csa-disponibilidade--compacta' : ''}" data-data="${escapar(registro.data)}" data-turno="${escapar(turno.id)}" aria-label="${escapar(turno.nome)}: Disponível">
      ${temEventos ? '' : `<p class="csa-disponibilidade__titulo">${escapar(turno.nome)}<br>Disponível</p><svg class="csa-disponibilidade__icone" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><rect x="4" y="5" width="16" height="16" rx="2"/><path d="M4 10h16M8 2v6M16 2v6"/></svg>`}
      <button type="button" class="csa-disponibilidade__adicionar" data-acao="adicionar-evento" aria-label="Adicionar evento em ${escapar(registro.data)}, turno ${escapar(turno.nome)}"><span aria-hidden="true">+</span><p>Adicionar<br>Evento</p></button>
    </div>`;
  }
  function AgendaCell(data, turno, dados, filtro = 'todos') {
    const { inicio, fim } = modelo.intervalo(data, turno);
    const todos = dados.eventos.filter(e => e.inicioMs < fim && e.terminoMs > inicio);
    const eventos = todos.filter(e => filtro === 'todos' || e.status === filtro).sort((a, b) => a.inicioMs - b.inicioMs);
    const cards = eventos.map(e => EventCard(e, dados.espacos.find(s => s.id === e.espacoId))).join('');
    // Eventos ocultos pelo filtro preservam a variante compacta da célula.
    const livre = AvailabilityCard({ data }, turno, todos.length > 0);
    return `<td class="csa-grid__celula"><div class="csa-grid__conteudo">${cards}${livre}</div></td>`;
  }
  function AgendaGrid(datas, dados, visao = 'semanal', filtro = 'todos') {
    return `<table class="csa-grid${visao === 'diaria' ? ' csa-grid--diaria' : ''}"><caption class="csa-grid__caption">Agenda ${visao === 'diaria' ? 'diária' : 'semanal'} por dia e turno</caption>
      <thead><tr><th scope="col"><span class="csa-grid__caption">Turno</span></th>${datas.map(data => `<th scope="col"><strong>${dias[lerData(data).getUTCDay()]}</strong><span>${data.slice(8, 10)}/${data.slice(5, 7)}</span></th>`).join('')}</tr></thead>
      <tbody>${dados.turnos.map(turno => `<tr><th scope="row">${escapar(turno.nome)}</th>${datas.map(data => AgendaCell(data, turno, dados, filtro)).join('')}</tr>`).join('')}</tbody></table>`;
  }
  function desenhar() {
    const datas = periodo();
    const visao = estado.visao;
    const filtro = estado.status;
    const container = document.getElementById('csa-agenda');
    const dados = csaDadosAgenda.consultarPeriodo(datas[0], datas[datas.length - 1]);
    container.innerHTML = AgendaGrid(datas, dados, visao, filtro);
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
  }
  document.addEventListener('csa:mudar-data', e => {
    if (![-1, 1].includes(e.detail?.direcao)) return;
    estado.data = somarDias(estado.data, e.detail.direcao * (estado.visao === 'semanal' ? 7 : 1));
    desenhar();
  });
  document.addEventListener('csa:mudar-visao', e => {
    if (!['diaria', 'semanal'].includes(e.detail?.visao)) return;
    estado.visao = e.detail.visao;
    desenhar();
  });
  document.addEventListener('csa:mudar-filtro', e => {
    if (!['todos', 'aceito', 'pendente'].includes(e.detail?.status)) return;
    estado.status = e.detail.status;
    desenhar();
  });
  document.addEventListener('csa:evento-atualizado', desenhar);
  document.getElementById('csa-agenda').addEventListener('click', e => {
    const evento = e.target.closest('[data-evento-id]');
    if (evento) {
      document.dispatchEvent(new CustomEvent('csa:abrir-detalhes', { detail: { id: evento.dataset.eventoId } }));
      return;
    }
    const adicionar = e.target.closest('[data-acao="adicionar-evento"]');
    if (adicionar) {
      const disponibilidade = adicionar.closest('.csa-disponibilidade');
      document.dispatchEvent(new CustomEvent('csa:abrir-cadastro', {
        detail: { data: disponibilidade.dataset.data, turno: disponibilidade.dataset.turno }
      }));
    }
  });
  document.getElementById('csa-agenda').addEventListener('keydown', e => {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('[data-evento-id]')) {
      e.preventDefault();
      e.target.click();
    }
  });
  desenhar();
  return { EventCard, AvailabilityCard, AgendaCell, AgendaGrid, recarregar: desenhar };
})();
