(async () => {
  const agenda = document.getElementById('csa-agenda');
  const controles = document.querySelectorAll('.csa-barra-controle button, .csa-barra-controle select');
  const resumo = typeof csaDashboard === 'undefined' ? null : csaDashboard;
  const aviso = document.getElementById('csa-dashboard-aviso') || document.getElementById('csa-agenda-aviso');
  const exportar = document.getElementById('csa-btn-pdf');
  if (exportar && document.body.dataset.somenteLeitura !== 'true') {
    exportar.addEventListener('click', async () => {
      if (csaDadosAgenda.demonstracao) {
        window.print();
        return;
      }
      const dias = csaAgenda.periodo();
      exportar.disabled = true;
      aviso.textContent = '';
      try {
        await csaApi.exportarAgendamentos('eventos', dias[0], dias.at(-1), document.getElementById('csa-filtro-status').value);
      } catch (erro) {
        aviso.textContent = erro.message;
      } finally {
        exportar.disabled = false;
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
    if (csaDadosAgenda.demonstracao && matchMedia('(min-width: 769px)').matches) {
      const primeiro = csaDadosAgenda.consultarPeriodo(csaDadosAgenda.dataInicial, csaDadosAgenda.dataInicial).eventos[0];
      if (primeiro) csaPainel.mostrarDetalhes(primeiro);
    }
  } catch (erro) {
    agenda.textContent = `${erro.message} Recarregue a página para tentar novamente.`;
  }
})();
