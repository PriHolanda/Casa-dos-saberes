document.addEventListener("DOMContentLoaded", () => {
  const dataAtualElemento = document.querySelector(".csa-date-current");
  const formatoDataMobile = window.matchMedia("(max-width: 759px)");

  const botoesData = document.querySelectorAll(".csa-date-button");
  const botaoDataAnterior = botoesData[0];
  const botaoDataProxima = botoesData[1];

  const botaoEscolherData = document.querySelector(".csa-date-picker");
  const seletorData = document.querySelector(".csa-date-input");
  const filtroDisponibilidade = document.querySelector(".csa-available-checkbox");
  const botoesPeriodo = document.querySelectorAll(".csa-filter-btn");
  const periodos = document.querySelectorAll(".csa-period");
  const botoesReserva = document.querySelectorAll(".csa-event-reserve");
  const paginaFormularioReserva = "reservas.html";

  let dataSelecionada = new Date(2026, 8, 21);
  let periodoSelecionado = "todos";

  const mapaPeriodos = {
    "Todos": "todos",
    "Manhã": "morning",
    "Tarde": "afternoon",
    "Noite": "night"
  };

  function capitalizar(texto) {
    return texto.charAt(0).toUpperCase() + texto.slice(1);
  }

  function formatarData(data) {
    return data.toLocaleDateString("pt-BR", {
      weekday: "long",
      day: "numeric",
      month: "long"
    });
  }

  function formatarDataMobileCompacta(data) {
    const semana = data.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "");
    const mes = data.toLocaleDateString("pt-BR", { month: "long" });

    return `${capitalizar(semana)}, ${data.getDate()} de ${capitalizar(mes)} de ${data.getFullYear()}`;
  }

  function formatarDataISO(data) {
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, "0");
    const dia = String(data.getDate()).padStart(2, "0");

    return `${ano}-${mes}-${dia}`;
  }

  function atualizarData() {
    dataAtualElemento.textContent = formatoDataMobile.matches
      ? formatarDataMobileCompacta(dataSelecionada)
      : capitalizar(formatarData(dataSelecionada));
  }

  function alterarData(dias) {
    dataSelecionada.setDate(dataSelecionada.getDate() + dias);
    atualizarData();
    console.log("Data selecionada:", formatarDataISO(dataSelecionada));
  }

  function aplicarFiltros() {
    periodos.forEach(periodo => {
      const periodoVisivel =
        periodoSelecionado === "todos" ||
        periodo.classList.contains(`csa-period-${periodoSelecionado}`);

      const eventos = periodo.querySelectorAll(".csa-event");
      let possuiEventoVisivel = false;

      eventos.forEach(evento => {
        const estaDisponivel = evento.classList.contains("csa-event-available");
        const deveMostrar = !filtroDisponibilidade.checked || estaDisponivel;

        evento.style.display = deveMostrar ? "flex" : "none";

        if (deveMostrar) {
          possuiEventoVisivel = true;
        }
      });

      periodo.style.display = periodoVisivel && possuiEventoVisivel ? "" : "none";
    });
  }

  atualizarData();
  formatoDataMobile.addEventListener("change", atualizarData);

  botaoDataAnterior.addEventListener("click", () => {
    alterarData(-1);
  });

  botaoDataProxima.addEventListener("click", () => {
    alterarData(1);
  });

  botaoEscolherData.addEventListener("click", () => {
    seletorData.value = formatarDataISO(dataSelecionada);

    const posicaoBotao = botaoEscolherData.getBoundingClientRect();
    seletorData.style.left = `${posicaoBotao.left}px`;
    seletorData.style.top = `${posicaoBotao.top}px`;
    seletorData.style.width = `${posicaoBotao.width}px`;
    seletorData.style.height = `${posicaoBotao.height}px`;

    if (typeof seletorData.showPicker === "function") {
      seletorData.showPicker();
    } else {
      seletorData.click();
    }
  });

  seletorData.addEventListener("change", () => {
    if (!seletorData.value) return;

    const [ano, mes, dia] = seletorData.value.split("-").map(Number);

    dataSelecionada = new Date(ano, mes - 1, dia);
    atualizarData();
  });

  botoesPeriodo.forEach(botao => {
    botao.addEventListener("click", () => {
      botoesPeriodo.forEach(item => {
        item.classList.remove("csa-filter-active");
      });

      botao.classList.add("csa-filter-active");

      const nomePeriodo = botao.textContent.trim();
      periodoSelecionado = mapaPeriodos[nomePeriodo];

      aplicarFiltros();
    });
  });

  filtroDisponibilidade.addEventListener("change", () => {
    aplicarFiltros();
  });

  botoesReserva.forEach(botao => {
    botao.addEventListener("click", () => {
      const evento = botao.closest(".csa-event");
      const espaco = evento.querySelector(".csa-event-space").textContent.trim();
      const periodo = evento.closest(".csa-period");

      let nomePeriodo = "";

      if (periodo.classList.contains("csa-period-morning")) {
        nomePeriodo = "Manhã";
      } else if (periodo.classList.contains("csa-period-afternoon")) {
        nomePeriodo = "Tarde";
      } else if (periodo.classList.contains("csa-period-night")) {
        nomePeriodo = "Noite";
      }

      const reserva = {
        espaco: espaco,
        periodo: nomePeriodo,
        data: formatarData(dataSelecionada),
        dataISO: formatarDataISO(dataSelecionada)
      };

      document.dispatchEvent(
        new CustomEvent("csa:solicitar-reserva", {
          detail: reserva
        })
      );
    });
  });

  document.addEventListener("csa:solicitar-reserva", (event) => {
    const reserva = event.detail;

    const parametros = new URLSearchParams({
      espaco: reserva.espaco,
      periodo: reserva.periodo,
      data: reserva.dataISO
    });

    window.location.href = `${paginaFormularioReserva}?${parametros.toString()}`;
  });

  document.querySelectorAll(".csa-event-details").forEach(link => {
    link.addEventListener("click", (evento) => {
      evento.preventDefault();

      const url = new URL(link.getAttribute("href"), window.location.href);
      url.searchParams.set("data", formatarDataISO(dataSelecionada));

      window.location.href = url.toString();
    });
  });

  aplicarFiltros();
});