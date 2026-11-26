(async () => {
  const agenda = document.getElementById('csa-agenda');
  const controles = document.querySelectorAll('.csa-barra-controle button, .csa-barra-controle select');
  const resumo = typeof csaDashboard === 'undefined' ? null : csaDashboard;
  const aviso = document.getElementById('csa-dashboard-aviso') || document.getElementById('csa-agenda-aviso');
  const exportar = document.getElementById('csa-btn-pdf');
  if (exportar && document.body.dataset.somenteLeitura !== 'true') {
    csaExportarRelatorio.conectar(exportar, {
      periodo() {
        const dias = csaAgenda.periodo();
        return [dias[0], dias.at(-1)];
      },
      exportar(inicio, fim) {
        const status = document.getElementById('csa-filtro-status').value;
        if (!csaDadosAgenda.demonstracao) {
          return csaApi.exportarAgendamentos('eventos', inicio, fim, status);
        }
        const { eventos, espacos } = csaDadosAgenda.consultarPeriodo(inicio, fim);
        const linhas = eventos
          .filter(evento => evento.inicio.slice(0, 10) >= inicio && (status === 'todos' || evento.status === status))
          .sort((a, b) => a.inicioMs - b.inicioMs)
          .map(evento => [
            csaExportarRelatorio.formatarData(evento.inicio.slice(0, 10)),
            `${evento.horarioInicio} às ${evento.horarioTermino}`,
            evento.nome,
            espacos.find(espaco => espaco.id === evento.espacoId)?.nome || 'Não informado',
            csaAgendaModelo.definirStatus(evento.status).rotulo
          ]);
        return csaExportarRelatorio.imprimirDemonstracao({
          titulo: 'Relatório de eventos e reservas de espaços', inicio, fim,
          colunas: ['Data', 'Horário', 'Evento', 'Espaço', 'Status'], linhas
        });
      }
    });
  }
  agenda.inert = true;
  controles.forEach(elemento => { elemento.disabled = true; });
  agenda.textContent = 'Carregando agenda…';
  if (!csaDadosAgenda.demonstracao && !csaApi.sessao()) {
    agenda.textContent = 'Entre com sua conta para carregar os agendamentos reais.';
    const entrar = document.createElement('a');
    entrar.href = `../login.html?next=${encodeURIComponent(location.pathname + location.search)}`;
    entrar.textContent = resumo ? 'Entrar para acessar o dashboard' : 'Entrar para acessar a agenda';
    aviso.replaceChildren(entrar);
    return;
  }
  try {
    if (!csaDadosAgenda.demonstracao) await csaApi.requisitar('/usuarios/me');
    await csaDadosAgenda.carregar();
    resumo?.eventosProntos();
    csaAgenda.recarregar();
    agenda.inert = false;
    controles.forEach(elemento => { elemento.disabled = false; });
    if (resumo) {
      await resumo.carregar();
      csaAgenda.recarregar();
    }
    if (resumo && csaDadosAgenda.demonstracao && matchMedia('(min-width: 769px)').matches) {
      const primeiro = csaDadosAgenda.consultarPeriodo(csaDadosAgenda.dataInicial, csaDadosAgenda.dataInicial).eventos[0];
      if (primeiro) csaPainel.mostrarDetalhes(primeiro);
    }
  } catch (erro) {
    agenda.textContent = `${erro.message} Recarregue a página para tentar novamente.`;
  }
})();
