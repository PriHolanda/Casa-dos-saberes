// Rafael: abre e fecha os painéis e monta o conteúdo
const csaPainel = (() => {
  const painel = document.getElementById('csa-painel');
  const escapar = valor => String(valor ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
  const mostrarValor = valor => valor ? escapar(valor) : 'Não informado';
  const espacos = csaDadosAgenda.espacos;
  const turnos = {
    manha: { nome: 'Manhã', inicio: '08:00', fim: '10:00', minimo: '00:00', maximo: '12:00' },
    tarde: { nome: 'Tarde', inicio: '14:00', fim: '16:00', minimo: '12:00', maximo: '18:00' },
    noite: { nome: 'Noite', inicio: '19:00', fim: '21:00', minimo: '18:00', maximo: '23:59' }
  };
  const campo = (rotulo, valor) => `<div class="csa-painel__campo"><span>${escapar(rotulo)}</span><p>${mostrarValor(valor)}</p></div>`;

  function abrir(conteudo, rotulo) {
    painel.innerHTML = conteudo;
    painel.hidden = false;
    painel.classList.add('csa-painel--aberto');
    painel.setAttribute('aria-label', rotulo);
    painel.querySelector('[data-fechar-painel]').focus();
  }

  function fechar() {
    painel.hidden = true;
    painel.classList.remove('csa-painel--aberto');
    painel.replaceChildren();
  }

  function mostrarDetalhes(evento) {
    if (!evento) return;
    painel.dataset.eventoId = evento.id;
    const status = csaAgendaModelo.definirStatus(evento.status);
    const data = evento.inicio.slice(0, 10);
    const acoes = evento.status === 'pendente' ? `<div class="csa-painel__acoes">
      <button type="button" class="csa-painel__botao csa-painel__botao--negar" data-acao="negar">Negar</button>
      <button type="button" class="csa-painel__botao csa-painel__botao--aprovar" data-acao="aprovar">Aprovar</button>
    </div>` : '';
    abrir(`<div class="csa-painel__cabecalho">
      <h2 id="csa-painel-titulo">Detalhes do Evento</h2>
      <button type="button" data-fechar-painel aria-label="Fechar painel">×</button>
    </div>
    <span class="csa-painel__status csa-painel__status--${escapar(status.visual)}">${escapar(status.rotulo)}</span>
    <div class="csa-painel__dados">
      ${campo('Nome do Evento', evento.nome)}
      ${campo('Solicitante', evento.solicitante)}
      ${campo('Celular', evento.celular)}
      ${campo('Espaço', espacos.find(espaco => espaco.id === evento.espacoId)?.nome)}
      ${campo('Data', csaAgendaModelo.formatarDia(data))}
      ${campo('Horário', `${evento.horarioInicio} às ${evento.horarioTermino}`)}
      ${campo('Público estimado', evento.publico)}
      ${campo('Classificação indicativa', evento.classificacao)}
      ${campo('Descrição', evento.descricao)}
    </div>${acoes}`, 'Detalhes do evento');
  }

  function mostrarCadastro(data, turnoId) {
    const turno = turnos[turnoId];
    if (!turno || !csaAgendaModelo.lerDia(data)) return;
    delete painel.dataset.eventoId;
    abrir(`<div class="csa-painel__cabecalho">
      <h2 id="csa-painel-titulo">Cadastrar Evento</h2>
      <button type="button" data-fechar-painel aria-label="Fechar painel">×</button>
    </div>
    <p class="csa-painel__data-turno"><i class="fa-regular fa-calendar" aria-hidden="true"></i>${escapar(csaAgendaModelo.formatarDia(data))} · ${escapar(turno.nome)}</p>
    <form class="csa-painel__formulario" id="csa-form-evento">
      <label>Espaço Disponível<select name="espacoId" required><option value="" selected disabled>Selecione um espaço</option>${espacos.map(espaco => `<option value="${escapar(espaco.id)}">${escapar(espaco.nome)}</option>`).join('')}</select></label>
      <label>Nome do Evento<input name="nome" placeholder="Ex.: Apresentação Musical" required maxlength="120"></label>
      <label>Responsável<input name="solicitante" placeholder="Nome completo" required maxlength="120"></label>
      <div class="csa-painel__linha">
        <label>Horário<div class="csa-painel__faixa-horario">
          <input name="inicio" type="time" min="${turno.minimo}" max="${turno.maximo}" value="${turno.inicio}" required aria-label="Horário inicial">
          <span>às</span>
          <input name="termino" type="time" min="${turno.minimo}" max="${turno.maximo}" value="${turno.fim}" required aria-label="Horário final">
        </div></label>
        <label>Público estimado<input name="publico" placeholder="100 pessoas" maxlength="60"></label>
      </div>
      <label>Classificação Indicativa<select name="classificacao"><option>Livre</option><option>10 anos</option><option>12 anos</option><option>14 anos</option><option>16 anos</option><option>18 anos</option></select></label>
      <label>Descrição<textarea name="descricao" rows="4" placeholder="Descreva o evento..." maxlength="1000"></textarea></label>
      <p class="csa-painel__erro" role="alert" hidden></p>
      <div class="csa-painel__acoes">
        <button class="csa-painel__botao csa-painel__botao--negar" type="button" data-fechar-painel>Cancelar</button>
        <button class="csa-painel__botao csa-painel__botao--aprovar" type="submit">Confirmar</button>
      </div>
    </form>`, 'Cadastrar evento');
  }

  document.addEventListener('csa:abrir-detalhes', e => mostrarDetalhes(csaDadosAgenda.buscarEvento(e.detail.id)));
  document.addEventListener('csa:abrir-cadastro', e => mostrarCadastro(e.detail.data, e.detail.turno));
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !painel.hidden) fechar();
  });
  painel.addEventListener('click', e => {
    if (e.target.closest('[data-fechar-painel]')) {
      fechar();
      return;
    }
    const acao = e.target.closest('[data-acao]');
    if (!acao) return;
    const eventoId = painel.dataset.eventoId;
    if (acao.dataset.acao === 'aprovar') {
      const evento = csaDadosAgenda.atualizarStatus(eventoId, 'aceito');
      document.dispatchEvent(new CustomEvent('csa:evento-atualizado', { detail: { id: evento.id } }));
      mostrarDetalhes(evento);
    } else if (acao.dataset.acao === 'negar') {
      csaDadosAgenda.removerEvento(eventoId);
      fechar();
      document.dispatchEvent(new CustomEvent('csa:evento-atualizado', { detail: { id: eventoId } }));
    }
  });
  painel.addEventListener('submit', e => {
    if (e.target.id !== 'csa-form-evento') return;
    e.preventDefault();
    const formulario = e.target;
    const valores = Object.fromEntries(new FormData(formulario).entries());
    const horarioInicio = `${valores.data}T${valores.inicio}:00`;
    const horarioTermino = `${valores.data}T${valores.termino}:00`;
    if (valores.termino <= valores.inicio) {
      const erro = formulario.querySelector('[role="alert"]');
      erro.textContent = 'O horário de término precisa ser depois do horário de início.';
      erro.hidden = false;
      return;
    }
    const evento = csaDadosAgenda.adicionarEvento({
      nome: valores.nome,
      solicitante: valores.solicitante,
      celular: valores.celular,
      espacoId: valores.espacoId,
      inicio: horarioInicio,
      termino: horarioTermino,
      publico: valores.publico,
      classificacao: valores.classificacao,
      descricao: valores.descricao
    });
    document.dispatchEvent(new CustomEvent('csa:evento-atualizado', { detail: { id: evento.id } }));
    mostrarDetalhes(evento);
  });
  return { fechar, mostrarDetalhes, mostrarCadastro };
})();
