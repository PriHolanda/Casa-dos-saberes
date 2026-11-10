
document.addEventListener("DOMContentLoaded", () => {

    // ==========================================
    // 1. SELECIONANDO OS ELEMENTOS DO HTML
    // ==========================================

    const dataAtualElemento = document.querySelector(
        ".csa-date-current"
    );
    const formatoDataMobile = window.matchMedia("(max-width: 768px)");

    const botoesData = document.querySelectorAll(
        ".csa-date-button"
    );

    const botaoDataAnterior = botoesData[0];
    const botaoDataProxima = botoesData[1];

    const botaoEscolherData = document.querySelector(
        ".csa-date-picker"
    );

    const filtroDisponibilidade = document.querySelector(
        ".csa-available-checkbox"
    );

    const botoesPeriodo = document.querySelectorAll(
        ".csa-filter-btn"
    );

    const periodos = document.querySelectorAll(
        ".csa-period"
    );

    const botoesReserva = document.querySelectorAll(
        ".csa-event-reserve"
    );


    // ==========================================
    // 2. CONTROLE DA DATA
    // ==========================================

    // Data inicial exibida no HTML
    let dataSelecionada = new Date(2026, 8, 21);

    // Formata a data para exibição
    function formatarData(data) {

        return data.toLocaleDateString("pt-BR", {
            weekday: "long",
            day: "numeric",
            month: "long"
        });

    }

    function formatarDataMobileCompacta(data) {

        const dataFormatada = data.toLocaleDateString("pt-BR", {
            weekday: "short",
            day: "numeric",
            month: "long",
            year: "numeric"
        });

        return dataFormatada.charAt(0).toUpperCase() +
            dataFormatada.slice(1).replace(",", "");

    }

    // Atualiza o texto da data na tela
    function atualizarData() {

        dataAtualElemento.textContent = formatoDataMobile.matches
            ? formatarDataMobileCompacta(dataSelecionada)
            : formatarData(dataSelecionada).replace(/^./, letra => letra.toUpperCase());

    }

    // Formata para o padrão YYYY-MM-DD
    function formatarDataISO(data) {

        const ano = data.getFullYear();

        const mes = String(data.getMonth() + 1).padStart(2, "0");

        const dia = String(data.getDate()).padStart(2, "0");

        return `${ano}-${mes}-${dia}`;

    }

    // Altera a data
    function alterarData(dias) {

        dataSelecionada.setDate(
            dataSelecionada.getDate() + dias
        );

        atualizarData();

        console.log("Data selecionada:", formatarDataISO(dataSelecionada));

        // Futuramente: buscar os eventos dessa data na API

    }

    // Inicializa a data
    atualizarData();
    formatoDataMobile.addEventListener("change", atualizarData);

    // Voltar um dia
    botaoDataAnterior.addEventListener("click", () => {
        alterarData(-1);
    });

    // Avançar um dia
    botaoDataProxima.addEventListener("click", () => {
        alterarData(1);
    });


    // ==========================================
    // 3. ESCOLHER DATA NO CALENDÁRIO
    // ==========================================

    const seletorData = document.querySelector(".csa-date-input");

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

        const [ano, mes, dia] = seletorData.value
            .split("-")
            .map(Number);

        dataSelecionada = new Date(ano, mes - 1, dia);

        atualizarData();

    });


    // ==========================================
    // 4. FILTRO DE PERÍODO
    // ==========================================

    let periodoSelecionado = "todos";

    // Relaciona os nomes dos botões às classes do HTML
    const mapaPeriodos = {
        "Todos": "todos",
        "Manhã": "morning",
        "Tarde": "afternoon",
        "Noite": "night"
    };

    // Aplica os filtros da agenda
    function aplicarFiltros() {

        periodos.forEach(periodo => {

            const periodoVisivel =
                periodoSelecionado === "todos" ||
                periodo.classList.contains(
                    `csa-period-${periodoSelecionado}`
                );

            const eventos = periodo.querySelectorAll(
                ".csa-event"
            );

            let possuiEventoVisivel = false;

            eventos.forEach(evento => {

                // Verifica se o evento está disponível
                const estaDisponivel = evento.classList.contains(
                    "csa-event-available"
                );

                // Verifica o filtro de disponibilidade
                const deveMostrar =
                    !filtroDisponibilidade.checked || estaDisponivel;

                // Mostra ou esconde o cartão
                evento.style.display = deveMostrar ? "flex" : "none";

                if (deveMostrar) {
                    possuiEventoVisivel = true;
                }

            });

            // Esconde o período se não houver eventos visíveis
            periodo.style.display =
                periodoVisivel && possuiEventoVisivel
                    ? ""
                    : "none";

        });

    }

    // Clique nos botões de período
    botoesPeriodo.forEach(botao => {

        botao.addEventListener("click", () => {

            // Remove a seleção dos outros botões
            botoesPeriodo.forEach(item => {
                item.classList.remove("csa-filter-active");
            });

            // Ativa o botão clicado
            botao.classList.add("csa-filter-active");

            // Identifica o período escolhido
            const nomePeriodo = botao.textContent.trim();

            periodoSelecionado = mapaPeriodos[nomePeriodo];

            // Atualiza a agenda
            aplicarFiltros();

        });

    });


    // ==========================================
    // 5. FILTRO SOMENTE DISPONÍVEIS
    // ==========================================

    filtroDisponibilidade.addEventListener("change", () => {

        aplicarFiltros();

    });


    // ==========================================
    // 6. SOLICITAR RESERVA
    // ==========================================

    botoesReserva.forEach(botao => {

        botao.addEventListener("click", () => {

            // Identifica o cartão clicado
            const evento = botao.closest(".csa-event");

            // Identifica o espaço
            const espaco = evento.querySelector(
                ".csa-event-space"
            ).textContent.trim();

            // Identifica o período
            const periodo = evento.closest(".csa-period");

            let nomePeriodo = "";

            if (periodo.classList.contains("csa-period-morning")) {
                nomePeriodo = "Manhã";
            } else if (periodo.classList.contains("csa-period-afternoon")) {
                nomePeriodo = "Tarde";
            } else if (periodo.classList.contains("csa-period-night")) {
                nomePeriodo = "Noite";
            }

            // Organiza as informações da reserva
            const reserva = {
                espaco: espaco,
                periodo: nomePeriodo,
                data: formatarData(dataSelecionada),
                dataISO: formatarDataISO(dataSelecionada)
            };

            // Dispara o evento para integração com o formulário
            document.dispatchEvent(
                new CustomEvent("csa:solicitar-reserva", {
                    detail: reserva
                })
            );

        });

    });


    // ==========================================
    // 7. RECEBER SOLICITAÇÃO DE RESERVA
    // ==========================================

    document.addEventListener("csa:solicitar-reserva", (event) => {

        const reserva = event.detail;

        console.log("Informações da reserva:");
        console.log("Espaço:", reserva.espaco);
        console.log("Período:", reserva.periodo);
        console.log("Data:", reserva.data);
        console.log("Data ISO:", reserva.dataISO);

        // Futuramente:
        // Salvar as informações e abrir o formulário de reserva.

    });


    // ==========================================
    // 8. INICIALIZAÇÃO
    // ==========================================

    aplicarFiltros();

});
