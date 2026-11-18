const botaoMenu = document.querySelector(".csa-menu-btn");
const sidebar = document.querySelector(".csa-sidebar");
const cabecalhoPagina = document.querySelector(".csa-header");
const barraTopo = document.querySelector(".csa-conteiner");

// Posiciona a faixa logo abaixo da barra do topo e abre o espaço dela
// (--csa-menu-topo e --csa-menu-altura, usadas no agenda-mobile.css)
function posicionarMenu() {
  const topo = barraTopo.getBoundingClientRect().bottom + window.scrollY;
  const raiz = document.documentElement.style;
  raiz.setProperty("--csa-menu-topo", topo + "px");
  raiz.setProperty("--csa-menu-altura", sidebar.offsetHeight + "px");
}

function alternarMenu(abrir) {
  sidebar.classList.toggle("csa-sidebar--aberta", abrir);
  cabecalhoPagina.classList.toggle("csa-header--menu-aberto", abrir);
  botaoMenu.setAttribute("aria-expanded", abrir);
  // mede depois de abrir, porque a altura da faixa só existe com ela visível
  if (abrir) posicionarMenu();
}

botaoMenu.addEventListener("click", () => {
  alternarMenu(!sidebar.classList.contains("csa-sidebar--aberta"));
});

// fecha ao tocar fora do menu
document.addEventListener("click", (e) => {
  if (sidebar.contains(e.target) || botaoMenu.contains(e.target)) return;
  alternarMenu(false);
});

window.addEventListener("resize", () => {
  if (sidebar.classList.contains("csa-sidebar--aberta")) posicionarMenu();
});

// Define --csa-painel-topo (usada no agenda-mobile.css) para o painel abrir
// logo abaixo do cabeçalho. IIFE para não colidir com variáveis de outros scripts.
(() => {
  const painel = document.getElementById("csa-painel");
  const cabecalho = document.querySelector(".csa-header");
  if (!painel || !cabecalho) return;

  function ajustarTopoDoPainel() {
    if (painel.hidden) return;
    window.scrollTo(0, 0); // garante que o cabeçalho esteja visível ao medir
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
