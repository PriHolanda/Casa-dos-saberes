(async () => {
  const agenda = document.getElementById('csa-agenda');
  const controles = document.querySelectorAll('.csa-barra-controle button, .csa-barra-controle select');
  agenda.inert = true;
  controles.forEach(elemento => { elemento.disabled = true; });
  agenda.textContent = 'Carregando agenda…';
  document.getElementById('csa-btn-pdf').addEventListener('click', () => window.print());
  if (!csaApi.sessao()) { csaApi.sair(); return; }
  try {
    await csaApi.requisitar('/usuarios/me');
    await csaDadosAgenda.carregar();
    csaAgenda.recarregar();
    agenda.inert = false;
    controles.forEach(elemento => { elemento.disabled = false; });
  } catch (erro) {
    agenda.textContent = `${erro.message} Recarregue a página para tentar novamente.`;
  }
})();
