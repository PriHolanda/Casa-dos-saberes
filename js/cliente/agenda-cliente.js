document.addEventListener('DOMContentLoaded', async () => {
  const { espacos, lerDia, somarDias, intervalo } = csaAgendaModelo;
  const { consultarEventos, consultarDisponibilidade, opcoesReserva, parametrosReserva } = csaProgramacao;
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
  let erroEventos;
  let vagas;
  let erroVagas;
  let consulta = 0;

  function elemento(tag, classe = '', texto = '') {
    const no = document.createElement(tag);
    no.className = classe;
    no.textContent = texto;
    return no;
  }

  function cartao(espaco, evento, periodo, vaga) {
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
    info.append(elemento('h4', 'csa-event-name', evento ? evento.nome : `${vaga.inicio} às ${vaga.fim}`));
    if (evento) {
      const detalhes = elemento('a', 'csa-event-details', 'Ver detalhes');
      detalhes.href = `detalhes-reserva.html?${new URLSearchParams({ eventoId: evento.id, data: dia })}`;
      info.append(detalhes);
    } else {
      const acoes = elemento('div', 'csa-event-actions');
      const reservar = elemento('a', 'csa-event-reserve', 'Solicitar reserva');
      reservar.href = `reservas.html?${parametrosReserva({ espacoId: espaco.id, data: dia, ...vaga })}`;
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
      if (filtro !== 'todos' && filtro !== periodo.id) return;

      const janela = intervalo(dia, periodo);
      const publicados = (eventos || []).filter(evento => evento.inicioMs < janela.fim && evento.terminoMs > janela.inicio);
      if (!disponibilidade.checked) {
        publicados.forEach(evento => lista.append(cartao(espacos.find(item => item.id === evento.espacoId), evento, periodo)));
      }
      for (const { espaco, vaga } of vagas || []) {
        if (vaga.turno === periodo.id) lista.append(cartao(espaco, null, periodo, vaga));
      }
      secao.hidden = !lista.childElementCount;
      quantidade += lista.childElementCount;
    });
    const erro = [!disponibilidade.checked && erroEventos, erroVagas].filter(Boolean).join(' ');
    const carregando = (!disponibilidade.checked && !eventos && !erroEventos) || !vagas;
    mensagem.textContent = erro || (carregando ? 'Carregando programação…' : 'Nenhuma opção para este dia e filtro.');
    mensagem.hidden = !erro && quantidade > 0;
  }

  async function carregarVagas(data) {
    dia = data;
    const id = ++consulta;
    vagas = data < hoje ? [] : null;
    erroVagas = '';
    atualizar();
    if (vagas) return;
    const resultados = await Promise.allSettled(espacos.map(espaco => consultarDisponibilidade(data, espaco.id)));
    if (id !== consulta) return;
    vagas = resultados.flatMap((resultado, indice) => resultado.status === 'fulfilled'
      ? opcoesReserva(resultado.value).map(vaga => ({ espaco: espacos[indice], vaga })) : []);
    if (resultados.some(resultado => resultado.status === 'rejected')) {
      erroVagas = 'A disponibilidade de alguns espaços não pôde ser consultada.';
    }
    atualizar();
  }

  anterior.addEventListener('click', () => carregarVagas(somarDias(dia, -1)));
  proxima.addEventListener('click', () => carregarVagas(somarDias(dia, 1)));
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
    carregarVagas(seletor.value);
  });
  botoes.forEach((botao, indice) => botao.addEventListener('click', () => {
    filtro = indice === 0 ? 'todos' : periodos[indice - 1].id;
    botoes.forEach(item => item.classList.toggle('csa-filter-active', item === botao));
    atualizar();
  }));

  carregarVagas(dia);
  try {
    eventos = await consultarEventos();
  } catch (falha) {
    erroEventos = falha.message;
  }
  atualizar();
});
