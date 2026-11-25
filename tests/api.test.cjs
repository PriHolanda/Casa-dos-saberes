const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
function ambiente(responder, config) {
  const itens = new Map();
  const chamadas = [];
  const redirecionamentos = [];
  const ctx = vm.createContext({
    console, Date, Intl, FormData, Blob, URLSearchParams, csaConfig: config,
    sessionStorage: { getItem: chave => itens.get(chave), setItem: (chave, valor) => itens.set(chave, valor), removeItem: chave => itens.delete(chave) },
    location: { pathname: '/pages/login.html', search: '', hash: '', replace: url => redirecionamentos.push(url) },
    fetch: async (url, opcoes) => { chamadas.push({ url, ...opcoes }); return responder(url, opcoes); }
  });
  for (const nome of ['config.js', 'api.js', 'agenda-modelo.js', 'admin/dados-api.js']) vm.runInContext(fs.readFileSync(path.join(__dirname, '../js', nome), 'utf8'), ctx);
  return { ctx, chamadas, itens, redirecionamentos, rodar: codigo => vm.runInContext(codigo, ctx) };
}
const resposta = (corpo, status = 200) => ({ ok: status < 400, status, json: async () => corpo });
const registro = { id: 7, titulo: 'Oficina de música', descricao: 'Oficina para a comunidade.', data_inicio: '2026-11-08T09:00:00', data_fim: '2026-11-08T11:00:00', espaco_id: 1, publico_estimado: 0, responsavel: 'Maria', classificacao_indicativa: 'Livre' };
test('sessão expirada preserva o destino de retorno para a agenda', async () => {
  const a = ambiente(() => resposta({}));
  a.ctx.location.pathname = '/pages/admin/agenda.html';
  await assert.rejects(a.rodar("csaApi.requisitar('/eventos/')"), /expirou/);
  assert.deepEqual(a.redirecionamentos, ['/pages/login.html?next=%2Fpages%2Fadmin%2Fagenda.html']);
});
function autenticar(a) { a.itens.set('csa-sessao', JSON.stringify({ token: 'token-teste', expira: Date.now() + 60000 })); }
test('login usa o contrato real e busca o perfil com Bearer', async () => {
  const a = ambiente(url => resposta(url.endsWith('/login') ? { access_token: 'abc', expires_in: 60 } : { nome: 'Maria' }));
  await a.rodar("csaApi.entrar('maria@example.com', 'senha-segura')");
  assert.equal(a.chamadas[0].url, 'http://127.0.0.1:8000/usuarios/login');
  assert.deepEqual(JSON.parse(a.chamadas[0].body), { email: 'maria@example.com', senha: 'senha-segura' });
  assert.equal(a.chamadas[1].url, 'http://127.0.0.1:8000/usuarios/me');
  assert.equal(a.chamadas[1].headers.Authorization, 'Bearer abc');
});
test('endereço configurado aceita subcaminho e remove barras finais sem usar o proxy', async () => {
  const a = ambiente(() => resposta({}), { apiUrl: 'https://api.example.com/v1///' });
  await a.rodar("csaApi.requisitar('/usuarios', { metodo: 'POST', dados: { nome: 'Maria' }, autenticado: false })");
  autenticar(a);
  await a.rodar("csaApi.requisitar('/eventos/7', { metodo: 'PUT', dados: { titulo: 'Oficina' } })");
  await a.rodar("csaApi.requisitar('/eventos/7', { metodo: 'DELETE' })");
  assert.deepEqual(a.chamadas.map(chamada => chamada.url), [
    'https://api.example.com/v1/usuarios',
    'https://api.example.com/v1/eventos/7',
    'https://api.example.com/v1/eventos/7'
  ]);
  assert.equal(a.chamadas[1].headers.Authorization, 'Bearer token-teste');
  assert.equal(a.chamadas[1].headers['Content-Type'], 'application/json');
  assert.equal(a.chamadas[2].headers.Authorization, 'Bearer token-teste');
});
test('sessão expirada não envia operação e retorna ao login', async () => {
  const a = ambiente(() => resposta({}));
  await assert.rejects(a.rodar("csaApi.requisitar('/eventos/')"), /sessão expirou/);
  assert.equal(a.chamadas.length, 0);
  assert.deepEqual(a.redirecionamentos, ['/pages/login.html']);
});
test('erros 422 apresentam os campos retornados pelo FastAPI', async () => {
  const a = ambiente(() => resposta({ detail: [{ loc: ['body', 'titulo'], msg: 'Muito curto' }] }, 422));
  autenticar(a);
  await assert.rejects(a.rodar("csaApi.requisitar('/eventos/')"), /titulo: Muito curto/);
});
test('CRUD adapta schemas, preserva zero e atualiza o cache somente após sucesso', async () => {
  let falhar = false;
  const a = ambiente((url, opcoes) => {
    if (falhar) return resposta({ detail: 'Indisponível' }, 503);
    if (opcoes.method === 'GET') return resposta({ eventos: [registro] });
    if (opcoes.method === 'DELETE') return resposta(null, 204);
    return resposta({ ...registro, ...JSON.parse(opcoes.body) }, 201);
  });
  autenticar(a);
  await a.rodar('csaDadosAgenda.carregar()');
  assert.equal(a.rodar("csaDadosAgenda.buscarEvento('7').publico"), '0');
  assert.equal(a.rodar("csaDadosAgenda.consultarPeriodo('2026-11-08', '2026-11-08').eventos.length"), 1);
  await a.rodar("csaDadosAgenda.salvar({...csaDadosAgenda.buscarEvento('7'), nome: 'Evento alterado'}, '7')");
  assert.equal(a.chamadas.at(-1).method, 'PUT');
  assert.equal(a.chamadas.at(-1).headers.Authorization, 'Bearer token-teste');
  assert.equal(JSON.parse(a.chamadas.at(-1).body).espaco_id, 1);
  assert.equal(a.rodar("csaDadosAgenda.buscarEvento('7').nome"), 'Evento alterado');
  falhar = true;
  await assert.rejects(a.rodar("csaDadosAgenda.removerEvento('7')"), /Indisponível/);
  assert.ok(a.rodar("csaDadosAgenda.buscarEvento('7')"));
  falhar = false;
  await a.rodar("csaDadosAgenda.removerEvento('7')");
  assert.equal(a.chamadas.at(-1).method, 'DELETE');
  assert.equal(a.chamadas.at(-1).headers.Authorization, 'Bearer token-teste');
  assert.equal(a.rodar("csaDadosAgenda.buscarEvento('7')"), undefined);
});
for (const [metodo, operacao] of [
  ['PUT', "csaDadosAgenda.salvar({...csaDadosAgenda.buscarEvento('7'), nome: 'Alteração recusada'}, '7')"],
  ['DELETE', "csaDadosAgenda.removerEvento('7')"]
]) {
  test(`${metodo} recusado com 401 limpa a sessão e preserva o evento em memória`, async () => {
    const a = ambiente((url, opcoes) => opcoes.method === 'GET'
      ? resposta({ eventos: [registro] })
      : resposta({ detail: 'Token invalido ou expirado.' }, 401));
    autenticar(a);
    await a.rodar('csaDadosAgenda.carregar()');
    await assert.rejects(a.rodar(operacao), /Token invalido ou expirado/);
    assert.equal(a.chamadas.at(-1).method, metodo);
    assert.equal(a.chamadas.at(-1).headers.Authorization, 'Bearer token-teste');
    assert.equal(a.itens.has('csa-sessao'), false);
    assert.deepEqual(a.redirecionamentos, ['/pages/login.html']);
    assert.equal(a.rodar("csaDadosAgenda.buscarEvento('7').nome"), registro.titulo);
  });
}
test('datas com fuso são convertidas para Fortaleza e espaços desconhecidos continuam visíveis', async () => {
  const a = ambiente(() => resposta({ eventos: [{ ...registro, espaco_id: 4, data_inicio: '2026-11-08T12:00:00Z', data_fim: '2026-11-08T14:00:00Z' }] }));
  autenticar(a);
  await a.rodar('csaDadosAgenda.carregar()');
  assert.equal(a.rodar("csaDadosAgenda.buscarEvento('7').horarioInicio"), '09:00');
  assert.equal(a.rodar("csaDadosAgenda.espacos.find(e => e.id === '4').nome"), 'Varanda');
});
test('status de eventos usa PATCH e preserva os dados da proposta', async () => {
  const complemento = { email: 'reserva@example.com', entidade: 'Casa', segmento: 'Música', pauta: 'Social',
    periodicidade: 'Semanal', link_complementar: 'https://example.com/proposta', arquivo_pdf_id: 3 };
  const evento = { ...registro, ...complemento, status: 'pendente', celular: '85999999999' };
  const a = ambiente((url, opcoes) => opcoes.method === 'GET'
    ? resposta({ eventos: [evento] })
    : resposta({ ...evento, ...JSON.parse(opcoes.body) }));
  autenticar(a);
  await a.rodar('csaDadosAgenda.carregar()');
  for (const status of ['aceito', 'negado']) {
    await a.rodar(`csaDadosAgenda.atualizarStatus('7', '${status}')`);
    const pedido = a.chamadas.at(-1);
    assert.match(pedido.url, /\/eventos\/7\/status$/);
    assert.equal(pedido.method, 'PATCH');
    assert.equal(pedido.headers.Authorization, 'Bearer token-teste');
    assert.deepEqual(JSON.parse(pedido.body), { status });
    assert.equal(a.rodar("csaDadosAgenda.buscarEvento('7').status"), status);
    for (const [campo, valor] of Object.entries(complemento)) {
      assert.equal(a.rodar("csaDadosAgenda.buscarEvento('7').complemento")[campo], valor);
    }
  }
});

test('multipart preserva o arquivo e deixa o navegador gerar o limite do corpo', async () => {
  const a = ambiente(() => resposta({ id: 1, status: 'pendente' }, 201));
  await a.rodar(`(async () => {
    const dados = new FormData();
    dados.append('dados', JSON.stringify({ titulo: 'Evento' }));
    dados.append('arquivo', new Blob(['%PDF-1.4'], { type: 'application/pdf' }), 'proposta.pdf');
    return csaApi.requisitar('/eventos/', { metodo: 'POST', dados, autenticado: false });
  })()`);
  const pedido = a.chamadas[0];
  assert.deepEqual(Object.keys(pedido.headers), []);
  assert.equal(pedido.body.get('arquivo').name, 'proposta.pdf');
  assert.equal(await pedido.body.get('arquivo').text(), '%PDF-1.4');
  assert.deepEqual(JSON.parse(pedido.body.get('dados')), { titulo: 'Evento' });
});

test('disponibilidade usa as janelas do espaço sem oferecer o passado', async () => {
  const data = '2099-06-01';
  const a = ambiente(() => resposta({ data, espaco_id: 5, duracao_minima_horas: 2, duracao_maxima_horas: 3,
    horarios_reservaveis: [{ data_inicio: data + 'T18:00:00', data_fim: data + 'T21:00:00' }] }));
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../js/cliente/programacao.js'), 'utf8'), a.ctx);
  const disponibilidade = await a.rodar(`csaProgramacao.consultarDisponibilidade('${data}', '5')`);
  assert.match(a.chamadas[0].url, /disponibilidade\?data=2099-06-01&espaco_id=5$/);
  a.ctx.disponibilidade = disponibilidade;
  assert.deepEqual(JSON.parse(a.rodar(`JSON.stringify(csaProgramacao.opcoesReserva(disponibilidade, Date.parse('${data}T21:30:00Z')))`)), [
    { turno: 'night', inicio: '18:31', fim: '21:00' }
  ]);
  assert.equal(a.rodar(`csaProgramacao.opcoesReserva(disponibilidade, Date.parse('${data}T22:00:00Z')).length`), 0);
});
test('aprovação sem confirmação do status na resposta mantém cache anterior', async () => {
  const a = ambiente((url, opcoes) => opcoes.method === 'GET'
    ? resposta({ eventos: [{ ...registro, status: 'pendente' }] })
    : resposta(registro));
  autenticar(a);
  await a.rodar('csaDadosAgenda.carregar()');
  await assert.rejects(a.rodar("csaDadosAgenda.atualizarStatus('7', 'aceito')"), /não confirmou/);
  assert.equal(a.rodar("csaDadosAgenda.buscarEvento('7').status"), 'pendente');
});
