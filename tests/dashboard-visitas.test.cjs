const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function ambiente(busca = '?demo=0', dados = new Map()) {
  const elementos = new Map();
  const ctx = vm.createContext({
    Date, Intl, URLSearchParams, structuredClone,
    location: { search: busca, hostname: '127.0.0.1' },
    localStorage: { getItem: chave => dados.get(chave) },
    document: { getElementById: id => {
      if (!elementos.has(id)) elementos.set(id, { textContent: '', title: '', addEventListener() {} });
      return elementos.get(id);
    } }
  });
  const carregar = nome => vm.runInContext(fs.readFileSync(path.join(__dirname, '../js', nome), 'utf8'), ctx);
  carregar('visita-mediada/modelo.js');
  return { ctx, carregar, elementos, executar: codigo => vm.runInContext(codigo, ctx) };
}

test('visitas reconhecem status explícitos e não aprovam status desconhecidos', () => {
  const a = ambiente();
  for (const [entrada, esperado] of [['aprovada', 'aceito'], ['aceito', 'aceito'], ['pendente', 'pendente'], ['negada', 'negada'], ['cancelada', 'cancelada'], [null, 'desconhecido'], ['outro', 'desconhecido']]) {
    a.ctx.valor = entrada;
    assert.equal(a.executar('csaVisitasModelo.status(valor).valor'), esperado);
  }
});

test('datas de visitas respeitam Fortaleza, limites do calendário e intervalos', () => {
  const a = ambiente();
  assert.equal(a.executar("csaVisitasModelo.dataCivil('2026-09-22T01:00:00Z')"), '2026-09-21T22:00:00');
  assert.equal(a.executar("csaVisitasModelo.dataCivil('2026-09-21T09:20')"), '2026-09-21T09:20:00');
  assert.equal(a.executar("csaVisitasModelo.dataCivil('2028-02-29T09:00:00-03:00')"), '2028-02-29T09:00:00');
  for (const data of ['2026-02-29T09:00:00', '2026-09-21T24:00:00', '2026-09-21', null]) {
    a.ctx.valor = data;
    assert.equal(a.executar('csaVisitasModelo.dataCivil(valor)'), null);
  }
  assert.throws(() => a.executar("csaVisitasModelo.normalizarVisita({id: 1, data_inicio: '2026-09-21T10:00:00', data_fim: '2026-09-21T09:00:00'})"), /inválidos/);
  assert.throws(() => a.executar('csaVisitasModelo.normalizarVisita(null)'), /identificador/);
});

test('exposições de demonstração ficam separadas da importação de dados antigos', () => {
  const dados = new Map([['csa:exposicoes:1', JSON.stringify([{ nome: 'Memórias do Sertão' }])]]);
  const real = ambiente('', dados);
  const demo = ambiente('?demo=1', dados);
  assert.equal(real.executar('csaVisitasModelo.demonstracao'), false);
  assert.equal(real.executar('csaVisitasModelo.exposicaoLocal(1).nome'), 'Memórias do Sertão');
  assert.equal(demo.executar('csaVisitasModelo.exposicoesDemo()[0].nome'), 'Exposição X');
  assert.equal(demo.executar('csaVisitasModelo.exposicaoLocal(1)'), null);
});

test('formulário completa os campos essenciais de uma definição sem alterar a origem', () => {
  const dados = new Map([['csa:formulario-visita:1', JSON.stringify([{ id: 'extra', titulo: 'Pergunta personalizada' }])]]);
  const a = ambiente('', dados);
  assert.equal(a.executar("csaVisitasModelo.completarFormulario(csaVisitasModelo.formularioLocal()).map(campo => campo.id).join(',')"), 'extra,responsavel,telefone,email,quantidade');
  assert.equal(JSON.parse(dados.get('csa:formulario-visita:1')).length, 1);
});

test('dashboard só soma fontes completas e conta registros sem duplicar turnos', async () => {
  const a = ambiente();
  a.carregar('agenda-modelo.js');
  a.ctx.csaApi = { requisitar: async rota => rota === '/eventos/' ? { eventos: [{ id: 1, titulo: 'Oficina', descricao: 'Oficina cultural', espaco_id: 1, data_inicio: '2026-09-21T11:00:00', data_fim: '2026-09-22T13:00:00', status: 'pendente' }] } : { visitas: [{ id: 1, instituicao: '<img src=x>', data_inicio: '2026-09-21T10:00:00', data_fim: '2026-09-21T14:00:00', status: 'aprovada' }] } };
  a.carregar('admin/dados-api.js');
  a.carregar('admin/dashboard.js');
  a.executar("csaDashboard.atualizar('2026-09-21')");
  assert.equal(a.elementos.get('csa-indicador-total').textContent, '—');
  await a.executar('csaDadosAgenda.carregar()');
  a.executar('csaDashboard.eventosProntos()');
  await a.executar('csaDashboard.carregar()');
  assert.equal(a.elementos.get('csa-indicador-total').textContent, 2);
  assert.equal(a.elementos.get('csa-indicador-visitas').textContent, 1);
  assert.equal(a.elementos.get('csa-indicador-pendentes').textContent, 1);
  assert.equal(a.elementos.get('csa-indicador-pautas').textContent, '—');
  const cartao = a.executar("csaDashboard.cartao(csaDashboard.consultarPeriodo('2026-09-21', '2026-09-27')[0])");
  assert.match(cartao, /&lt;img/);
  assert.ok(!cartao.includes('data-evento-id'));
  a.ctx.csaApi.requisitar = async () => { throw new Error('Servidor indisponível'); };
  await a.executar('csaDashboard.carregar()');
  assert.equal(a.elementos.get('csa-indicador-total').textContent, '—');
  assert.equal(a.executar("csaDadosAgenda.consultarPeriodo('2026-09-21', '2026-09-27').eventos.length"), 1);
});

test('demo local funciona sem API, isola alterações em memória e preenche os quatro indicadores', async () => {
  const a = ambiente('?demo=1');
  a.ctx.csaApi = { requisitar() { throw new Error('O modo demo não deve acessar a API.'); } };
  a.carregar('agenda-modelo.js');
  a.carregar('admin/dados-api.js');
  a.carregar('admin/dashboard.js');
  await a.executar('csaDadosAgenda.carregar()');
  a.executar("csaDashboard.atualizar('2026-09-21'); csaDashboard.eventosProntos()");
  await a.executar('csaDashboard.carregar()');
  for (const [id, esperado] of [['total', 20], ['pautas', 12], ['visitas', 8], ['pendentes', 8]]) assert.equal(a.elementos.get(`csa-indicador-${id}`).textContent, esperado);
  assert.equal(a.elementos.get('csa-dashboard-aviso').textContent, '');
  await a.executar("csaDadosAgenda.atualizarStatus('demo-evento-3', 'aceito')");
  assert.equal(a.executar("csaDadosAgenda.buscarEvento('demo-evento-3').status"), 'aceito');
  await a.executar("csaDadosAgenda.salvar({...csaDadosAgenda.buscarEvento('demo-evento-3'), nome: 'Evento editado'}, 'demo-evento-3')");
  assert.equal(a.executar("csaDadosAgenda.buscarEvento('demo-evento-3').nome"), 'Evento editado');
  await a.executar("csaDadosAgenda.removerEvento('demo-evento-3')");
  assert.equal(a.executar("csaDadosAgenda.consultarPeriodo('2026-09-21', '2026-09-27').eventos.length"), 11);
  await a.executar('csaDadosAgenda.carregar()');
  assert.equal(a.executar("csaDadosAgenda.consultarPeriodo('2026-09-21', '2026-09-27').eventos.length"), 12);
  a.executar("csaDashboard.atualizar('2026-10-05')");
  assert.equal(a.elementos.get('csa-indicador-total').textContent, 0);
});

test('fluxo real é preservado em domínio externo e quando explicitamente selecionado localmente', () => {
  for (const [busca, hostname] of [['?demo=0', '127.0.0.1'], ['?demo=0', 'localhost'], ['?demo=1', 'example.com'], ['', 'example.com']]) {
    const a = ambiente(busca);
    a.ctx.location.hostname = hostname;
    a.carregar('agenda-modelo.js');
    a.carregar('admin/dados-api.js');
    assert.equal(a.executar('csaDadosAgenda.demonstracao'), false);
    assert.equal(a.executar('csaDadosAgenda.consultarVisitasDemonstracao().length'), 0);
  }
});

test('a agenda administrativa local usa o FastAPI por padrão', async () => {
  const a = ambiente('');
  const rotas = [];
  a.ctx.csaApi = { async requisitar(rota) { rotas.push(rota); return { eventos: [] }; } };
  a.carregar('agenda-modelo.js');
  a.carregar('admin/dados-api.js');
  assert.equal(a.executar('csaDadosAgenda.demonstracao'), false);
  await a.executar('csaDadosAgenda.carregar()');
  assert.deepEqual(rotas, ['/eventos/']);
});

test('agenda em consulta preserva os registros e não gera controles de cadastro', async () => {
  const a = ambiente('?demo=1');
  a.ctx.document.body = { dataset: { somenteLeitura: 'true' } };
  a.ctx.document.querySelectorAll = () => [];
  a.ctx.document.addEventListener = () => {};
  a.carregar('agenda-modelo.js');
  a.carregar('admin/dados-api.js');
  await a.executar('csaDadosAgenda.carregar()');
  a.carregar('admin/agenda.js');
  const html = a.elementos.get('csa-agenda').innerHTML;
  assert.equal((html.match(/data-evento-id=/g) || []).length, 12);
  assert.equal((html.match(/data-data=/g) || []).length, 21);
  assert.ok(!html.includes('adicionar-evento'));
  assert.ok(!html.includes('Adicionar'));
  a.carregar('admin/paineis.js');
  a.executar("csaPainel.mostrarCadastro('2026-09-21', 'manha')");
  assert.equal(a.elementos.get('csa-painel').innerHTML, undefined);
});
