const { spawn } = require('node:child_process');
const { mkdtempSync, writeFileSync } = require('node:fs');
const { tmpdir } = require('node:os');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const assert = require('node:assert/strict');
const perfil = mkdtempSync(path.join(tmpdir(), 'csa-confirmacao-'));
const chrome = spawn(process.env.CSA_CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  ['--headless', '--disable-gpu', '--no-first-run', '--remote-debugging-port=0', `--user-data-dir=${perfil}`]);
const limite = setTimeout(() => { chrome.kill(); console.error('Tempo de teste excedido'); process.exit(1); }, 45000);
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
    chrome.on('exit', code => reject(new Error(`Chrome encerrou: ${code}`)));
  });
  ws = new WebSocket(endereco);
  await new Promise(resolve => ws.addEventListener('open', resolve, { once: true }));
  let id = 0;
  const pendentes = new Map(), erros = [];
  ws.addEventListener('message', evento => {
    const mensagem = JSON.parse(evento.data);
    if (mensagem.method === 'Runtime.exceptionThrown') erros.push(mensagem.params.exceptionDetails);
    if (pendentes.has(mensagem.id)) {
      const { resolve, reject } = pendentes.get(mensagem.id);
      pendentes.delete(mensagem.id);
      if (mensagem.error) reject(new Error(JSON.stringify(mensagem.error))); else resolve(mensagem.result);
    }
  });
  const cdp = (method, params = {}, sessionId) => new Promise((resolve, reject) => {
    pendentes.set(++id, { resolve, reject }); ws.send(JSON.stringify({ id, method, params, sessionId }));
  });
  const { targetId } = await cdp('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await cdp('Target.attachToTarget', { targetId, flatten: true });
  const cmd = (method, params) => cdp(method, params, sessionId);
  await cmd('Page.enable'); await cmd('Runtime.enable');
  const avaliar = async expression => {
    const r = await cmd('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    assert.ok(!r.exceptionDetails, JSON.stringify(r.exceptionDetails)); return r.result.value;
  };
  const abrir = async (tipo, demo) => {
    const origem = process.env.CSA_BASE_URL;
    const pagina = `pages/confirmacao-${tipo}.html`;
    const url = (origem ? new URL(pagina, origem).href : pathToFileURL(path.resolve(__dirname, '..', pagina)).href) + (demo ? '?demo=1' : '');
    await cmd('Page.navigate', { url });
    for (let tentativa = 0; tentativa < 100; tentativa++) {
      if (await avaliar(`document.readyState === 'complete' && typeof window.csaConfirmacao === 'object'`)) return;
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    throw new Error('Página não carregou');
  };
  for (const tipo of ['reserva', 'visita']) {
    for (const width of [1544, 768, 390, 320]) {
      await cmd('Emulation.setDeviceMetricsOverride', { width, height: 1200, deviceScaleFactor: 1, mobile: width < 760 });
      await abrir(tipo, true);
      assert.equal(await avaliar(`document.querySelectorAll('.csa-confirmacao-card').length`), 3);
      assert.equal(await avaliar(`document.getElementById('csa-confirmacao-aviso')`), null);
      assert.equal(await avaliar(`document.body.textContent.includes('Modo de demonstração')`), false);
      assert.equal(await avaliar(`getComputedStyle(document.getElementById('csa-confirmacao-grade')).display`), 'grid');
      assert.equal(await avaliar(`getComputedStyle(document.querySelector('.csa-confirmacao-cabecalho')).backgroundColor`), 'rgb(232, 226, 201)');
      assert.equal(await avaliar(`getComputedStyle(document.querySelector('.csa-confirmacao-botao--principal')).backgroundColor`), 'rgb(162, 45, 46)');
      assert.equal(await avaliar(`document.querySelector('.csa-confirmacao-acoes button:last-child').disabled`), false);
      assert.equal(await avaliar(`getComputedStyle(document.querySelector('.csa-confirmacao-acoes button:last-child')).color`), 'rgb(8, 8, 8)');
      const antes = await avaliar(`({ url: location.href, conteudo: document.querySelector('main').innerHTML })`);
      await avaliar(`document.querySelector('.csa-confirmacao-acoes button:last-child').click()`);
      assert.deepEqual(await avaliar(`({ url: location.href, conteudo: document.querySelector('main').innerHTML })`), antes);
      const captura = await cmd('Page.captureScreenshot', { captureBeyondViewport: true });
      writeFileSync(path.join(perfil, `${tipo}-${width}.png`), Buffer.from(captura.data, 'base64'));
      assert.ok(await avaliar(`document.documentElement.scrollWidth <= innerWidth`), `Overflow em ${tipo}/${width}`);
      assert.ok(await avaliar(`[...document.images].every(i => i.complete && i.naturalWidth > 0)`));
      await avaliar(`document.querySelector('[data-csa-voltar]').click()`);
      assert.equal(await avaliar(`document.getElementById('csa-confirmacao-aviso')`), null);
      assert.equal(await avaliar(`document.querySelector('[data-csa-voltar]').disabled`), true);
      await avaliar(`document.querySelector('.csa-confirmacao-menu summary').click()`);
      assert.equal(await avaliar(`document.querySelector('.csa-confirmacao-menu').open`), true);
      await avaliar(`document.querySelector('.csa-confirmacao-menu summary').click()`);
      await avaliar(`document.querySelector('.csa-confirmacao-botao--principal').click()`);
      assert.equal(await avaliar(`document.getElementById('csa-confirmacao-estado').querySelector('h2').textContent`), 'Solicitação enviada com sucesso!');
      assert.equal(await avaliar(`document.querySelector('.csa-confirmacao-status').textContent`), 'Aguardando aprovação');
      assert.equal(await avaliar(`document.getElementById('csa-confirmacao-previa')`), null);
      assert.equal(await avaliar(`document.getElementById('csa-confirmacao-estado').textContent.includes('Demonstração')`), false);
      assert.equal(await avaliar(`document.getElementById('csa-confirmacao-estado').textContent.includes('Simulação')`), false);
      assert.ok(await avaliar(`document.documentElement.scrollWidth <= innerWidth`));
    }
    await abrir(tipo, false);
    assert.equal(await avaliar(`document.getElementById('csa-confirmacao-previa')`), null);
    assert.equal(await avaliar(`document.getElementById('csa-confirmacao-grade').hidden`), true);
    for (const status of ['pendente', 'confirmada']) {
      await avaliar(`window.csaConfirmacao.apresentar({ enviada: true, status: '${status}', dados: { responsavel: '<img src=x onerror=alert(1)>' } })`);
      assert.equal(await avaliar(`document.querySelectorAll('.csa-confirmacao-card img').length`), 0);
      assert.equal(await avaliar(`document.querySelectorAll('.csa-confirmacao-acoes').length`), 0);
      assert.equal(await avaliar(`document.getElementById('csa-confirmacao-estado').hidden`), false);
    }
    await avaliar(`window.csaConfirmacao.apresentar({ enviada: false, status: 'confirmada', dados: {responsavel:'Nome'} })`);
    assert.equal(await avaliar(`document.getElementById('csa-confirmacao-grade').hidden`), true);
    await avaliar(`window.csaConfirmacao.apresentar({ enviada: true, status: 'desconhecido', dados: {responsavel:'Nome'} })`);
    assert.equal(await avaliar(`document.getElementById('csa-confirmacao-grade').hidden`), true);
    await avaliar(`window.csaConfirmacao.apresentar({ enviada: true, status: 'pendente', dados: {responsavel:'Nome', telefone:0, email:NaN}, urlFormulario:'javascript:alert(1)' }); document.querySelector('[data-csa-voltar]').click()`);
    assert.equal(await avaliar(`document.querySelectorAll('.csa-confirmacao-card dd')[1].textContent`), '0');
    assert.equal(await avaliar(`document.querySelectorAll('.csa-confirmacao-card dd')[2].textContent`), 'Não informado');
    assert.equal(await avaliar(`document.getElementById('csa-confirmacao-aviso')`), null);
    assert.equal(await avaliar(`document.querySelector('[data-csa-voltar]').disabled`), true);
    await avaliar(`window.csaConfirmacao.apresentar(null)`);
    assert.equal(await avaliar(`document.getElementById('csa-confirmacao-aviso')`), null);
  }
  assert.deepEqual(erros, []);
  console.log('OK: duas telas, 4 larguras, imagens, simulação, ausência de dados, status reais e texto seguro. Capturas:', perfil);
})().catch(erro => { console.error(erro); process.exitCode = 1; }).finally(() => {
  clearTimeout(limite); if (ws) ws.close(); chrome.kill();
});
