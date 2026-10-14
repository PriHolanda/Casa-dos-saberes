document.querySelectorAll("[data-visao]").forEach((botao) => {
  botao.addEventListener("click", () => {
    document.querySelectorAll("[data-visao]").forEach((b) => b.classList.remove("csa-alternador__botao--ativo"));
    botao.classList.add("csa-alternador__botao--ativo");
    document.dispatchEvent(new CustomEvent("csa:mudar-visao", { detail: { visao: botao.dataset.visao } }));
  });
});

document.querySelectorAll("[data-direcao]").forEach((botao) => {
  botao.addEventListener("click", () => {
    document.dispatchEvent(new CustomEvent("csa:mudar-data", { detail: { direcao: Number(botao.dataset.direcao) } }));
  });
});

document.getElementById("csa-filtro-status").addEventListener("change", (e) => {
  document.dispatchEvent(new CustomEvent("csa:mudar-filtro", { detail: { status: e.target.value } }));
});