document.addEventListener('DOMContentLoaded', () => {
  const painel = document.getElementById("csa-painel");
  const cabecalho = document.querySelector('.csa-navbar-header');
  if (!painel || !cabecalho) return;

  function ajustarTopoDoPainel() {
    if (painel.hidden) return;
    window.scrollTo(0, 0);
    const topo = Math.max(0, cabecalho.getBoundingClientRect().bottom);
    document.documentElement.style.setProperty(
      "--csa-painel-topo",
      topo + "px",
    );
  }

  new MutationObserver(ajustarTopoDoPainel).observe(painel, {
    attributes: true,
    attributeFilter: ["hidden"],
  });
  window.addEventListener("resize", ajustarTopoDoPainel);
});
