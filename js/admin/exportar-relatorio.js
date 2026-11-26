const csaExportarRelatorio = (() => {
  const formatarData = data => data.split('-').reverse().join('/');
  const marcaRelatorio = new URL('../../assets/reservas/csca-gov.png', document.currentScript.src).href;

  function conectar(botao, { periodo, exportar }) {
    const dialogo = document.createElement('dialog');
    dialogo.className = 'csa-relatorio-dialogo';
    dialogo.setAttribute('aria-labelledby', 'csa-relatorio-titulo');
    dialogo.innerHTML = `
      <form novalidate>
        <h2 id="csa-relatorio-titulo">Exportar relatório em PDF</h2>
        <p>Selecione o período que deseja incluir no relatório.</p>
        <div class="csa-relatorio-datas">
          <label>Data inicial <input type="date" name="inicio" required autofocus></label>
          <label>Data final <input type="date" name="fim" required></label>
        </div>
        <p class="csa-relatorio-erro" role="alert"></p>
        <div class="csa-relatorio-acoes">
          <button type="button" data-cancelar>Cancelar</button>
          <button type="submit">Exportar PDF</button>
        </div>
      </form>`;
    document.body.append(dialogo);
    botao.setAttribute('aria-haspopup', 'dialog');

    const form = dialogo.querySelector('form');
    const inicio = form.elements.inicio;
    const fim = form.elements.fim;
    const erro = form.querySelector('[role="alert"]');
    const cancelar = form.querySelector('[data-cancelar]');
    const confirmar = form.querySelector('[type="submit"]');
    let exportando = false;

    function limparErro() {
      erro.textContent = '';
      inicio.removeAttribute('aria-invalid');
      fim.removeAttribute('aria-invalid');
    }

    botao.addEventListener('click', () => {
      [inicio.value, fim.value] = periodo();
      limparErro();
      dialogo.showModal();
    });
    form.addEventListener('input', limparErro);
    cancelar.addEventListener('click', () => dialogo.close());
    dialogo.addEventListener('cancel', evento => {
      if (exportando) evento.preventDefault();
    });
    form.addEventListener('submit', async evento => {
      evento.preventDefault();
      if (exportando) return;
      limparErro();
      const invalido = [inicio, fim].find(campo => !campo.validity.valid || !/^\d{4}-\d{2}-\d{2}$/.test(campo.value));
      const campo = invalido || (fim.value < inicio.value ? fim : null);
      if (campo) {
        erro.textContent = invalido
          ? 'Preencha as duas datas com valores válidos.'
          : 'A data final deve ser igual ou posterior à data inicial.';
        campo.setAttribute('aria-invalid', 'true');
        campo.focus();
        return;
      }

      exportando = true;
      const datas = [inicio.value, fim.value];
      [inicio, fim, cancelar, confirmar].forEach(controle => { controle.disabled = true; });
      confirmar.textContent = 'Gerando PDF…';
      try {
        await exportar(...datas);
        dialogo.close();
      } catch (falha) {
        erro.textContent = falha.message || 'Não foi possível gerar o relatório. Tente novamente.';
      } finally {
        exportando = false;
        [inicio, fim, cancelar, confirmar].forEach(controle => { controle.disabled = false; });
        confirmar.textContent = 'Exportar PDF';
        if (dialogo.open) confirmar.focus();
      }
    });
  }

  async function imprimirDemonstracao({ titulo, inicio, fim, colunas, linhas }) {
    document.querySelector('.csa-relatorio-impressao')?.remove();
    const relatorio = document.createElement('section');
    relatorio.className = 'csa-relatorio-impressao';
    const cabecalho = document.createElement('header');
    cabecalho.className = 'csa-relatorio-marca';
    const marca = document.createElement('img');
    marca.src = marcaRelatorio;
    marca.alt = 'Casa dos Saberes Cego Aderaldo e Governo do Ceará';
    cabecalho.append(marca);
    const tituloRelatorio = document.createElement('h1');
    tituloRelatorio.textContent = titulo;
    const periodo = document.createElement('p');
    periodo.textContent = `${formatarData(inicio)} a ${formatarData(fim)} · Demonstração`;
    relatorio.append(cabecalho, tituloRelatorio, periodo);
    if (linhas.length) {
      const tabela = document.createElement('table');
      const titulos = tabela.createTHead().insertRow();
      for (const coluna of colunas) {
        const celula = document.createElement('th');
        celula.scope = 'col';
        celula.textContent = coluna;
        titulos.append(celula);
      }
      const corpo = tabela.createTBody();
      for (const linha of linhas) {
        const registro = corpo.insertRow();
        for (const valor of linha) registro.insertCell().textContent = valor;
      }
      relatorio.append(tabela);
    } else {
      const vazio = document.createElement('p');
      vazio.textContent = 'Nenhum registro encontrado para este período e filtro.';
      relatorio.append(vazio);
    }
    document.body.append(relatorio);
    await marca.decode().catch(() => {});
    window.addEventListener('afterprint', () => relatorio.remove(), { once: true });
    window.print();
  }

  return { conectar, imprimirDemonstracao, formatarData };
})();
