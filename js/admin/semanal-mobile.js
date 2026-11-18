// Lista de dias da Semanal no mobile, montada a partir da tabela que o agenda.js renderiza
(() => {
  const container = document.getElementById('csa-agenda');
  if (!container) return;

  const DIAS = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
  const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

  function montar() {
    // o agenda.js refaz o innerHTML a cada redesenho; só monta se a lista não existir
    if (container.querySelector('.csa-semanal-mobile')) return;

    const tabela = container.querySelector('.csa-grid:not(.csa-grid--diaria)');
    if (!tabela || !tabela.tHead || !tabela.tBodies[0]) return;

    const colunas = tabela.tHead.rows[0].cells.length - 1; // a 1ª coluna é o turno
    const turnos = [...tabela.tBodies[0].rows].map(linha => ({
      nome: linha.cells[0].textContent.trim(),
      celulas: [...linha.cells].slice(1)
    }));

    const lista = document.createElement('div');
    lista.className = 'csa-semanal-mobile';

    for (let i = 0; i < colunas; i++) {
      // toda célula tem um card de disponibilidade com a data completa (data-data)
      const ref = turnos.map(t => t.celulas[i]?.querySelector('[data-data]')).find(Boolean);
      if (!ref) continue;

      const [ano, mes, dia] = ref.dataset.data.split('-').map(Number);
      const diaSemana = new Date(Date.UTC(ano, mes - 1, dia)).getUTCDay();
      const pendentes = turnos.reduce(
        (soma, t) => soma + (t.celulas[i]?.querySelectorAll('.csa-event-card__status--pendente').length || 0),
        0
      );

      const secao = document.createElement('section');
      secao.className = 'csa-dia';

      const idCorpo = `csa-dia-${ref.dataset.data}`;
      const botao = document.createElement('button');
      botao.type = 'button';
      botao.className = 'csa-dia__cabecalho';
      botao.setAttribute('aria-expanded', 'false');
      botao.setAttribute('aria-controls', idCorpo);
      // só textos fixos e números, sem entrada do usuário
      botao.innerHTML =
        `<span class="csa-dia__titulo"><strong>${DIAS[diaSemana]}</strong><span>${dia} de ${MESES[mes - 1]}</span></span>` +
        (pendentes ? `<span class="csa-dia__pendente">${pendentes} ${pendentes === 1 ? 'pendente' : 'pendentes'}</span>` : '') +
        '<span class="csa-dia__seta" aria-hidden="true"></span>';

      const corpo = document.createElement('div');
      corpo.id = idCorpo;
      corpo.className = 'csa-dia__corpo';
      corpo.hidden = true;

      turnos.forEach(turno => {
        const conteudo = turno.celulas[i]?.querySelector('.csa-grid__conteudo');
        if (!conteudo) return;
        const bloco = document.createElement('div');
        bloco.className = 'csa-dia__turno';
        const nome = document.createElement('p');
        nome.className = 'csa-dia__turno-nome';
        nome.textContent = turno.nome;
        // o clone mantém os data-atributos, então os cliques em cards e em
        // "Adicionar Evento" continuam tratados pelo listener do agenda.js
        bloco.append(nome, conteudo.cloneNode(true));
        corpo.append(bloco);
      });

      botao.addEventListener('click', () => {
        const aberto = botao.getAttribute('aria-expanded') === 'true';
        botao.setAttribute('aria-expanded', String(!aberto));
        corpo.hidden = aberto;
      });

      secao.append(botao, corpo);
      lista.append(secao);
    }

    container.append(lista);
  }

  // observa só o container: pega o redesenho do agenda.js sem disparar com o que a lista insere
  new MutationObserver(montar).observe(container, { childList: true });
  montar();
})();