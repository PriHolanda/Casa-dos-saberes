const botaoMenu = document.querySelector(".csa-menu-btn");
const sidebar = document.querySelector(".csa-sidebar");

botaoMenu.addEventListener("click", () => {
  const aberta = sidebar.classList.toggle("csa-sidebar--aberta");
  botaoMenu.setAttribute("aria-expanded", aberta);
});

// IIFE para não colidir com variáveis dos outros scripts
(() => {
  const painel = document.getElementById("csa-painel");
  const cabecalho = document.querySelector(".csa-header");
  if (!painel || !cabecalho) return;

  function ajustarTopoDoPainel() {
    if (painel.hidden) return;
    window.scrollTo(0, 0); // garante que o cabeçalho esteja visível
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
})();
