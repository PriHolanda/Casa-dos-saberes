const { spawn } = require('node:child_process');
const { mkdtempSync } = require('node:fs');
const { tmpdir } = require('node:os');
const path = require('node:path');
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
  const base = process.env.CSA_BASE_URL || 'http://127.0.0.1:3000/';
  async function esperar(expressao) {
    for (let i = 0; i < 150; i++) {
      if (await avaliar(expressao)) return;
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    throw new Error('Espera excedida: ' + expressao);
  }
  const clicar = expressao => avaliar(expressao + '.click()');
  const confirmar = "document.querySelector('.csa-confirmacao-botao--principal')";
  const alterar = "document.querySelector('.csa-confirmacao-acoes button:last-child')";
  const resumo = "document.getElementById('csa-confirmacao-grade').textContent";
  const snapshot = `JSON.stringify([...document.getElementById('csa-reservas-form').elements].filter(c => c.name).map(c => [c.name, c.type === 'file' ? [...c.files].map(f => [f.name,f.size,f.type]) : c.type === 'checkbox' || c.type === 'radio' ? c.checked : c.value]))`;
  await cmd('Page.navigate', { url: new URL('pages/cliente/confirmacao-reserva.html', base).href });
  await esperar("typeof window.csaConfirmacao === 'object'");
  assert.equal(await avaliar("document.getElementById('csa-confirmacao-grade').hidden"), true);
  await cmd('Page.navigate', { url: new URL('pages/cliente/reservas.html', base).href });
  await esperar("document.querySelector('[type=submit]')?.disabled === false");
  const preencher = () => avaliar(`(() => {
    const valores = {responsavel:'Maria <Silva>',telefone:'(88) 99999-1234',email:'maria@example.com',instituicao:'Coletivo',publico:'80','link-proposta':'https://example.com/proposta'};
    for (const [nome,valor] of Object.entries(valores)) document.querySelector('[name="'+nome+'"]').value=valor;
    for (const nome of ['segmentos','pautas']) document.querySelectorAll('[name="'+nome+'"]').forEach((c,i)=>c.checked=i<2);
    for (const nome of ['periodicidade','classificacao','ciencia-analise','ciencia-logos']) document.querySelector('[name="'+nome+'"]').checked=true;
    const transferencia = new DataTransfer();
    transferencia.items.add(new File(['%PDF-1.4 teste'], 'proposta.pdf', {type:'application/pdf'}));
    const campo=document.querySelector('[type=file]'); campo.files=transferencia.files;
    campo.dispatchEvent(new Event('change',{bubbles:true}));
  })()`);
  await preencher();
  assert.equal(await avaliar("getComputedStyle(document.body).backgroundColor"), 'rgb(248, 247, 242)');
  assert.equal(await avaliar("getComputedStyle(document.querySelector('.csa-pergunta__entrada')).backgroundColor"), 'rgb(244, 244, 244)');
  const antes = await avaliar(snapshot);
  await avaliar("document.getElementById('csa-reservas-form').requestSubmit()");
  await esperar(confirmar + ' !== null');
  assert.equal(await avaliar("getComputedStyle(document.body).backgroundColor"), 'rgb(248, 247, 242)');
  for (const texto of ['Maria <Silva>','Teatro, Música','Racial, Social','Semanal','Livre','80','proposta.pdf','application/pdf','https://example.com/proposta']) assert.ok((await avaliar(resumo)).includes(texto), texto);
  assert.equal(await avaliar("document.querySelectorAll('.csa-confirmacao-card img').length"),0);
  for (const width of [1544, 768, 390, 320]) {
    await cmd('Emulation.setDeviceMetricsOverride', { width, height: 1200, deviceScaleFactor: 1, mobile: width < 760 });
    assert.ok(await avaliar('document.documentElement.scrollWidth <= innerWidth'), 'Overflow na revisão real/' + width);
    assert.equal(await avaliar("document.querySelectorAll('.csa-confirmacao-card').length"), 3);
  }
  await cmd('Page.reload');
  await esperar(confirmar + ' !== null');
  await clicar(alterar);
  await esperar("document.querySelector('[type=file]')?.files.length === 1");
  assert.equal(await avaliar(snapshot),antes);
  assert.equal(await avaliar("document.querySelector('[type=file]').files[0].text()"),'%PDF-1.4 teste');
  await avaliar(`document.querySelector('[name=responsavel]').value='Nome alterado'; document.querySelector('[name=responsavel]').dispatchEvent(new Event('input',{bubbles:true})); document.getElementById('csa-reservas-form').requestSubmit()`);
  await esperar(confirmar + ' !== null');
  assert.ok((await avaliar(resumo)).includes('Nome alterado'));
  await clicar(confirmar);
  await esperar("document.getElementById('csa-confirmacao-estado').textContent.includes('Escolha um espaço e horário na agenda')");
  assert.ok(!(await avaliar("document.querySelector('main').textContent")).includes('Solicitação enviada com sucesso!'));
  assert.equal(await avaliar(confirmar + '.disabled'),false);
  await avaliar(`window.csaEnviarReserva = async entrada => {
    window.payloadRecebido = entrada;
    throw new Error('Verificação do arquivo no adaptador de teste');
  }`);
  await clicar(confirmar);
  await esperar("document.getElementById('csa-confirmacao-estado').textContent.includes('Verificação do arquivo')");
  assert.equal(await avaliar("window.payloadRecebido.arquivos.proposta instanceof File"), true);
  assert.equal(await avaliar("window.payloadRecebido.arquivos.proposta.text()"), '%PDF-1.4 teste');
  assert.equal(await avaliar("window.payloadRecebido.dados.respostas.proposta.nome"), 'proposta.pdf');
  await clicar("document.querySelector('[data-csa-voltar]')");
  await esperar("document.querySelector('[type=file]')?.files.length === 1");
  await clicar("document.querySelector('[data-remover-anexo]')");
  await avaliar("document.getElementById('csa-reservas-form').requestSubmit()");
  await esperar(confirmar + ' !== null');
  assert.ok(!(await avaliar(resumo)).includes('proposta.pdf'));
  await avaliar(`window.csaEnviarReserva = async entrada => {
    window.payloadRecebido = entrada;
    await new Promise(resolve => setTimeout(resolve, 300));
    throw new Error('Falha controlada do serviço de teste');
  }`);
  await clicar(confirmar);
  assert.equal(await avaliar(confirmar + '.disabled'),true);
  assert.equal(await avaliar(alterar + '.disabled'),true);
  await esperar("document.getElementById('csa-confirmacao-estado').textContent.includes('Falha controlada')");
  assert.equal(await avaliar("window.payloadRecebido.dados.respostas['ciencia-analise']"),true);
  assert.equal(await avaliar("window.payloadRecebido.dados.respostas['ciencia-logos']"),true);
  assert.equal(await avaliar("window.payloadRecebido.dados.respostas.responsavel"),'Nome alterado');
  await avaliar("window.csaEnviarReserva = async () => ({status:'pendente'})");
  await clicar(confirmar);
  await esperar("document.getElementById('csa-confirmacao-estado').textContent.includes('Não foi possível confirmar o envio')");
  await avaliar("window.csaEnviarReserva = async () => ({enviada:true,status:'pendente'})");
  await clicar(confirmar);
  await esperar("document.getElementById('csa-confirmacao-estado').textContent.includes('Solicitação enviada com sucesso!')");
  assert.equal(await avaliar("document.querySelector('.csa-confirmacao-acoes').hidden"),true);
  const rascunhoReal = await avaliar("sessionStorage.getItem('csa-reserva-rascunho')");
  await cmd('Page.navigate', { url: new URL('pages/cliente/reservas.html?demo=1', base).href });
  await esperar("document.querySelector('[type=submit]')?.disabled === false");
  assert.equal(await avaliar("document.querySelector('[name=responsavel]').value"), '');
  await preencher();
  const antesDemo = await avaliar(snapshot);
  await avaliar("document.getElementById('csa-reservas-form').requestSubmit()");
  await esperar("location.search === '?demo=1' && document.getElementById('csa-confirmacao-grade')?.textContent.includes('Maria <Silva>')");
  await clicar(alterar);
  await esperar("location.search === '?demo=1' && document.querySelector('[type=file]')?.files.length === 1");
  assert.equal(await avaliar(snapshot), antesDemo);
  await avaliar("document.querySelector('[name=responsavel]').value='Revisão demonstrada'; document.getElementById('csa-reservas-form').requestSubmit()");
  await esperar("document.getElementById('csa-confirmacao-grade')?.textContent.includes('Revisão demonstrada')");
  await avaliar("window.chamadasEnvio = 0; window.csaEnviarReserva = async () => { window.chamadasEnvio++; throw new Error('Demonstração não deve enviar'); }; window.fetch = async () => { throw new Error('Demonstração não deve acessar API'); }");
  const lerDemo = `new Promise((resolve,reject)=>{
    const pedido=indexedDB.open('csa-reservas',1);
    pedido.onsuccess=()=>{
      const banco=pedido.result;
      const transacao=banco.transaction('rascunhos','readonly');
      const consulta=transacao.objectStore('rascunhos').get(sessionStorage.getItem('csa-reserva-rascunho-demo'));
      transacao.oncomplete=()=>{resolve(JSON.stringify(consulta.result));banco.close();};
      transacao.onerror=()=>reject(transacao.error);
    };
    pedido.onerror=()=>reject(pedido.error);
  })`;
  const salvoDemo = await avaliar(lerDemo);
  assert.notEqual(await avaliar("sessionStorage.getItem('csa-reserva-rascunho-demo')"), rascunhoReal);
  await clicar(confirmar);
  await esperar("document.querySelector('.csa-confirmacao-acoes').hidden");
  assert.equal(await avaliar("document.querySelector('#csa-confirmacao-estado h2').textContent"), 'Solicitação enviada com sucesso!');
  assert.equal(await avaliar("document.querySelector('.csa-confirmacao-status').textContent"), 'Aguardando aprovação');
  assert.equal(await avaliar("document.querySelector('#csa-confirmacao-estado p').textContent"), 'Sua solicitação foi recebida e será analisada pela equipe da Casa dos Saberes. Aguarde o retorno com as próximas orientações.');
  assert.equal(await avaliar('window.chamadasEnvio'), 0);
  assert.equal(await avaliar(lerDemo), salvoDemo);
  assert.equal(await avaliar("sessionStorage.getItem('csa-reserva-rascunho')"), rascunhoReal);
  await cmd('Page.reload');
  await esperar("document.getElementById('csa-confirmacao-grade')?.textContent.includes('Revisão demonstrada')");
  assert.equal(await avaliar("document.getElementById('csa-confirmacao-estado').hidden"), true);
  await cmd('Page.navigate', { url: new URL('pages/cliente/confirmacao-reserva.html', base).href });
  await esperar("document.getElementById('csa-confirmacao-grade')?.textContent.includes('Nome alterado')");
  await clicar(confirmar);
  await esperar("document.getElementById('csa-confirmacao-estado').textContent.includes('Escolha um espaço e horário na agenda')");

  const reserva = new URL('pages/cliente/reservas.html?espacoId=1&data=2099-06-01&turno=morning&inicio=08%3A00&fim=11%3A00', base);
  await cmd('Page.navigate', { url: reserva.href });
  await esperar("document.querySelector('[name=titulo]')");
  await preencher();
  await avaliar(`(() => {
    const form = document.getElementById('csa-reservas-form');
    form.elements.titulo.value = 'Oficina de teatro';
    form.elements['descricao-evento'].value = 'Oficina aberta à comunidade';
    form.requestSubmit();
  })()`);
  await esperar(confirmar + ' !== null');
  assert.match(await avaliar(resumo), /Auditório.*08:00 às 11:00/);
  await avaliar(`window.fetch = async (url, opcoes) => {
    if (new URL(url).pathname === '/disponibilidade') {
      return Response.json({ data: '2099-06-01', espaco_id: 1, duracao_minima_horas: 2, duracao_maxima_horas: 3,
        horarios_reservaveis: [{ data_inicio: '2099-06-01T08:00:00', data_fim: '2099-06-01T12:00:00' }] });
    }
    const arquivo = opcoes.body.get('arquivo');
    window.pedidoReserva = { url, metodo: opcoes.method, dados: JSON.parse(opcoes.body.get('dados')), arquivo: await arquivo.text() };
    return Response.json({ id: 42, status: 'pendente' }, { status: 201 });
  }`);
  await clicar(confirmar);
  await esperar("document.getElementById('csa-confirmacao-estado').textContent.includes('Solicitação enviada com sucesso!')");
  const pedido = await avaliar('window.pedidoReserva');
  assert.equal(new URL(pedido.url).pathname, '/eventos/');
  assert.equal(pedido.metodo, 'POST');
  assert.equal(pedido.dados.espaco_id, 1);
  assert.equal(pedido.dados.data_inicio, '2099-06-01T08:00:00');
  assert.equal(pedido.arquivo, '%PDF-1.4 teste');
  assert.deepEqual(pedido.dados.segmentos, ['Teatro', 'Música']);
  assert.deepEqual(pedido.dados.pautas, ['Racial', 'Social']);
  assert.equal(pedido.dados.aceitou_termos, true);
  assert.equal(pedido.dados.link_complementar, 'https://example.com/proposta');
  await cmd('Page.reload');
  await esperar("document.getElementById('csa-confirmacao-estado').textContent.includes('Solicitação enviada com sucesso!')");
  assert.deepEqual(erros, []);
  console.log('OK: fluxo real, PDF, edição, erros, contrato de backend, fundo padronizado e demonstração isolada sem chamadas de envio nem alteração do rascunho.');
})().catch(erro => { console.error(erro); process.exitCode = 1; }).finally(() => {
  clearTimeout(limite); if (ws) ws.close(); chrome.kill();
});
