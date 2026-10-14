// Verificação sem dependências: executa os scripts reais e os eventos dos controles.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const raiz = path.resolve(__dirname, '..');
const listeners = new Map();
function elemento(dataset = {}) {
  const classes = new Set();
  return {
    dataset, innerHTML: '', atributos: {}, handlers: {},
    classList: {
      add: c => classes.add(c), remove: c => classes.delete(c),
      toggle: (c, ativo) => ativo ? classes.add(c) : classes.delete(c)
    },
    setAttribute(nome, valor) { this.atributos[nome] = valor; },
    addEventListener(nome, callback) { this.handlers[nome] = callback; }
  };
}
const diaria = elemento({ visao: 'diaria' });
const semanal = elemento({ visao: 'semanal' });
const anterior = elemento({ direcao: '-1' });
const proximo = elemento({ direcao: '1' });
const elementos = { 'csa-agenda': elemento(), 'csa-data': elemento(), 'csa-filtro-status': elemento() };
const document = {
  querySelectorAll: seletor => seletor === '[data-visao]' ? [diaria, semanal] : [anterior, proximo],
  getElementById: id => elementos[id],
  addEventListener(nome, callback) {
    if (!listeners.has(nome)) listeners.set(nome, []);
    listeners.get(nome).push(callback);
  },
  dispatchEvent(evento) { for (const callback of listeners.get(evento.type) || []) callback(evento); }
};
const contexto = vm.createContext({ document, CustomEvent: class {
  constructor(type, opcoes) { this.type = type; this.detail = opcoes.detail; }
} });
for (const arquivo of ['agenda-modelo.js', 'dados-exemplo.js', 'barra-controle.js', 'agenda.js']) {
  vm.runInContext(fs.readFileSync(path.join(raiz, 'js', arquivo), 'utf8'), contexto, { filename: arquivo });
}
const html = () => elementos['csa-agenda'].innerHTML;
const contar = expressao => (html().match(expressao) || []).length;
const filtrar = status => elementos['csa-filtro-status'].handlers.change({ target: { value: status } });
const avancar = vezes => { for (let i = 0; i < vezes; i++) proximo.handlers.click(); };
const executar = codigo => vm.runInContext(codigo, contexto);
const pronto = () => executar('csaAgenda.quandoPronta()');

(async () => {
await pronto();
assert.equal(contar(/data-evento-id=/g), 7);
assert.equal(contar(/class="csa-grid__celula"/g), 18);
assert.equal(contar(/scope="col"/g), 7);
assert.match(html(), /Sex<\/strong><span>25\/09/);
assert.match(html(), /Sáb<\/strong><span>26\/09/);
assert.match(elementos['csa-data'].innerHTML, /21 a 26 de setembro de 2026/);
assert.equal(semanal.atributos['aria-pressed'], 'true');
filtrar('pendente');
await pronto();
assert.equal(contar(/data-evento-id=/g), 1);
assert.match(html(), /evt-04/);
assert.equal(contar(/data-turno=/g), 18, 'Filtro preserva a disponibilidade explícita');
filtrar('aceito');
await pronto();
assert.equal(contar(/data-evento-id=/g), 6);
filtrar('todos');
diaria.handlers.click();
await pronto();
assert.equal(contar(/class="csa-grid__celula"/g), 3);
assert.equal(contar(/data-evento-id=/g), 3);
assert.equal(diaria.atributos['aria-pressed'], 'true');
proximo.handlers.click();
await pronto();
assert.equal(contar(/data-evento-id=/g), 1);
assert.match(elementos['csa-data'].innerHTML, /22 de setembro/);
anterior.handlers.click();
semanal.handlers.click();
proximo.handlers.click();
await pronto();
assert.match(elementos['csa-data'].innerHTML, /28 de setembro de 2026 a 3 de outubro de 2026/);
assert.equal(contar(/data-evento-id=/g), 0);
assert.equal(contar(/data-turno=/g), 18);
assert.equal(contar(/<br>Disponibilidade não informada/g), 18);
assert.equal(contar(/Adicionar<br>Evento/g), 0, 'Ausência de dados não confirma disponibilidade');
anterior.handlers.click();
await pronto();
assert.equal(contar(/data-evento-id=/g), 7);
diaria.handlers.click();
avancar(10);
await pronto();
assert.match(elementos['csa-data'].innerHTML, /1 de outubro de 2026/);
avancar(92);
await pronto();
assert.match(elementos['csa-data'].innerHTML, /1 de janeiro de 2027/);
semanal.handlers.click();
await pronto();
assert.match(elementos['csa-data'].innerHTML, /28 de dezembro de 2026 a 2 de janeiro de 2027/);
const protegido = executar(`csaAgenda.EventCard({ id: 'seguro', espacoId: 'auditorio', nome: '<img src=x onerror=alert(1)>', inicio: '2026-09-21T09:00:00', termino: '2026-09-21T12:00:00', status: 'aceito' }, csaDadosAgenda.espacos[0])`);
assert.ok(!protegido.includes('<img'));
assert.match(protegido, /&lt;img/);
const celula = executar(`csaAgenda.AgendaCell('2026-09-21', csaDadosAgenda.turnos[0], csaAgendaModelo.normalizarDados({ espacos: csaDadosAgenda.espacos, eventos: Array.from({ length: 12 }, (_, i) => ({ id: 'extra-' + i, nome: 'Evento ' + i, espacoId: 'auditorio', inicio: '2026-09-21T09:00:00', termino: '2026-09-21T12:00:00', status: 'aceito' })), disponibilidade: [] }))`);
assert.equal((celula.match(/data-evento-id=/g) || []).length, 12);
const pagina = fs.readFileSync(path.join(raiz, 'pages/agenda.html'), 'utf8');
for (const [, recurso] of pagina.matchAll(/(?:src|href)="(\.\.\/[^\"]+)"/g)) {
  assert.ok(fs.existsSync(path.resolve(raiz, 'pages', recurso)), `Recurso local ausente: ${recurso}`);
}
// Contrato de atualização local: snapshots, inclusão, edição e remoção explícitas.
const base = await executar(`csaDadosAgenda.consultarPeriodo('2026-09-21', '2026-09-26')`);
const original = JSON.parse(JSON.stringify(base));
base.eventos[0].nome = 'Mutação externa';
base.eventos.push({ id: 'sem-persistencia' });
assert.equal((await executar(`csaDadosAgenda.consultarPeriodo('2026-09-21', '2026-09-26')`)).eventos[0].nome, original.eventos[0].nome);
assert.equal((await executar(`csaDadosAgenda.consultarPeriodo('2026-09-21', '2026-09-26')`)).eventos.length, 7);
contexto.eventoTeste = { ...original.eventos[0], id: 'novo', nome: 'Atualização explícita' };
await executar('csaDadosAgenda.atualizarEvento(eventoTeste)');
assert.equal((await executar(`csaDadosAgenda.consultarPeriodo('2026-09-21', '2026-09-26')`)).eventos.length, 8);
contexto.eventoTeste.nome = 'Evento editado';
await executar('csaDadosAgenda.atualizarEvento(eventoTeste)');
assert.equal((await executar(`csaDadosAgenda.consultarPeriodo('2026-09-21', '2026-09-26')`)).eventos.find(e => e.id === 'novo').nome, 'Evento editado');
assert.equal(await executar(`csaDadosAgenda.removerEvento('novo')`), true);
contexto.eventoTeste.termino = 'inválido';
await assert.rejects(executar('csaDadosAgenda.atualizarEvento(eventoTeste)'), /Evento inválido/);

const normalizar = dados => { contexto.dadosTeste = dados; return executar('csaAgendaModelo.normalizarDados(dadosTeste)'); };
const evento = original.eventos[0];
const invalidos = [
  { ...evento, id: 'sem-espaco', espacoId: 'inexistente' },
  { ...evento, id: 'sem-horario', inicio: undefined },
  { ...evento, id: 'data-impossivel', inicio: '2026-02-30T09:00:00' },
  { ...evento, id: 'hora-impossivel', inicio: '2026-09-21T25:00:00' },
  { ...evento, id: 'invertido', termino: '2026-09-21T08:00:00' },
  { ...evento, id: 'duracao-zero', termino: evento.inicio },
  { ...evento, id: undefined }, { ...evento, nome: '' }, { ...evento, status: '' }, null
];
const validados = normalizar({ ...original, eventos: [...original.eventos, ...invalidos] });
assert.equal(validados.eventos.length, 7);
assert.equal(validados.avisos.length, invalidos.length);
assert.equal(executar('csaAgenda.EventCard(eventoTeste, undefined)'), '');
contexto.eventoTeste = { ...evento, status: 'cancelado' };
const desconhecido = executar('csaAgenda.EventCard(eventoTeste, csaDadosAgenda.espacos[0])');
assert.match(desconhecido, /Status desconhecido/);
assert.ok(!desconhecido.includes('Pendente'));
assert.match(desconhecido, /status--desconhecido/);

// Datas civis e instantes UTC são comparados no mesmo fuso de Quixadá.
assert.equal(executar(`csaAgendaModelo.lerInstante('2026-09-21T09:00:00')`), Date.parse('2026-09-21T12:00:00Z'));
assert.equal(executar(`csaAgendaModelo.lerInstante('2026-09-21T09:00:00-03:00')`), Date.parse('2026-09-21T12:00:00Z'));
assert.equal(executar(`csaAgendaModelo.somarDias('2028-02-28', 1)`), '2028-02-29');
assert.equal(executar(`csaAgendaModelo.somarDias('2028-02-29', 1)`), '2028-03-01');
assert.equal(executar(`csaAgendaModelo.lerDia('2026-02-29')`), null);

const dup = normalizar({ ...original, disponibilidade: [
  { data: '2026-09-21', turno: 'manha', espacoIds: ['auditorio'] },
  { data: '2026-09-21', turno: 'manha', espacoIds: ['quintal', 'auditorio'] }
] });
assert.equal(dup.disponibilidade.length, 1);
assert.deepEqual(Array.from(dup.disponibilidade[0].espacoIds), ['auditorio', 'quintal']);
const conflito = normalizar({ ...original, disponibilidade: [
  { data: '2026-09-21', turno: 'manha', espacoIds: ['auditorio'] },
  { data: '2026-09-21', turno: 'manha', espacoIds: [] }
] });
assert.equal(conflito.disponibilidade[0].situacao, 'nao_informada');
const semEspacos = normalizar({ ...original, eventos: [], disponibilidade: [{ data: '2026-09-21', turno: 'manha', espacoIds: [] }] });
contexto.dadosTeste = semEspacos;
const indisponivel = executar(`csaAgenda.AgendaCell('2026-09-21', dadosTeste.turnos[0], dadosTeste)`);
assert.match(indisponivel, /<br>Indisponível/);
assert.ok(!indisponivel.includes('Adicionar'));
contexto.dadosTeste = normalizar({ ...original, eventos: [], disponibilidade: [] });
const ausente = executar(`csaAgenda.AgendaCell('2026-09-21', dadosTeste.turnos[0], dadosTeste)`);
assert.match(ausente, /não informada/);
assert.ok(!ausente.includes('Adicionar'));
contexto.dadosTeste = dup;
const reutilizado = executar(`csaAgenda.AvailabilityCard(dadosTeste.disponibilidade[0], dadosTeste.turnos[0], false, dadosTeste.espacos)`);
assert.match(reutilizado, /Auditório, Quintal/);
contexto.espacosIndependentes = dup.espacos.map(e => ({ ...e, nome: `Espaço recebido ${e.id}` }));
assert.match(executar(`csaAgenda.AvailabilityCard(dadosTeste.disponibilidade[0], dadosTeste.turnos[0], false, espacosIndependentes)`), /Espaço recebido quintal/);
assert.equal(normalizar({ ...original, disponibilidade: [{ data: '2026-09-21', turno: 'manha', espacoIds: ['inexistente'] }] }).disponibilidade.length, 0);
assert.equal(normalizar({ ...original, eventos: [evento, evento] }).eventos.length, 1);
await assert.rejects(executar(`csaDadosAgenda.consultarPeriodo('2026-02-30', '2026-03-01')`), /Período inválido/);

async function mostrar(dados) {
  contexto.fonteTeste = { consultarPeriodo: async () => dados };
  executar('csaDadosAgenda.definirFonte(fonteTeste)');
  await executar('csaAgenda.recarregar()');
}
// Retornar à semana inicial para testar respostas da fonte e estados da interface.
for (let i = 0; i < 14; i++) anterior.handlers.click();
await pronto();
await mostrar({ ...original, eventos: [...original.eventos, ...invalidos] });
assert.equal(contar(/data-evento-id=/g), 7);
assert.match(html(), /dados inconsistentes/);
await mostrar({ ...original, eventos: [{ ...evento, inicio: '2026-09-22T01:00:00Z', termino: '2026-09-22T02:00:00Z' }] });
const utc = await executar(`csaDadosAgenda.consultarPeriodo('2026-09-21', '2026-09-21')`);
assert.equal(utc.eventos.length, 1);
assert.equal(utc.eventos[0].horarioInicio, '22:00');
contexto.dadosTeste = utc;
assert.match(executar(`csaAgenda.AgendaCell('2026-09-21', dadosTeste.turnos[2], dadosTeste)`), /data-evento-id=/);

// Respostas fora de ordem não podem sobrescrever o período mais recente.
const pendentes = [];
contexto.fonteTeste = { consultarPeriodo: pedido => new Promise((resolve, reject) => pendentes.push({ pedido, resolve, reject })) };
executar('csaDadosAgenda.definirFonte(fonteTeste)');
const primeira = executar('csaAgenda.recarregar()');
assert.equal(elementos['csa-agenda'].atributos['aria-busy'], 'true');
assert.match(html(), /Carregando/);
proximo.handlers.click();
const segunda = pronto();
assert.equal(pendentes[1].pedido.fusoHorario, 'America/Fortaleza');
pendentes[1].resolve({ ...original, eventos: [], disponibilidade: [] });
await segunda;
const maisRecente = html();
pendentes[0].resolve(original);
await primeira;
assert.equal(html(), maisRecente);
assert.equal(elementos['csa-agenda'].atributos['aria-busy'], 'false');

contexto.fonteTeste = { consultarPeriodo: async () => { throw new Error('Falha simulada'); } };
executar('csaDadosAgenda.definirFonte(fonteTeste)');
await executar('csaAgenda.recarregar()');
assert.match(html(), /role="alert"/);
assert.match(html(), /Não foi possível carregar/);
assert.equal(elementos['csa-agenda'].atributos['aria-busy'], 'false');
await mostrar({});
assert.match(html(), /role="alert"/);
anterior.handlers.click();
await mostrar(original);
assert.equal(contar(/data-evento-id=/g), 7, 'Recuperação após falha');
document.dispatchEvent({ type: 'csa:evento-atualizado', detail: { id: evento.id } });
await pronto();
assert.equal(contar(/data-evento-id=/g), 7);
console.log('OK: navegação, filtros, cards, validação, fuso, disponibilidade, snapshots, atualizações, carregamento, respostas fora de ordem e recuperação de falhas.');
})().catch(erro => { console.error(erro); process.exitCode = 1; });
