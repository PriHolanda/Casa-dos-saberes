// Rafael: abre e fecha os painéis e monta o conteúdo
const csaPainel = (() => {
  const painel = document.getElementById('csa-painel');
  let ocupado = false;
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
    if (ocupado) return;
    painel.hidden = true;
    painel.classList.remove('csa-painel--aberto');
    painel.replaceChildren();
  }

  function mostrarDetalhes(evento) {
    if (ocupado || !evento) return;
    painel.dataset.eventoId = evento.id;
    const status = csaAgendaModelo.definirStatus(evento.status);
    const data = evento.inicio.slice(0, 10);
    const acoes = evento.status === 'pendente' ? `<div class="csa-painel__acoes">
      <button type="button" class="csa-painel__botao csa-painel__botao--aprovar" data-acao="aprovar">Aprovar</button>
      <button type="button" class="csa-painel__botao csa-painel__botao--editar" data-acao="editar">Editar</button>
      <button type="button" class="csa-painel__botao csa-painel__botao--negar" data-acao="negar">Negar</button>
    </div>` : `<div class="csa-painel__acoes">
      <button type="button" class="csa-painel__botao csa-painel__botao--editar" data-acao="editar">Editar evento</button>
      <button type="button" class="csa-painel__botao csa-painel__botao--negar" data-acao="excluir">Deletar evento</button>
    </div>`;
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
    </div><p class="csa-painel__erro" role="alert" hidden></p>${acoes}`, 'Detalhes do evento');
  }

  function mostrarCadastro(data, turnoId, evento = null) {
    const turno = turnos[turnoId];
    if (ocupado || !turno || (!evento && csaAgendaModelo.lerDia(data) === null)) return;
    if (evento) painel.dataset.eventoId = evento.id;
    else delete painel.dataset.eventoId;
    const valor = (nome, fallback = '') => escapar(evento?.[nome] ?? fallback);
    const dataEvento = evento?.inicio.slice(0, 10) || data;
    const horaInicio = evento?.horarioInicio || turno.inicio;
    const horaFim = evento?.horarioTermino || turno.fim;
    const turnoAnterior = Object.entries(turnos).find(([, opcoes]) => horaInicio >= opcoes.minimo && horaInicio < opcoes.maximo)?.[0] || turnoId;
    const limite = turnos[turnoAnterior];
    abrir(`<div class="csa-painel__cabecalho">
      <h2 id="csa-painel-titulo">${evento ? 'Alterar Evento' : 'Cadastrar Evento'}</h2>
      <button type="button" data-fechar-painel aria-label="Fechar painel">×</button>
    </div>
    ${evento ? '' : `<p class="csa-painel__data-turno"><i class="fa-regular fa-calendar" aria-hidden="true"></i>${escapar(csaAgendaModelo.formatarDia(data))} · ${escapar(turno.nome)}</p>`}
    <form class="csa-painel__formulario" id="csa-form-evento">
      ${evento
        ? `<label>Data<input name="data" type="date" value="${escapar(dataEvento)}" required></label>`
        : `<input type="hidden" name="data" value="${escapar(dataEvento)}">`}
      ${evento ? `<input type="hidden" name="status" value="${valor('status', 'pendente')}"><input type="hidden" name="celular" value="${valor('celular')}">` : ''}
      <label>Espaço Disponível<select name="espacoId" required><option value="" ${evento ? '' : 'selected'} disabled>Selecione um espaço</option>${espacos.map(espaco => `<option value="${escapar(espaco.id)}" ${evento?.espacoId === espaco.id ? 'selected' : ''}>${escapar(espaco.nome)}</option>`).join('')}</select></label>
      <label>Nome do Evento<input name="nome" placeholder="Ex.: Apresentação Musical" value="${valor('nome')}" required minlength="3" maxlength="120"></label>
      <label>Responsável<input name="solicitante" placeholder="Nome completo" value="${valor('solicitante')}" required maxlength="120"></label>
      <div class="csa-painel__linha">
        <label>Horário<div class="csa-painel__faixa-horario">
          <input name="inicio" type="time" min="${limite.minimo}" max="${limite.maximo}" value="${horaInicio}" required aria-label="Horário inicial">
          <span>às</span>
          <input name="termino" type="time" min="${limite.minimo}" max="${limite.maximo}" value="${horaFim}" required aria-label="Horário final">
        </div></label>
        <label>Público estimado<input name="publico" placeholder="100 pessoas" value="${valor('publico')}" maxlength="60"></label>
      </div>
      <label>Classificação Indicativa<select name="classificacao">${['Livre', '10 anos', '12 anos', '14 anos', '16 anos', '18 anos'].map(opcao => `<option ${valor('classificacao', 'Livre') === opcao ? 'selected' : ''}>${opcao}</option>`).join('')}</select></label>
      <label>Descrição<textarea name="descricao" required minlength="10" rows="4" placeholder="Descreva o evento..." maxlength="1000">${valor('descricao')}</textarea></label>
      <p class="csa-painel__erro" role="alert" hidden></p>
      <div class="csa-painel__acoes">
        <button class="csa-painel__botao csa-painel__botao--negar" type="button" data-fechar-painel>Cancelar</button>
        <button class="csa-painel__botao csa-painel__botao--aprovar" type="submit">${evento ? 'Salvar alterações' : 'Confirmar'}</button>
      </div>
    </form>`, 'Cadastrar evento');
  }

  document.addEventListener('csa:abrir-detalhes', e => mostrarDetalhes(csaDadosAgenda.buscarEvento(e.detail.id)));
  document.addEventListener('csa:abrir-cadastro', e => mostrarCadastro(e.detail.data, e.detail.turno));
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !painel.hidden) fechar();
  });
  function bloquear(valor) {
    ocupado = valor;
    painel.querySelectorAll('button, input, select, textarea').forEach(elemento => { elemento.disabled = valor; });
  }
  function mostrarErro(mensagem) {
    const elemento = painel.querySelector('[role="alert"]');
    elemento.textContent = mensagem;
    elemento.hidden = false;
  }
  painel.addEventListener('click', async e => {
    if (ocupado) return;
    if (e.target.closest('[data-fechar-painel]')) { fechar(); return; }
    const acao = e.target.closest('[data-acao]')?.dataset.acao;
    const eventoId = painel.dataset.eventoId;
    if (acao === 'editar') {
      const evento = csaDadosAgenda.buscarEvento(eventoId);
      if (evento) mostrarCadastro(evento.inicio.slice(0, 10), 'manha', evento);
      return;
    }
    if (!['aprovar', 'negar', 'excluir'].includes(acao)) return;
    const pergunta = acao === 'aprovar' ? 'Confirmar a aprovação deste evento?' : 'Confirmar a recusa? O evento será removido da agenda.';
    const perguntaFinal = acao === 'excluir' ? 'Confirmar a exclusão deste evento?' : pergunta;
    if (!window.confirm(perguntaFinal)) return;
    bloquear(true);
    try {
      if (acao === 'aprovar') {
        const evento = await csaDadosAgenda.atualizarStatus(eventoId, 'aceito');
        bloquear(false);
        mostrarDetalhes(evento);
      } else {
        await csaDadosAgenda.removerEvento(eventoId);
        bloquear(false);
        fechar();
      }
      document.dispatchEvent(new CustomEvent('csa:evento-atualizado', { detail: { id: eventoId } }));
    } catch (erro) { mostrarErro(erro.message); }
    finally { bloquear(false); }
  });
  painel.addEventListener('submit', async e => {
    if (e.target.id !== 'csa-form-evento') return;
    e.preventDefault();
    if (ocupado) return;
    const valores = Object.fromEntries(new FormData(e.target).entries());
    if (valores.termino <= valores.inicio) {
      mostrarErro('O horário de término precisa ser depois do horário de início.');
      return;
    }
    // Mantém o campo textual do protótipo, aceitando "100" ou "100 pessoas".
    const publico = valores.publico.trim();
    const quantidade = /^(\d+)(?:\s+pessoas?)?$/i.exec(publico);
    if (publico && (!quantidade || !Number.isSafeInteger(Number(quantidade[1])))) {
      mostrarErro('Informe o público como um número de pessoas, por exemplo: 100 pessoas.');
      return;
    }
    if (!window.confirm(`Confirmar o cadastro do evento “${valores.nome}”?`)) return;
    bloquear(true);
    try {
      const evento = await csaDadosAgenda.salvar({
        nome: valores.nome, solicitante: valores.solicitante,
        espacoId: valores.espacoId,
        inicio: `${valores.data}T${valores.inicio}:00`,
        termino: `${valores.data}T${valores.termino}:00`,
        publico: quantidade ? quantidade[1] : '',
        classificacao: valores.classificacao, descricao: valores.descricao,
        status: 'pendente'
      });
      document.dispatchEvent(new CustomEvent('csa:evento-atualizado', { detail: { id: evento.id } }));
      bloquear(false);
      mostrarDetalhes(evento);
    } catch (erro) { mostrarErro(erro.message); }
    finally { bloquear(false); }
  });
  return { fechar, mostrarDetalhes, mostrarCadastro };
})();
