const { spawn } = require('node:child_process');
const { mkdtempSync, writeFileSync } = require('node:fs');
const { tmpdir } = require('node:os');
const path = require('node:path');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { runInNewContext } = require('node:vm');
const camposVisita = runInNewContext(readFileSync(path.join(__dirname, '../js/visita-mediada/modelo.js'), 'utf8') + '\ncsaVisitasModelo.campos');
const perfil = mkdtempSync(path.join(tmpdir(), 'csa-dashboard-'));
const origem = process.env.CSA_BASE_URL || 'http://127.0.0.1:3000/';
const chrome = spawn(process.env.CSA_CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless', '--disable-gpu', '--no-first-run', '--remote-debugging-port=0', `--user-data-dir=${perfil}`]);
const limite = setTimeout(() => { chrome.kill(); console.error('Tempo de teste excedido'); process.exit(1); }, 150000);
let ws;
(async () => {
  const endereco = await new Promise((resolve, reject) => {
    let saida = '';
    chrome.on('error', reject);
    chrome.stderr.on('data', trecho => {
      saida += trecho;
      const match = saida.match(/DevTools listening on (ws:\/\/\S+)/);
      if (match) resolve(match[1]);
    });
  });
  ws = new WebSocket(endereco);
  await new Promise(resolve => ws.addEventListener('open', resolve, { once: true }));
  let id = 0;
  const pendentes = new Map();
  const erros = [];
  let falharVisitas = false;
  let horariosInvalidos = false;
  let recusarEnvio = true;
  let eventos = [
    { id: 1, origem: 'administrativo', titulo: 'Campeonato de Farmar Aura', descricao: 'Apresentação cultural para a comunidade.', responsavel: 'João Ferreira da Silva', celular: '(85) 12345-6789', espaco_id: 1, publico_estimado: 100, classificacao_indicativa: 'Livre', status: 'aceito', data_inicio: '2026-09-21T09:00:00', data_fim: '2026-09-21T12:00:00' },
    { id: 2, origem: 'solicitacao_publica', arquivo_pdf_id: 5, titulo: 'Apresentação da banda', descricao: 'Apresentação musical para a comunidade.', espaco_id: 2, status: 'aceito', data_inicio: '2026-09-21T10:00:00', data_fim: '2026-09-21T12:00:00' },
    { id: 3, origem: 'solicitacao_publica', titulo: 'Apresentação legal', descricao: 'Atividade cultural para a comunidade.', responsavel: 'Maria da Silva', espaco_id: 3, status: 'pendente', data_inicio: '2026-09-21T14:00:00', data_fim: '2026-09-21T16:00:00' }
  ];
  const visitas = [
    { id: 1, instituicao: 'Universidade Federal do Ceará', nome_responsavel: 'Responsável pela visita', status: 'aprovada', data_inicio: '2026-09-21T17:00:00Z', data_fim: '2026-09-21T18:00:00Z' },
    { id: 2, instituicao: 'Visita cancelada', status: 'cancelada', data_inicio: '2026-09-22T08:00:00', data_fim: '2026-09-22T09:00:00' },
    { id: 3, instituicao: 'Visita sem status conhecido', status: 'novo-status', data_inicio: '2026-09-23T08:00:00', data_fim: '2026-09-23T09:00:00' },
    { id: 4, instituicao: 'Solicitação pendente', status: 'pendente', data_inicio: '2026-09-24T08:00:00', data_fim: '2026-09-24T09:00:00' }
  ];
  const requisicoes = [];
  let cmd;
  ws.addEventListener('message', async evento => {
    const mensagem = JSON.parse(evento.data);
    if (mensagem.method === 'Runtime.exceptionThrown') erros.push(mensagem.params.exceptionDetails);
    if (mensagem.method === 'Fetch.requestPaused') {
      const { requestId, request } = mensagem.params;
      const url = new URL(request.url);
      const rota = url.pathname;
      requisicoes.push({ rota, metodo: request.method, busca: url.searchParams });
      let body, code = 200, formato = 'application/json';
      if (request.method === 'OPTIONS') { body = null; code = 204; }
      else if (rota === '/usuarios/me') body = { id: 1, nome: 'Admin' };
      else if (rota === '/eventos/' && request.method === 'GET') body = { eventos };
      else if (rota.endsWith('/status') && request.method === 'PATCH') {
        const id = Number(rota.split('/')[2]);
        const registros = rota.startsWith('/visitas/') ? visitas : eventos;
        const registro = registros.find(item => item.id === id);
        Object.assign(registro, JSON.parse(request.postData));
        body = registro;
      } else if (rota.startsWith('/eventos/') && ['POST', 'PUT'].includes(request.method)) {
        const registro = { ...JSON.parse(request.postData), id: request.method === 'POST' ? 50 : Number(rota.split('/').pop()) };
        if (request.method === 'POST') registro.status = 'aceito';
        eventos = eventos.filter(item => item.id !== registro.id).concat(registro);
        body = registro;
      } else if (rota.startsWith('/eventos/') && request.method === 'DELETE') {
        eventos = eventos.filter(item => item.id !== Number(rota.split('/').pop()));
        body = null; code = 204;
      } else if (rota === '/visitas/' && request.method === 'POST') {
        if (recusarEnvio) { code = 503; body = { detail: 'Envio indisponível no teste' }; }
        else { code = 201; body = { id: 42, status: 'pendente' }; }
      } else if (rota === '/visitas/') {
        body = falharVisitas ? { detail: 'Visitas indisponíveis no teste' } : { visitas };
        if (falharVisitas) code = 503;
      } else if (rota === '/visitas/disponibilidade') {
        const data = url.searchParams.get('data');
        body = horariosInvalidos ? { data } : { data, horarios_reservaveis: [
          { data_inicio: data + 'T10:00:00', data_fim: data + 'T12:00:00' },
          { data_inicio: data + 'T15:00:00', data_fim: data + 'T18:00:00' }
        ] };
      } else if (rota === '/visitas/formulario') body = { campos: camposVisita };
      else if (rota === '/exposicoes/') body = { exposicoes: [] };
      else if (rota === '/exposicoes/administracao') body = { salas: [{ id: 1, nome: 'Sala expositiva 1' }], exposicoes: [] };
      else if (rota === '/relatorios/agendamentos' || rota === '/eventos/2/proposta') {
        formato = 'application/pdf';
        body = '%PDF-1.4';
      }
      else { body = { detail: 'Rota não definida no teste' }; code = 404; }
      try { await cmd('Fetch.fulfillRequest', { requestId, responseCode: code, responseHeaders: [{ name: 'Content-Type', value: formato }, { name: 'Access-Control-Allow-Origin', value: '*' }, { name: 'Access-Control-Allow-Headers', value: 'Authorization, Content-Type' }, { name: 'Access-Control-Allow-Methods', value: 'GET, POST, PUT, PATCH, DELETE, OPTIONS' }], body: Buffer.from(code === 204 ? '' : (formato === 'application/pdf' ? body : JSON.stringify(body))).toString('base64') }); } catch {}
    }
    if (pendentes.has(mensagem.id)) {
      const { resolve, reject } = pendentes.get(mensagem.id);
      pendentes.delete(mensagem.id);
      mensagem.error ? reject(new Error(JSON.stringify(mensagem.error))) : resolve(mensagem.result);
    }
  });
  const cdp = (method, params = {}, sessionId) => new Promise((resolve, reject) => {
    pendentes.set(++id, { resolve, reject }); ws.send(JSON.stringify({ id, method, params, sessionId }));
  });
  const { targetId } = await cdp('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await cdp('Target.attachToTarget', { targetId, flatten: true });
  cmd = (method, params) => cdp(method, params, sessionId);
  await cmd('Page.enable');
  await cmd('Runtime.enable');
  await cmd('Fetch.enable', { patterns: [{ urlPattern: 'http://127.0.0.1:8000/*', requestStage: 'Request' }] });
  const { identifier: inicializacao } = await cmd('Page.addScriptToEvaluateOnNewDocument', { source: `const RelogioOriginal = Date; globalThis.Date = class extends RelogioOriginal { constructor(...args) { super(...(args.length ? args : ['2026-09-21T10:00:00-03:00'])); } static now() { return new RelogioOriginal('2026-09-21T10:00:00-03:00').getTime(); } }; sessionStorage.setItem('csa-sessao', JSON.stringify({token:'teste-de-navegador', expira:Date.now()+3600000})); window.confirm = () => true;` });
  const avaliar = async expression => {
    const r = await cmd('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    assert.ok(!r.exceptionDetails, JSON.stringify(r.exceptionDetails)); return r.result.value;
  };
  const esperar = async expression => {
    for (let tentativa = 0; tentativa < 150; tentativa++) {
      if (await avaliar(expression)) return;
      await new Promise(resolve => setTimeout(resolve, 75));
    }
    throw new Error(`Não ficou pronto: ${expression}. Tela: ${await avaliar('document.body.innerText.slice(0, 1800)')}. Erros: ${JSON.stringify(erros)}. Requisições: ${JSON.stringify(requisicoes)}`);
  };
  const abrir = async pagina => {
    const destino = new URL(pagina, origem);
    await cmd('Page.navigate', { url: destino.href });
    await esperar("document.readyState === 'complete'");
  };
  const capturar = async nome => {
    await avaliar('document.fonts.ready.then(() => true)');
    await new Promise(resolve => setTimeout(resolve, 250));
    const captura = await cmd('Page.captureScreenshot', { captureBeyondViewport: true });
    writeFileSync(path.join(perfil, `${nome}.png`), Buffer.from(captura.data, 'base64'));
  };
  const estilosAdministrativos = async () => avaliar(`({
    pdf: ['width','height','fontFamily','fontSize','fontWeight','color','backgroundColor','border','borderRadius','padding','gap'].map(propriedade=>getComputedStyle(document.querySelector('.csa-exportar-pdf'))[propriedade]),
    icone: document.querySelector('.csa-exportar-pdf svg').outerHTML,
    card: ['minHeight','padding','borderRadius','borderWidth','fontFamily'].map(propriedade=>getComputedStyle(document.querySelector('.csa-visitas-card, .csa-grid .csa-event-card'))[propriedade]),
    titulo: ['fontSize','fontWeight','textAlign'].map(propriedade=>getComputedStyle(document.querySelector('h1'))[propriedade]),
    principal: ['paddingTop','paddingLeft','paddingRight'].map(propriedade=>getComputedStyle(document.querySelector('main'))[propriedade])
  })`);
  const referenciasVisitas = new Map();
  const conferirBotoesAcao = async () => {
    const botoes = await avaliar("[...document.querySelectorAll('[data-acao=aprovar], [data-acao=negar], [data-acao=cancelar]')].filter(no=>no.getClientRects().length).map(no=>({acao:no.dataset.acao, altura:no.getBoundingClientRect().height, fonte:getComputedStyle(no).fontSize, peso:getComputedStyle(no).fontWeight, raio:getComputedStyle(no).borderRadius, padding:getComputedStyle(no).padding, cor:getComputedStyle(no).backgroundColor}))");
    assert.ok(botoes.length > 0);
    for(const botao of botoes) {
      assert.equal(botao.altura,42);
      assert.equal(botao.fonte,'14px');
      assert.equal(botao.peso,'600');
      assert.equal(botao.raio,'4px');
      assert.equal(botao.padding,'8px 16px');
      assert.equal(botao.cor,botao.acao==='aprovar'?'rgb(7, 145, 53)':'rgb(162, 45, 46)');
    }
  };
  const testarFiltroDashboard = async (eventos, visitas, pautas = eventos) => {
    const indicadores = await avaliar("[...document.querySelectorAll('.csa-dashboard-card__valor')].map(no=>no.textContent)");
    assert.deepEqual(await avaliar("[...document.getElementById('csa-filtro-status').options].map(no=>no.textContent)"), ['Todos','Sugestões de pauta','Visitas mediadas']);
    for (const [tipo, totalEventos, totalVisitas] of [['pautas',pautas,0],['visitas',0,visitas],['todos',eventos,visitas]]) {
      await avaliar(`document.getElementById('csa-filtro-status').value='${tipo}'; document.getElementById('csa-filtro-status').dispatchEvent(new Event('change'))`);
      assert.equal(await avaliar("document.querySelectorAll('.csa-grid [data-evento-id]').length"), totalEventos);
      assert.equal(await avaliar("document.querySelectorAll('.csa-grid [data-visita-id]').length"), totalVisitas);
      assert.deepEqual(await avaliar("[...document.querySelectorAll('.csa-dashboard-card__valor')].map(no=>no.textContent)"), indicadores);
    }
  };
  const conferirConsulta = async () => {
    assert.equal(await avaliar("document.querySelectorAll('[data-acao], #csa-btn-pdf, .csa-disponibilidade__adicionar, #csa-painel form').length"), 0);
    await avaliar("csaPainel.mostrarCadastro('2026-09-21', 'manha'); document.dispatchEvent(new CustomEvent('csa:abrir-cadastro', {detail:{data:'2026-09-21', turno:'manha'}}))");
    assert.equal(await avaliar("document.querySelector('#csa-painel form')"), null);
    assert.equal(await avaliar("document.querySelectorAll('#csa-painel button:not([data-fechar-painel])').length"), 0);
  };
  const testarGerenciamento = async (demo, width) => {
    await cmd('Emulation.setDeviceMetricsOverride', { width, height:1100, deviceScaleFactor:1, mobile:width < 769 });
    const inicioChamadas = requisicoes.length;
    const pendente = demo ? 'demo-evento-3' : '3';
    const novo = demo ? 'demo-evento-13' : '50';
    const total = demo ? 12 : 3;
    const grade = width < 769 ? '.csa-semanal-mobile' : '.csa-grid';
    await abrir(`pages/admin/sugestoes-pauta.html${demo ? '?demo=1' : ''}`);
    await esperar(`!document.getElementById('csa-agenda').inert && document.querySelector('${grade} [data-evento-id="${pendente}"]')`);
    assert.equal(await avaliar("document.querySelector('.csa-navbar-link[aria-current] span').textContent"), 'Sugestões de pauta');
    assert.equal(await avaliar("document.querySelectorAll('.csa-dashboard-card, [data-visita-id]').length"), 0);
    assert.equal(await avaliar("document.querySelectorAll('.csa-grid [data-evento-id]').length"), total);
    assert.ok(await avaliar('document.documentElement.scrollWidth <= innerWidth'));
    if (referenciasVisitas.has(width)) assert.deepEqual(await estilosAdministrativos(), referenciasVisitas.get(width));
    await capturar(`pautas-${demo ? 'demo' : 'api'}-${width}`);
    await avaliar(`window.confirm=()=>true; document.querySelector('${grade} [data-evento-id="${pendente}"]').click()`);
    assert.deepEqual(await avaliar("[...document.querySelectorAll('#csa-painel .csa-painel__campo > span')].map(no=>no.textContent)"),['Nome do Evento','Solicitante','Celular','Espaço','Turno','Data','Horário','Público estimado','Classificação indicativa','Descrição']);
    const valores = await avaliar("[...document.querySelectorAll('#csa-painel .csa-painel__campo p')].map(no=>no.textContent)");
    assert.deepEqual(valores,await avaliar(`{ const e=csaDadosAgenda.buscarEvento('${pendente}'); [e.nome,e.solicitante,e.celular,csaDadosAgenda.espacos.find(s=>s.id===e.espacoId).nome,'Tarde',csaAgendaModelo.formatarDia(e.inicio.slice(0,10)),e.horarioInicio+' às '+e.horarioTermino,e.publico,e.classificacao,e.descricao].map(valor=>valor?String(valor):'Não informado'); }`));
    assert.equal(await avaliar("document.querySelectorAll('#csa-painel .csa-painel__dados > .csa-painel__campo').length"),7);
    assert.deepEqual(await avaliar("[...document.querySelectorAll('#csa-painel .csa-painel__metadados .csa-painel__campo > span')].map(no=>no.textContent)"),['Turno','Data','Horário']);
    assert.equal(await avaliar("document.querySelectorAll('#csa-painel .csa-painel__quadro').length"),0);
    await capturar(`pautas-detalhes-${demo?'demo':'api'}-${width}`);
    await conferirBotoesAcao();
    await avaliar("document.querySelector('[data-acao=aprovar]').click()");
    await esperar(`csaDadosAgenda.buscarEvento('${pendente}').status === 'aceito'`);
    await avaliar("document.querySelector('[data-acao=editar]').click(); document.querySelector('#csa-painel [name=nome]').value='Evento revisado'; document.querySelector('#csa-painel form').requestSubmit()");
    await esperar(`csaDadosAgenda.buscarEvento('${pendente}').nome === 'Evento revisado' && !document.querySelector('#csa-painel form')`);
    assert.equal(await avaliar(`csaDadosAgenda.buscarEvento('${pendente}').status`), 'aceito');
    assert.equal(await avaliar("document.querySelectorAll('.csa-grid [data-evento-id]').length"), total);
    await avaliar("document.querySelector('[data-acao=excluir]').click()");
    await esperar(`!csaDadosAgenda.buscarEvento('${pendente}')`);
    await avaliar(`document.querySelector('${grade} [data-acao="adicionar-evento"]').click()`);
    await avaliar("{ const f=document.getElementById('csa-form-evento'); f.elements.espacoId.value='1'; f.elements.nome.value='Solicitação de teste'; f.elements.solicitante.value='Equipe de teste'; f.elements.descricao.value='Atividade cultural de teste para a comunidade.'; f.elements.publico.value='20'; f.requestSubmit(); }");
    await esperar(`Boolean(csaDadosAgenda.buscarEvento('${novo}')) && !document.querySelector('#csa-painel form')`);
    assert.equal(await avaliar(`csaDadosAgenda.buscarEvento('${novo}').status`), 'aceito');
    await avaliar("document.querySelector('[data-acao=excluir]').click()");
    await esperar(`!csaDadosAgenda.buscarEvento('${novo}')`);
    await avaliar("window.csaImpressoes=0; window.print=()=>window.csaImpressoes++; document.getElementById('csa-btn-pdf').click()");
    if (demo) assert.equal(await avaliar('window.csaImpressoes'), 1);
    else {
      await esperar("!document.getElementById('csa-btn-pdf').disabled");
      assert.equal(await avaliar('window.csaImpressoes'), 0);
      assert.ok(requisicoes.slice(inicioChamadas).some(chamada => chamada.rota === '/relatorios/agendamentos'));
    }
    await cmd('Emulation.setEmulatedMedia', {media:'print'});
    assert.equal(await avaliar("getComputedStyle(document.querySelector('.csa-grid')).display"), 'table');
    assert.ok(await avaliar("[...document.querySelectorAll('.csa-disponibilidade__adicionar, .csa-navbar-header, #csa-btn-pdf')].every(no=>!no.getClientRects().length)"));
    if (width < 769) assert.equal(await avaliar("getComputedStyle(document.querySelector('.csa-semanal-mobile')).display"), 'none');
    const pdf = await cmd('Page.printToPDF', {landscape:true, printBackground:true, paperWidth:8.27, paperHeight:11.69});
    const arquivo = Buffer.from(pdf.data, 'base64');
    assert.equal(arquivo.subarray(0,5).toString(), '%PDF-');
    assert.ok(arquivo.length > 10000);
    writeFileSync(path.join(perfil, `pautas-${demo ? 'demo' : 'api'}-${width}.pdf`), arquivo);
    await cmd('Emulation.setEmulatedMedia', {media:''});
    await avaliar("document.getElementById('csa-filtro-status').value='aceito'; document.getElementById('csa-filtro-status').dispatchEvent(new Event('change'))");
    assert.ok(await avaliar("[...document.querySelectorAll('.csa-grid [data-evento-id]')].every(no=>no.textContent.includes('Aceito'))"));
    await avaliar("document.querySelector('[data-visao=diaria]').click(); document.querySelector('[data-direcao=\"1\"]').click()");
    assert.ok(await avaliar("document.getElementById('csa-data').textContent.includes('22 de setembro')"));
    const chamadas = requisicoes.slice(inicioChamadas);
    assert.equal(chamadas.filter(chamada=>chamada.rota.startsWith('/visitas')).length, 0);
    if (demo) {
      assert.equal(chamadas.length, 0, 'Sugestões em demo acessou a API');
      assert.equal(await avaliar("sessionStorage.getItem('csa-sessao')"), null);
    } else for (const metodo of ['POST','PUT','PATCH','DELETE']) assert.ok(chamadas.some(chamada=>chamada.metodo===metodo));
    await avaliar("document.querySelectorAll('.csa-navbar-link')[0].click()");
    await esperar("location.pathname.endsWith('/admin/agenda.html') && document.readyState==='complete' && document.querySelector('.csa-event-card--visita')");
    await conferirConsulta();
  };
  for (const width of [1512, 402, 320, 768]) {
    await cmd('Emulation.setDeviceMetricsOverride', { width, height: 1100, deviceScaleFactor: 1, mobile: width <= 768 });
    await abrir('pages/admin/agenda.html');
    await esperar("document.getElementById('csa-indicador-total').textContent === '7'");
    assert.equal(await avaliar("document.getElementById('csa-indicador-visitas').textContent"), '4');
    assert.equal(await avaliar("document.getElementById('csa-indicador-pendentes').textContent"), '2');
    assert.equal(await avaliar("document.getElementById('csa-indicador-pautas').textContent"), '2');
    assert.ok(await avaliar('document.documentElement.scrollWidth <= innerWidth'), `Overflow dashboard ${width}`);
    if (width === 1512) {
      await avaliar("document.querySelector('[data-evento-id=\"1\"]').click()");
      assert.equal(await avaliar("document.getElementById('csa-painel').hidden"), false);
      assert.ok(await avaliar("document.getElementById('csa-painel').getBoundingClientRect().left > document.getElementById('csa-agenda').getBoundingClientRect().left"));
    }
    await capturar(`dashboard-${width}`);
    await conferirConsulta();
    await testarFiltroDashboard(3, 4, 2);
    await avaliar("document.getElementById('csa-filtro-status').value = 'pautas'; document.getElementById('csa-filtro-status').dispatchEvent(new Event('change'))");
    assert.equal(await avaliar("document.querySelectorAll('.csa-grid [data-evento-id]').length"), 2);
    assert.equal(await avaliar("document.querySelectorAll('.csa-grid .csa-event-card--visita').length"), 0);
    await avaliar("document.querySelector('[data-visao=diaria]').click()");
    assert.equal(await avaliar("document.querySelectorAll('.csa-grid__celula').length"), 3);
    await testarFiltroDashboard(3, 1, 2);
    await avaliar("document.querySelector('[data-direcao=\"1\"]').click()");
    assert.ok(await avaliar("document.getElementById('csa-data').textContent.includes('22 de setembro')"));
    if (width === 402) {
      await avaliar("document.querySelector('.csa-navbar-botao').click()");
      assert.equal(await avaliar("document.querySelector('.csa-navbar-botao').getAttribute('aria-expanded')"), 'true');
      await avaliar("document.querySelector('.csa-navbar-botao').click(); document.querySelector('[data-visao=semanal]').click()");
      await esperar("document.querySelector('.csa-semanal-mobile [data-evento-id=\"3\"]')");
      await avaliar("document.querySelector('.csa-semanal-mobile [data-evento-id=\"3\"]').click()");
      assert.equal(await avaliar("Math.round(document.getElementById('csa-painel').getBoundingClientRect().width)"), width);
      await avaliar("document.querySelector('[data-fechar-painel]').click()");
    }
  }
  await cmd('Emulation.setDeviceMetricsOverride', { width: 1512, height: 1100, deviceScaleFactor: 1, mobile: false });
  await abrir('pages/admin/agenda.html');
  await esperar("document.querySelector('.csa-grid [data-evento-id=\"3\"]')");
  await avaliar("document.querySelector('.csa-grid [data-evento-id=\"3\"]').click()");
  await conferirConsulta();
  assert.ok(await avaliar("document.getElementById('csa-painel').textContent.includes('Detalhes da Solicitação')"));
  await avaliar("document.querySelector('.csa-grid [data-visita-id=\"1\"]').click()");
  assert.ok(await avaliar("document.getElementById('csa-painel').textContent.includes('Universidade Federal do Ceará')"));
  assert.ok(await avaliar("location.pathname.endsWith('/admin/agenda.html')"));
  await conferirConsulta();
  falharVisitas = true;
  await abrir('pages/admin/agenda.html');
  await esperar("document.getElementById('csa-dashboard-aviso').textContent.includes('Visitas indisponíveis')");
  assert.equal(await avaliar("document.getElementById('csa-indicador-total').textContent"), '—');
  assert.ok(await avaliar("document.querySelectorAll('.csa-grid [data-evento-id]').length > 0"));
  falharVisitas = false;
  for (const width of [1512, 402]) {
    await cmd('Emulation.setDeviceMetricsOverride', { width, height: 1100, deviceScaleFactor: 1, mobile: width === 402 });
    await abrir('pages/visita-mediada/admin/visitas.html?dia=2026-09-21');
    await esperar("document.querySelector('[data-visita-id]')");
    await avaliar("document.querySelector('[data-visao=semanal]').click()");
    assert.ok(await avaliar("document.getElementById('csa-visitas-grade').textContent.includes('Cancelada')"));
    assert.ok(await avaliar("document.getElementById('csa-visitas-grade').textContent.includes('Status desconhecido')"));
    assert.ok(await avaliar('document.documentElement.scrollWidth <= innerWidth'), `Overflow visitas ${width}`);
    referenciasVisitas.set(width, await estilosAdministrativos());
    assert.deepEqual(await avaliar("['manha','tarde'].map(turno=>getComputedStyle(document.querySelector('[data-turno='+turno+'] .csa-visitas-card')).borderTopColor)"), ['rgb(66, 103, 137)','rgb(162, 45, 46)']);
    await avaliar("document.querySelector('[data-visita-id=\"1\"]').click()");
    assert.equal(await avaliar("document.querySelector('[data-acao=cancelar]').disabled"), false);
    await avaliar("document.querySelector('.csa-visita-detalhe__fechar').click()");
    await capturar(`visitas-admin-${width}`);
    for (const pagina of ['editor-visitas.html', 'formulario-visita.html']) {
      await abrir(`pages/visita-mediada/admin/${pagina}`);
      assert.ok(await avaliar('document.documentElement.scrollWidth <= innerWidth'), `Overflow ${pagina}/${width}`);
      if (pagina === 'editor-visitas.html') await esperar("document.getElementById('csa-exposicoes-lista').textContent.includes('Nenhuma exposição cadastrada')");
      else await esperar("document.querySelectorAll('.csa-visita-campo__remover:disabled').length === 5");
    }
    await abrir('pages/visita-mediada/cliente/visitas.html');
    assert.equal(await avaliar("document.querySelectorAll('.csa-vp-exposicao').length"), 0);
    assert.ok(await avaliar('document.documentElement.scrollWidth <= innerWidth'));
    await abrir('pages/visita-mediada/cliente/detalhes-visita.html?exposicao=1');
    await esperar("document.getElementById('csa-detalhes-mensagem').textContent.includes('não está em cartaz')");
  }
  await abrir('pages/visita-mediada/cliente/horarios-visita.html?dia=2026-09-21');
  await esperar("document.querySelectorAll('[name=horario]').length === 6");
  assert.equal(await avaliar("document.querySelector('[name=horario][value=\"14:00\"]').disabled"), true);
  horariosInvalidos = true;
  await abrir('pages/visita-mediada/cliente/horarios-visita.html?dia=2026-09-21');
  await esperar("!document.getElementById('csa-vp-aviso').hidden");
  assert.equal(await avaliar("document.querySelectorAll('[name=horario]').length"), 0);
  horariosInvalidos = false;
  await abrir('pages/visita-mediada/cliente/formulario-visita.html?dia=2026-09-22&hora=10:40');
  await esperar("document.querySelector('[name=quantidadePcd]')");
  await avaliar("{ const f = document.getElementById('csa-vp-formulario'); for (const [nome, valor] of Object.entries({responsavel:'Maria da Silva', telefone:'85999999999', email:'maria@example.com', quantidade:'15', quantidadePcd:'16'})) f.elements[nome].value=valor; f.dispatchEvent(new Event('input', {bubbles:true})); }");
  assert.equal(await avaliar("document.querySelector('[name=quantidadePcd]').checkValidity()"), false);
  await avaliar("{ const f=document.getElementById('csa-vp-formulario'); f.elements.quantidadePcd.value='1'; f.elements.ciencia.checked=true; f.elements.logos.checked=true; f.dispatchEvent(new Event('input', {bubbles:true})); }");
  await cmd('Page.reload');
  await esperar("document.querySelector('[name=responsavel]')?.value === 'Maria da Silva'");
  await avaliar("document.getElementById('csa-vp-formulario').requestSubmit()");
  await esperar("location.pathname.endsWith('confirmacao-visita.html') && document.querySelector('.csa-confirmacao-botao--principal')");
  assert.ok(await avaliar("document.getElementById('csa-confirmacao-grade').textContent.includes('10:40 às 11:40')"));
  await avaliar("document.querySelector('.csa-confirmacao-botao--principal').click()");
  await esperar("document.getElementById('csa-confirmacao-estado').textContent.includes('Envio não concluído')");
  assert.ok(await avaliar("sessionStorage.getItem('csa-visita-rascunho').includes('Maria da Silva')"));
  await avaliar("document.querySelector('[data-csa-voltar]').click()");
  await esperar("document.querySelector('[name=responsavel]')?.value === 'Maria da Silva'");
  await abrir('pages/visita-mediada/admin/visitas.html?dia=2026-09-21&visitaId=1');
  await esperar("document.getElementById('csa-visita-detalhe').open");
  assert.ok(await avaliar("document.getElementById('csa-visita-detalhe-dados').textContent.includes('Universidade Federal do Ceará')"));
  assert.equal(requisicoes.filter(req => req.rota === '/visitas/' && req.metodo === 'POST').length, 1);
  recusarEnvio = false;
  await abrir('pages/visita-mediada/cliente/formulario-visita.html?dia=2026-09-22&hora=10:40');
  await esperar("document.querySelector('[name=responsavel]')?.value === 'Maria da Silva'");
  await avaliar("document.getElementById('csa-vp-formulario').requestSubmit()");
  await esperar("location.pathname.endsWith('confirmacao-visita.html') && document.querySelector('.csa-confirmacao-botao--principal')");
  await avaliar("document.querySelector('.csa-confirmacao-botao--principal').click()");
  await esperar("document.getElementById('csa-vp-sucesso')?.hidden === false");
  assert.equal(await avaliar("sessionStorage.getItem('csa-visita-rascunho')"), null);
  await abrir('pages/visita-mediada/admin/visitas.html?dia=2026-09-24&visitaId=4');
  await esperar("document.getElementById('csa-visita-detalhe').open");
  await avaliar("document.querySelector('[data-acao=negar]').click()");
  await esperar("document.querySelector('[data-visita-id=\"4\"]').textContent.includes('Negada')");
  await avaliar("document.getElementById('csa-visitas-filtro').value='negada'; document.getElementById('csa-visitas-filtro').dispatchEvent(new Event('change')); document.getElementById('csa-visitas-exportar').click()");
  await esperar("!document.getElementById('csa-visitas-exportar').disabled");
  assert.ok(requisicoes.some(pedido => pedido.rota === '/relatorios/agendamentos' && pedido.busca.get('status') === 'negado'));

  await abrir('pages/admin/agenda.html');
  await esperar("document.querySelector('[data-evento-id=\"2\"]')");
  await avaliar("document.querySelector('[data-evento-id=\"2\"]').click(); document.querySelector('[data-baixar-proposta]').click()");
  await esperar("!document.querySelector('[data-baixar-proposta]').disabled");
  assert.ok(requisicoes.some(pedido => pedido.rota === '/eventos/2/proposta'));

  const eventosOriginais = structuredClone(eventos);
  for (const width of [1512,402]) {
    eventos = structuredClone(eventosOriginais);
    await testarGerenciamento(false,width);
  }
  await cmd('Page.removeScriptToEvaluateOnNewDocument', { identifier: inicializacao });
  await avaliar("sessionStorage.removeItem('csa-sessao')");
  const chamadasAntesDemo = requisicoes.length;
  for (const width of [1512,402,320]) {
    await cmd('Emulation.setDeviceMetricsOverride', { width, height:1100, deviceScaleFactor:1, mobile:width<769 });
    await abrir('pages/visita-mediada/admin/visitas.html?demo=1');
    await esperar("document.querySelector('[data-visita-id]')");
    assert.equal(await avaliar("document.getElementById('csa-visitas-mensagem').hidden"), true);
    assert.ok(await avaliar('document.documentElement.scrollWidth <= innerWidth'));
    for (const visao of ['diaria','semanal']) {
      await avaliar(`document.querySelector('[data-visao=${visao}]').click()`);
      assert.deepEqual(await avaliar("['manha','tarde'].map(turno=>getComputedStyle(document.querySelector('[data-turno='+turno+'] .csa-visitas-card')).borderTopColor)"), ['rgb(66, 103, 137)','rgb(162, 45, 46)']);
      await capturar(`visitas-demo-${visao}-${width}`);
      await avaliar("window.csaImprimiu=false; window.print=()=>{window.csaImprimiu=true}; document.getElementById('csa-visitas-exportar').click()");
      assert.equal(await avaliar('window.csaImprimiu'), true);
      const pdf=await cmd('Page.printToPDF', {landscape:true, printBackground:true, paperWidth:8.27,paperHeight:11.69});
      assert.equal(Buffer.from(pdf.data,'base64').subarray(0,5).toString(),'%PDF-');
      writeFileSync(path.join(perfil,`visitas-${visao}-${width}.pdf`),Buffer.from(pdf.data,'base64'));
    }
    await avaliar("document.querySelector('[data-visita-id=\"6\"]').click()");
    await conferirBotoesAcao();
    assert.ok(await avaliar("document.querySelector('.csa-visita-detalhe__fechar').getBoundingClientRect().left > document.getElementById('csa-visita-detalhe-titulo').getBoundingClientRect().left"));
    assert.equal(await avaliar("document.getElementById('csa-visita-detalhe-aviso').hidden"), true);
    await avaliar("document.querySelector('[data-acao=aprovar]').click()");
    assert.ok(await avaliar("document.querySelector('[data-visita-id=\"6\"]').textContent.includes('Aceito')"));
    await avaliar("document.getElementById('csa-visitas-filtro').value='aprovada'; document.getElementById('csa-visitas-filtro').dispatchEvent(new Event('change'))");
    assert.ok(await avaliar("[...document.querySelectorAll('.csa-visitas-card')].every(no=>no.textContent.includes('Aceito'))"));
    await avaliar("document.querySelector('[data-visita-id]').click(); document.querySelector('[data-acao=cancelar]').click()");
    assert.equal(await avaliar("document.querySelectorAll('[data-visita-id=\"1\"]').length"),0);
    await avaliar("document.querySelector('[data-direcao=\"1\"]').click(); document.querySelector('[data-direcao=\"-1\"]').click()");
  }
  for (const width of [1512, 402, 320]) {
    await cmd('Emulation.setDeviceMetricsOverride', { width, height: 1100, deviceScaleFactor: 1, mobile: width < 769 });
    await abrir('pages/admin/agenda.html?demo=1');
    await esperar("document.getElementById('csa-indicador-total').textContent === '20'");
    assert.equal(await avaliar("sessionStorage.getItem('csa-sessao')"), null);
    assert.deepEqual(await avaliar("['total', 'pautas', 'visitas', 'pendentes'].map(id => document.getElementById('csa-indicador-' + id).textContent)"), ['20', '12', '8', '8']);
    assert.equal(await avaliar("document.getElementById('csa-dashboard-aviso').textContent"), '');
    assert.deepEqual(await avaliar("[...document.querySelectorAll('.csa-dashboard-card')].map(card=>getComputedStyle(card).backgroundColor)"), ['rgb(244, 230, 230)', 'rgb(249, 244, 254)', 'rgb(245, 251, 246)', 'rgb(255, 244, 226)']);
    assert.deepEqual(await avaliar("['auditorio','quintal','salas','varanda','visita'].map(tipo=>getComputedStyle(document.querySelector('.csa-grid .csa-event-card--'+tipo)).backgroundColor)"), ['rgb(236, 213, 213)', 'rgb(209, 224, 200)', 'rgb(230, 230, 230)', 'rgb(244, 223, 196)', 'rgb(255, 255, 255)']);
    assert.ok(await avaliar('document.documentElement.scrollWidth <= innerWidth'));
    assert.equal(await avaliar("document.getElementById('csa-painel').hidden"), width < 769);
    await capturar(`dashboard-demo-${width}`);
    await conferirConsulta();
    const grade = width < 769 ? '.csa-semanal-mobile' : '.csa-grid';
    await avaliar(`document.querySelector('${grade} [data-visita-id]').click()`);
    assert.ok(await avaliar("document.getElementById('csa-painel').textContent.includes('Detalhes da Visita Mediada')"));
    assert.equal(await avaliar('getComputedStyle(document.body).backgroundColor'), 'rgb(255, 255, 255)');
    assert.ok(await avaliar("getComputedStyle(document.body).fontFamily.includes('Urbanist')"));
    assert.equal(await avaliar("getComputedStyle(document.querySelector('.csa-painel__campo p')).backgroundColor"), 'rgb(236, 236, 236)');
    assert.equal(await avaliar("parseFloat(getComputedStyle(document.querySelector('h1')).fontSize)"), width < 769 ? 24 : 28);
    assert.ok(await avaliar("location.pathname.endsWith('/admin/agenda.html') && location.search === '?demo=1'"));
    await avaliar("document.querySelector('[data-fechar-painel]').click()");
    await testarFiltroDashboard(12, 8);
    await avaliar("document.getElementById('csa-filtro-status').value='visitas'; document.getElementById('csa-filtro-status').dispatchEvent(new Event('change'))");
    assert.equal(await avaliar("document.querySelectorAll('.csa-grid [data-evento-id]').length"), 0);
    assert.equal(await avaliar("document.querySelectorAll('.csa-grid [data-visita-id]').length"), 8);
    await avaliar("document.querySelector('[data-visao=diaria]').click()");
    await testarFiltroDashboard(3, 2);
    await avaliar("document.querySelector('[data-direcao=\"1\"]').click()");
    assert.ok(await avaliar("document.getElementById('csa-data').textContent.includes('22 de setembro')"));
  }
  await cmd('Emulation.setDeviceMetricsOverride', { width: 1512, height: 1100, deviceScaleFactor: 1, mobile: false });
  await abrir('pages/admin/agenda.html?demo=1');
  await esperar("document.querySelector('[data-evento-id=\"demo-evento-3\"]')");
  await avaliar("localStorage.setItem('csa-demo-preservacao', 'original'); document.querySelector('[data-evento-id=\"demo-evento-3\"]').click()");
  await conferirConsulta();
  await avaliar("{ const form=document.createElement('form'); form.id='csa-form-evento'; document.getElementById('csa-painel').append(form); form.dispatchEvent(new Event('submit', {bubbles:true, cancelable:true})); form.remove(); }");
  assert.equal(await avaliar("document.getElementById('csa-indicador-total').textContent"), '20');
  assert.equal(await avaliar("document.getElementById('csa-indicador-pendentes').textContent"), '8');
  assert.equal(await avaliar("localStorage.getItem('csa-demo-preservacao')"), 'original');
  assert.equal(await avaliar("sessionStorage.getItem('csa-sessao')"), null);
  await abrir('pages/admin/agenda.html?demo=1');
  await esperar("document.getElementById('csa-indicador-total').textContent === '20'");
  assert.equal(requisicoes.length, chamadasAntesDemo, 'Demo fez uma requisição à API');
  for (const width of [1512,402]) await testarGerenciamento(true,width);
  await abrir('pages/admin/sugestoes-pauta.html');
  assert.equal(await avaliar("document.getElementById('csa-agenda').inert"), true);
  assert.equal(await avaliar("document.querySelectorAll('[data-evento-id]').length"), 0);
  assert.equal(await avaliar("document.getElementById('csa-btn-pdf').disabled"), true);
  assert.ok(await avaliar("document.querySelector('#csa-agenda-aviso a').search.includes('sugestoes-pauta.html')"));
  await abrir('pages/admin/agenda.html');
  assert.equal(await avaliar("document.getElementById('csa-indicador-total').textContent"), '—');
  assert.equal(await avaliar("document.querySelectorAll('[data-evento-id]').length"), 0);
  assert.equal(await avaliar("document.getElementById('csa-agenda').inert"), true);
  assert.ok(await avaliar("document.getElementById('csa-dashboard-aviso').textContent.includes('Entrar')"));
  assert.equal(erros.length, 0, JSON.stringify(erros));
  assert.equal(requisicoes.length, chamadasAntesDemo, 'A etapa sem autenticação ou demo acessou a API');
  for (const width of [1512,1024,768,402,320]) {
    await cmd('Emulation.setDeviceMetricsOverride', {width,height:1100,deviceScaleFactor:1,mobile:width<769});
    const medidas = async () => avaliar(`{
      const medir = seletor => {
        const no=document.querySelector(seletor), r=no.getBoundingClientRect(), s=getComputedStyle(no);
        return {x:r.x,y:r.y,largura:r.width,altura:r.height,padding:s.padding,raio:s.borderRadius,fonte:s.fontSize,linha:s.lineHeight};
      };
      ({grade:medir('#csa-agenda'),cabecalho:medir('.csa-grid thead th'),dia:medir('.csa-grid thead th:nth-child(2)'),celula:medir('.csa-grid__celula'),card:medir('.csa-grid .csa-event-card'),mobile:innerWidth<769?medir('.csa-dia__cabecalho'):null})
    }`);
    await abrir('pages/admin/sugestoes-pauta.html?demo=1');
    await esperar("document.querySelector('.csa-grid [data-evento-id]')");
    await avaliar("if(!document.getElementById('csa-painel').hidden) document.querySelector('[data-fechar-painel]').click()");
    await esperar("document.querySelectorAll('.csa-dia').length===7");
    const referencia = await medidas();
    await capturar(`comparacao-pautas-${width}`);
    await abrir('pages/visita-mediada/admin/visitas.html?demo=1');
    await esperar("document.querySelector('.csa-grid [data-visita-id]')");
    await avaliar("document.querySelector('[data-visao=semanal]').click()");
    await esperar("document.querySelectorAll('.csa-dia').length===7");
    const visitas = await medidas();
    for(const chave of ['x','largura','padding','raio']) assert.equal(visitas.grade[chave],referencia.grade[chave],`Grade ${chave}/${width}`);
    for(const chave of ['largura','altura','padding','fonte','linha']) assert.equal(visitas.cabecalho[chave],referencia.cabecalho[chave],`Cabeçalho ${chave}/${width}`);
    for(const chave of ['largura','padding','raio','fonte','linha']) assert.equal(visitas.card[chave],referencia.card[chave],`Card ${chave}/${width}`);
    assert.equal(visitas.dia.largura,referencia.dia.largura,`Coluna/${width}`);
    assert.ok(await avaliar("document.documentElement.scrollWidth<=innerWidth && document.getElementById('csa-agenda').scrollWidth<=document.getElementById('csa-agenda').clientWidth"));
    if(width<769) {
      assert.deepEqual(visitas.mobile,referencia.mobile,`Dia mobile/${width}`);
      assert.equal(await avaliar("getComputedStyle(document.querySelector('.csa-grid')).display"),'none');
      assert.deepEqual(await avaliar("[...document.querySelectorAll('.csa-dia__cabecalho')].map(no=>no.getAttribute('aria-expanded'))"),['true','false','false','false','false','false','false']);
      await avaliar("document.querySelectorAll('.csa-dia__cabecalho')[1].click()");
      assert.equal(await avaliar("document.querySelectorAll('.csa-dia__corpo')[1].hidden"),false);
      await avaliar("document.querySelector('.csa-semanal-mobile [data-visita-id=\"6\"]').click()");
      assert.equal(await avaliar("document.getElementById('csa-visita-detalhe').open"),true);
      await avaliar("document.querySelector('.csa-visita-detalhe__fechar').click()");
      await esperar("document.activeElement.dataset.visitaId==='6'");
      await avaliar("document.querySelectorAll('.csa-dia__cabecalho')[1].click()");
      assert.equal(await avaliar("document.querySelectorAll('.csa-dia__corpo')[1].hidden"),true);
    }
    await capturar(`comparacao-visitas-${width}`);
    await avaliar("document.querySelector('[data-direcao=\"1\"]').click()");
    await esperar("document.querySelector('.csa-dia__corpo').id==='csa-dia-2026-09-28'");
    assert.equal(await avaliar("document.querySelectorAll('[data-visita-id]').length"),0);
    if(width>=769) assert.equal(await avaliar("document.querySelector('.csa-grid__celula').getBoundingClientRect().height"),210);
    await avaliar("document.querySelector('[data-direcao=\"-1\"]').click(); document.getElementById('csa-visitas-filtro').value='pendente'; document.getElementById('csa-visitas-filtro').dispatchEvent(new Event('change'))");
    assert.equal(await avaliar("document.querySelectorAll('.csa-grid [data-visita-id]').length"),1);
    await cmd('Emulation.setEmulatedMedia',{media:'print'});
    assert.equal(await avaliar("getComputedStyle(document.querySelector('.csa-grid')).display"),'table');
    assert.equal(await avaliar("getComputedStyle(document.querySelector('.csa-semanal-mobile')).display"),'none');
    await cmd('Emulation.setEmulatedMedia',{media:''});
    await avaliar("document.querySelector('[data-visao=diaria]').click()");
    assert.equal(await avaliar("document.querySelectorAll('.csa-semanal-mobile').length"),0);
    if(width<769) {
      await avaliar("document.querySelector('.csa-grid--diaria tbody th').click()");
      assert.equal(await avaliar("getComputedStyle(document.querySelector('.csa-grid__celula')).display"),'none');
      await avaliar("document.querySelector('.csa-grid--diaria tbody th').click()");
      assert.notEqual(await avaliar("getComputedStyle(document.querySelector('.csa-grid__celula')).display"),'none');
    }
  }
  assert.equal(requisicoes.length,chamadasAntesDemo,'Comparação visual acessou a API');
  assert.equal(erros.length,0,JSON.stringify(erros));
  console.log(`OK: dashboard somente consulta; Sugestões de Pauta com cadastro, edição, aprovação, recusa, exclusão, filtros, navegação e PDFs em desktop/mobile; API simulada nos testes reais, demo sem API e autenticação preservada. Capturas e PDFs: ${perfil}`);
})().catch(erro => { console.error(erro); process.exitCode = 1; }).finally(() => { clearTimeout(limite); ws?.close(); chrome.kill(); });
