document.addEventListener('DOMContentLoaded', async () => {
  const { espacos, lerDia, somarDias, intervalo, lerDataHora } = csaAgendaModelo;
  const { turnos, consultarEventos, parametrosReserva } = csaProgramacao;
  const parametros = new URLSearchParams(location.search);
  const dataAtual = document.querySelector('.csa-date-current');
  const mobile = matchMedia('(max-width: 759px)');
  const [anterior, proxima] = document.querySelectorAll('.csa-date-button');
  const escolher = document.querySelector('.csa-date-picker');
  const seletor = document.querySelector('.csa-date-input');
  const disponibilidade = document.querySelector('.csa-available-checkbox');
  const botoes = document.querySelectorAll('.csa-filter-btn');
  const mensagem = document.getElementById('csa-programacao-mensagem');
  const periodos = [
    { id: 'morning', inicio: 0, fim: 12 },
    { id: 'afternoon', inicio: 12, fim: 18 },
    { id: 'night', inicio: 18, fim: 24 }
  ];
  const hoje = new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Fortaleza', dateStyle: 'short' }).format(new Date());
  let dia = lerDia(parametros.get('data')) === null ? hoje : parametros.get('data');
  let filtro = 'todos';
  let eventos;
  let erro;

  function elemento(tag, classe = '', texto = '') {
    const no = document.createElement(tag);
    no.className = classe;
    no.textContent = texto;
    return no;
  }

  function cartao(espaco, evento, periodo) {
    const estado = evento ? 'occupied' : 'available';
    const visual = espaco.visual === 'salas' ? 'expo' : espaco.visual;
    const card = elemento('article', `csa-event csa-event-${estado} csa-event-${visual}`);
    const hora = elemento('div', 'csa-event-hour');
    if (evento) {
      const inicio = intervalo(dia, periodo).inicio;
      const horario = elemento('span');
      if (evento.inicioMs < inicio) horario.append('Em', document.createElement('br'), 'curso');
      else horario.append(evento.horarioInicio.slice(0, 2) + 'H', document.createElement('br'), evento.horarioInicio.slice(3));
      hora.append(horario);
    }
    const info = elemento('div', 'csa-event-info');
    info.append(elemento('span', 'csa-event-space', espaco.nome));
    info.append(elemento('h4', 'csa-event-name', evento ? evento.nome : 'Sem evento publicado'));
    if (evento) {
      const detalhes = elemento('a', 'csa-event-details', 'Ver detalhes');
      detalhes.href = `detalhes-reserva.html?${new URLSearchParams({ eventoId: evento.id, data: dia })}`;
      info.append(detalhes);
    } else {
      const acoes = elemento('div', 'csa-event-actions');
      const reservar = elemento('a', 'csa-event-reserve', 'Solicitar reserva');
      reservar.href = `reservas.html?${parametrosReserva({ espacoId: espaco.id, data: dia, turno: periodo.id })}`;
      acoes.append(reservar);
      info.append(acoes);
    }
    card.append(hora, info);
    return card;
  }

  function atualizar() {
    const formato = { weekday: mobile.matches ? 'short' : 'long', day: 'numeric', month: 'long', timeZone: 'UTC' };
    if (mobile.matches) formato.year = 'numeric';
    const rotulo = new Intl.DateTimeFormat('pt-BR', formato).format(lerDia(dia));
    dataAtual.textContent = rotulo[0].toUpperCase() + rotulo.slice(1);
    seletor.value = dia;

    let quantidade = 0;
    periodos.forEach(periodo => {
      const secao = document.querySelector(`.csa-period-${periodo.id}`);
      const lista = secao.querySelector('.csa-events');
      secao.hidden = true;
      lista.replaceChildren();
      if (!eventos || (filtro !== 'todos' && filtro !== periodo.id)) return;

      const janela = intervalo(dia, periodo);
      const publicados = eventos.filter(evento => evento.inicioMs < janela.fim && evento.terminoMs > janela.inicio);
      if (!disponibilidade.checked) {
        publicados.forEach(evento => lista.append(cartao(espacos.find(item => item.id === evento.espacoId), evento, periodo)));
      }
      const turno = turnos[periodo.id];
      if (turno && dia >= hoje) {
        const inicio = lerDataHora(`${dia}T${turno.inicio}`);
        const fim = lerDataHora(`${dia}T${turno.fim}`);
        espacos.filter(espaco => !publicados.some(evento =>
          evento.espacoId === espaco.id && evento.inicioMs < fim && evento.terminoMs > inicio
        )).forEach(espaco => lista.append(cartao(espaco, null, periodo)));
      }
      secao.hidden = !lista.childElementCount;
      quantidade += lista.childElementCount;
    });
    mensagem.textContent = erro || (eventos ? 'Nenhuma opção para este dia e filtro.' : 'Carregando programação…');
    mensagem.hidden = quantidade > 0;
  }

  anterior.addEventListener('click', () => { dia = somarDias(dia, -1); atualizar(); });
  proxima.addEventListener('click', () => { dia = somarDias(dia, 1); atualizar(); });
  mobile.addEventListener('change', atualizar);
  disponibilidade.addEventListener('change', atualizar);
  escolher.addEventListener('click', () => {
    const posicao = escolher.getBoundingClientRect();
    seletor.style.left = `${posicao.left}px`;
    seletor.style.top = `${posicao.top}px`;
    seletor.style.width = `${posicao.width}px`;
    seletor.style.height = `${posicao.height}px`;
    if (typeof seletor.showPicker === 'function') seletor.showPicker();
    else seletor.click();
  });
  seletor.addEventListener('change', () => {
    if (lerDia(seletor.value) === null) return;
    dia = seletor.value;
    atualizar();
  });
  botoes.forEach((botao, indice) => botao.addEventListener('click', () => {
    filtro = indice === 0 ? 'todos' : periodos[indice - 1].id;
    botoes.forEach(item => item.classList.toggle('csa-filter-active', item === botao));
    atualizar();
  }));

  atualizar();
  try {
    eventos = await consultarEventos();
  } catch (falha) {
    erro = falha.message;
  }
  atualizar();
});
