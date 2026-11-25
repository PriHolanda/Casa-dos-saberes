const { spawn } = require('node:child_process');
const { mkdtempSync, writeFileSync, readdirSync, existsSync } = require('node:fs');
const { tmpdir } = require('node:os');
const path = require('node:path');
const assert = require('node:assert/strict');
const raiz = path.resolve(__dirname, '..');
const origem = process.env.CSA_BASE_URL || 'http://127.0.0.1:3000/';
const perfil = mkdtempSync(path.join(tmpdir(), 'csa-navbar-'));
const paginas = readdirSync(path.join(raiz, 'pages'), { recursive: true }).filter(nome => nome.endsWith('.html')).map(nome => `pages/${nome.replaceAll('\\', '/')}`);
const chrome = spawn(process.env.CSA_CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless', '--disable-gpu', '--no-first-run', '--remote-debugging-port=0', `--user-data-dir=${perfil}`]);
const limite = setTimeout(() => { chrome.kill(); console.error('Tempo excedido'); process.exit(1); }, 180000);
let ws;
(async () => {
  const endereco = await new Promise((resolve, reject) => {
    let saida = '';
    chrome.on('error', reject);
    chrome.stderr.on('data', parte => {
      saida += parte;
      const encontrado = saida.match(/DevTools listening on (ws:\/\/\S+)/);
      if (encontrado) resolve(encontrado[1]);
    });
  });
  ws = new WebSocket(endereco);
  await new Promise(resolve => ws.addEventListener('open', resolve, { once: true }));
  let id = 0;
  const pendentes = new Map();
  const erros = [];
  ws.addEventListener('message', evento => {
    const mensagem = JSON.parse(evento.data);
    if (mensagem.method === 'Runtime.exceptionThrown') erros.push(mensagem.params.exceptionDetails);
    if (pendentes.has(mensagem.id)) {
      const { resolve, reject } = pendentes.get(mensagem.id);
      pendentes.delete(mensagem.id);
      mensagem.error ? reject(new Error(JSON.stringify(mensagem.error))) : resolve(mensagem.result);
    }
  });
  const cdp = (method, params = {}, sessionId) => new Promise((resolve, reject) => {
    pendentes.set(++id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params, sessionId }));
  });
  const { targetId } = await cdp('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await cdp('Target.attachToTarget', { targetId, flatten: true });
  const cmd = (method, params) => cdp(method, params, sessionId);
  await cmd('Page.enable');
  await cmd('Runtime.enable');
  await cmd('Page.addScriptToEvaluateOnNewDocument', { source: `
    if (location.pathname.endsWith('/admin/editor-visitas.html')) {
      sessionStorage.setItem('csa-sessao', JSON.stringify({ token: 'teste-de-navegador', expira: Date.now() + 60000 }));
      const requisitar = window.fetch.bind(window);
      window.fetch = (url, ...opcoes) => new URL(url).pathname === '/exposicoes/administracao'
        ? Promise.resolve(new Response(JSON.stringify({ salas: [], exposicoes: [] })))
        : requisitar(url, ...opcoes);
    } else {
      sessionStorage.removeItem('csa-sessao');
    }
  ` });
  const avaliar = async expression => {
    const resposta = await cmd('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    assert.ok(!resposta.exceptionDetails, JSON.stringify(resposta.exceptionDetails));
    return resposta.result.value;
  };
  const esperar = async expressao => {
    for (let i = 0; i < 150; i++) {
      if (await avaliar(expressao)) return;
      await new Promise(resolve => setTimeout(resolve, 75));
    }
    throw new Error(`Não ficou pronto: ${expressao}. ${JSON.stringify(erros)}`);
  };
  const destinos = new Set();
  for (const largura of [1512, 402, 320]) {
    await cmd('Emulation.setDeviceMetricsOverride', { width: largura, height: 1000, deviceScaleFactor: 1, mobile: largura < 769 });
    for (const pagina of paginas) {
      const url = new URL(`${pagina}?demo=1`, origem);
      await cmd('Page.navigate', { url: url.href });
      await esperar(`location.href === ${JSON.stringify(url.href)} && document.readyState === 'complete' && document.querySelector('.csa-navbar-marca img')?.naturalWidth > 0`);
      assert.equal(await avaliar("document.querySelectorAll('csa-navbar').length"), 1, pagina);
      assert.equal(await avaliar("document.querySelectorAll('#csa-navbar-menu').length"), 1, pagina);
      assert.equal(await avaliar("document.querySelectorAll('.csa-header, .csa-vp-header, .csa-visitas-header, .csa-detalhes-header, .csa-reservas-header, .csa-confirmacao-cabecalho, .csa-header-cliente').length"), 0, pagina);
      assert.equal(await avaliar("document.querySelectorAll('.csa-navbar-link[aria-current=page]').length"), 1, pagina);
      assert.equal(await avaliar("getComputedStyle(document.querySelector('.csa-navbar-header')).backgroundColor"), 'rgb(232, 226, 201)', pagina);
      assert.equal(await avaliar("Math.round(document.querySelector('.csa-navbar-topo').getBoundingClientRect().height)"), largura < 769 ? 75 : 71, pagina);
      assert.equal(await avaliar("Math.round(document.querySelector('.csa-navbar-faixa').getBoundingClientRect().height)"), largura < 769 ? 31 : 44, pagina);
      assert.equal(await avaliar("Math.round(document.querySelector('.csa-navbar-marca img').getBoundingClientRect().width)"), largura < 769 ? 214 : 317, pagina);
      assert.equal(await avaliar("getComputedStyle(document.querySelector('.csa-navbar-botao')).borderRadius"), '0px', pagina);
      assert.ok(await avaliar("document.body.hasAttribute('data-csa-interface') && getComputedStyle(document.body).fontFamily.includes('Urbanist')"), pagina);
      assert.ok(await avaliar("!/demonstra[çc][ãa]o|dados fict[íi]cios|simula[çc][ãa]o|modo de teste|depende de integra[çc][ãa]o/i.test(document.body.innerText)"), `Aviso de desenvolvimento em ${pagina}`);
      const titulos=await avaliar("[...document.querySelectorAll('h1')].map(no=>({tamanho:parseFloat(getComputedStyle(no).fontSize), peso:getComputedStyle(no).fontWeight}))");
      const clienteDesktop=largura>=1020 && ['pages/cliente/agenda-cliente.html','pages/visita-mediada/cliente/visitas.html'].includes(pagina);
      assert.ok(titulos.every(titulo=>titulo.tamanho === (clienteDesktop ? 48 : largura < 769 ? 24 : 28) && titulo.peso==='750'), `${pagina}: ${JSON.stringify(titulos)}`);
      const controles=await avaliar("[...document.querySelectorAll('main .csa-btn-diaria, main .csa-btn-pdf, main .csa-confirmacao-botao, main .csa-auth__principal, main .csa-reservas__enviar, main .csa-vp-botao, main .csa-visitas-botao')].filter(no=>no.getClientRects().length).map(no=>({texto:no.textContent.trim(), altura:no.getBoundingClientRect().height, fonte:parseFloat(getComputedStyle(no).fontSize)}))");
      assert.ok(controles.every(controle=>controle.altura >= 42 && controle.fonte===(clienteDesktop?16:14)), `${pagina}: ${JSON.stringify(controles)}`);
      const campos=await avaliar("[...document.querySelectorAll('main input, main select, main textarea')].filter(no=>no.getClientRects().length && !['hidden','checkbox','radio','file'].includes(no.type) && !no.matches('.csa-date-input, #csa-vp-dia')).map(no=>({nome:no.name, tipo:no.tagName, altura:no.getBoundingClientRect().height, fonte:parseFloat(getComputedStyle(no).fontSize)}))");
      assert.ok(campos.every(campo=>campo.fonte===14 && (campo.tipo==='TEXTAREA' ? campo.altura>=96 : campo.altura===42)), `${pagina}: ${JSON.stringify(campos)}`);
      assert.ok(await avaliar('document.documentElement.scrollWidth <= innerWidth'), `Transbordamento em ${pagina}/${largura}`);
      const links = await avaliar("[...document.querySelectorAll('.csa-navbar-menu a, .csa-navbar-marca')].map(link => link.href)");
      for (const href of links) {
        const destino = new URL(href);
        assert.equal(destino.origin, new URL(origem).origin, href);
        assert.ok(existsSync(path.join(raiz, decodeURIComponent(destino.pathname))), href);
        destinos.add(href);
      }
      const recolhivel = await avaliar("getComputedStyle(document.querySelector('.csa-navbar-botao')).display !== 'none'");
      if (recolhivel) {
        await avaliar("document.querySelector('.csa-navbar-botao').click()");
        assert.equal(await avaliar("document.querySelector('.csa-navbar-botao').getAttribute('aria-expanded')"), 'true', pagina);
        assert.equal(await avaliar("document.getElementById('csa-navbar-menu').hidden"), false, pagina);
        assert.ok(await avaliar("document.getElementById('csa-navbar-menu').getBoundingClientRect().height > 0"), pagina);
        assert.ok(await avaliar("document.querySelector('csa-navbar').getBoundingClientRect().right <= innerWidth"), `${pagina}: ${JSON.stringify(await avaliar("({viewport:innerWidth, largura:document.querySelector('csa-navbar').getBoundingClientRect().width, corpo:document.body.getBoundingClientRect().width, colunas:getComputedStyle(document.body).gridTemplateColumns})"))}`);
        await cmd('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape' });
        await cmd('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape' });
        assert.equal(await avaliar("document.getElementById('csa-navbar-menu').hidden"), true, pagina);
        assert.equal(await avaliar("document.activeElement === document.querySelector('.csa-navbar-botao')"), true, pagina);
        await avaliar("document.querySelector('.csa-navbar-botao').click(); document.body.click()");
        assert.equal(await avaliar("document.querySelector('.csa-navbar-botao').getAttribute('aria-expanded')"), 'false', pagina);
      }
      if (pagina.includes('/admin/')) {
        if (recolhivel) await avaliar("document.querySelector('.csa-navbar-botao').click()");
        assert.deepEqual(await avaliar("[...document.querySelectorAll('.csa-navbar-link span')].map(no=>no.textContent)"), ['Dashboard', 'Sugestões de pauta', 'Visitas Mediadas', 'Editar Formulário']);
        assert.deepEqual(await avaliar("({largura:Math.round(document.getElementById('csa-navbar-menu').getBoundingClientRect().width), altura:Math.round(document.getElementById('csa-navbar-menu').getBoundingClientRect().height), fundo:getComputedStyle(document.getElementById('csa-navbar-menu')).backgroundColor, item:getComputedStyle(document.querySelector('.csa-navbar-link[aria-current]')).backgroundColor})"), { largura:188, altura:308, fundo:'rgb(232, 226, 201)', item:'rgb(162, 45, 46)' });
        assert.deepEqual(await avaliar("{ const menu=document.getElementById('csa-navbar-menu').getBoundingClientRect(); const itens=[...document.querySelectorAll('.csa-navbar-link')]; ({x:itens[0].getBoundingClientRect().x-menu.x, y:itens[0].getBoundingClientRect().y-menu.y, largura:itens[0].getBoundingClientRect().width, altura:itens[0].getBoundingClientRect().height, passo:itens[1].getBoundingClientRect().y-itens[0].getBoundingClientRect().y}) }"), {x:7,y:26,largura:168,altura:54,passo:63});
        if (pagina === 'pages/visita-mediada/admin/visitas.html' && largura === 1512) {
          await avaliar('document.fonts.ready.then(()=>true)');
          const retangulo = await avaliar("{ const r=document.getElementById('csa-navbar-menu').getBoundingClientRect(); ({x:r.x,y:r.y,width:r.width,height:r.height,scale:1}) }");
          const captura = await cmd('Page.captureScreenshot', { clip:retangulo });
          writeFileSync(path.join(perfil, 'navbar-referencia.png'), Buffer.from(captura.data, 'base64'));
        }
        if (pagina === 'pages/admin/agenda.html') {
          await avaliar("document.querySelectorAll('.csa-navbar-link')[1].click()");
          await esperar("location.pathname.endsWith('/admin/sugestoes-pauta.html') && document.readyState === 'complete' && document.querySelector('.csa-navbar-link[aria-current] span').textContent === 'Sugestões de pauta'");
          assert.equal(await avaliar("document.body.dataset.somenteLeitura"), 'false');
        }
        if (recolhivel && await avaliar("document.querySelector('.csa-navbar-botao').getAttribute('aria-expanded') === 'true'")) await avaliar("document.querySelector('.csa-navbar-botao').click()");
      }
      if (['pages/admin/agenda.html', 'pages/cliente/reservas.html', 'pages/login.html', 'pages/visita-mediada/admin/formulario-visita.html'].includes(pagina)) {
        await avaliar('document.fonts.ready.then(() => true)');
        const captura = await cmd('Page.captureScreenshot', { captureBeyondViewport: false });
        writeFileSync(path.join(perfil, `${pagina.replaceAll('/', '-')}-${largura}.png`), Buffer.from(captura.data, 'base64'));
      }
      const destino = await avaliar("document.querySelector('.csa-navbar-menu a').href");
      await avaliar("document.querySelector('.csa-navbar-menu a').click()");
      await esperar(`location.pathname === ${JSON.stringify(new URL(destino).pathname)} && document.readyState === 'complete'`);
      console.log(`OK ${largura}px: ${pagina}`);
    }
  }
  for (const destino of destinos) assert.equal((await fetch(destino)).status, 200, destino);
  await cmd('Page.navigate', { url: origem });
  await esperar("location.pathname.endsWith('/pages/login.html') && document.querySelector('.csa-navbar-header')");
  assert.equal(erros.length, 0, JSON.stringify(erros));
  console.log(`OK: ${paginas.length} páginas em 3 larguras, menus únicos, links reais, item ativo e âncora, Escape, foco, clique fora e geometria/paleta de navbar.png. Capturas: ${perfil}`);
})().catch(erro => { console.error(erro); process.exitCode = 1; }).finally(() => { clearTimeout(limite); ws?.close(); chrome.kill(); });
