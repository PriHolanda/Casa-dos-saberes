document.addEventListener("DOMContentLoaded", () => {
  const botaoMenu = document.querySelector(".csa-acessibilidade-btn");
  const painel = document.querySelector(".csa-acessibilidade-painel");
  const conteudo = document.querySelector(".csa-agenda-cliente");
  const raiz = document.documentElement;

  const chaveSalva = "csa-acessibilidade";
  const tamanhoMinimo = 80;
  const tamanhoMaximo = 150;
  const passo = 10;

  let estado = {
    tamanho: 100,
    contraste: false,
    sublinhar: false
  };

  try {
    const salvo = JSON.parse(localStorage.getItem(chaveSalva));

    if (salvo) {
      estado = { ...estado, ...salvo };
    }
  } catch (erro) {
    console.log("Não foi possível ler as preferências de acessibilidade.");
  }

  function salvar() {
    try {
      localStorage.setItem(chaveSalva, JSON.stringify(estado));
    } catch (erro) {
      console.log("Não foi possível salvar as preferências de acessibilidade.");
    }
  }

  function aplicar() {
    conteudo.style.zoom = `${estado.tamanho}%`;

    raiz.classList.toggle("csa-alto-contraste", estado.contraste);
    raiz.classList.toggle("csa-sublinhar-links", estado.sublinhar);

    painel.querySelector('[data-acao="contraste"]')
      .setAttribute("aria-pressed", String(estado.contraste));

    painel.querySelector('[data-acao="sublinhar"]')
      .setAttribute("aria-pressed", String(estado.sublinhar));

    salvar();
  }

  function alternarPainel(abrir) {
    painel.hidden = !abrir;
    botaoMenu.setAttribute("aria-expanded", String(abrir));
  }

  botaoMenu.addEventListener("click", () => {
    alternarPainel(painel.hidden);
  });

  document.addEventListener("keydown", (evento) => {
    if (evento.key === "Escape") {
      alternarPainel(false);
    }
  });

  painel.addEventListener("click", (evento) => {
    const botao = evento.target.closest("[data-acao]");

    if (!botao) return;

    const acao = botao.dataset.acao;

    if (acao === "aumentar-fonte") {
      estado.tamanho = Math.min(estado.tamanho + passo, tamanhoMaximo);
    } else if (acao === "diminuir-fonte") {
      estado.tamanho = Math.max(estado.tamanho - passo, tamanhoMinimo);
    } else if (acao === "contraste") {
      estado.contraste = !estado.contraste;
    } else if (acao === "sublinhar") {
      estado.sublinhar = !estado.sublinhar;
    } else if (acao === "resetar") {
      estado = { tamanho: 100, contraste: false, sublinhar: false };
    }

    aplicar();
  });

  aplicar();
});