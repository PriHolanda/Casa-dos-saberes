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
assert.equal(contar(/data-evento-id=/g), 7);
assert.equal(contar(/class="csa-grid__celula"/g), 18);
assert.equal(contar(/scope="col"/g), 7);
assert.match(html(), /Sex<\/strong><span>25\/09/);
assert.match(html(), /Sáb<\/strong><span>26\/09/);
assert.match(elementos['csa-data'].innerHTML, /21 a 26 de setembro de 2026/);
assert.equal(semanal.atributos['aria-pressed'], 'true');
filtrar('pendente');
assert.equal(contar(/data-evento-id=/g), 1);
assert.match(html(), /evt-04/);
assert.equal(contar(/data-turno=/g), 18);
// O filtro não transforma células ocupadas em cards completos de disponibilidade.
assert.equal(contar(/csa-disponibilidade--compacta/g), 6);
filtrar('aceito');
assert.equal(contar(/data-evento-id=/g), 6);
filtrar('todos');
diaria.handlers.click();
assert.equal(contar(/class="csa-grid__celula"/g), 3);
assert.equal(contar(/data-evento-id=/g), 3);
assert.equal(diaria.atributos['aria-pressed'], 'true');
proximo.handlers.click();
assert.equal(contar(/data-evento-id=/g), 1);
assert.match(elementos['csa-data'].innerHTML, /22 de setembro/);
anterior.handlers.click();
semanal.handlers.click();
proximo.handlers.click();
assert.match(elementos['csa-data'].innerHTML, /28 de setembro de 2026 a 3 de outubro de 2026/);
assert.equal(contar(/data-evento-id=/g), 0);
assert.equal(contar(/<br>Disponível/g), 18);
assert.equal(contar(/Adicionar<br>Evento/g), 18);
assert.ok(!html().includes('não informada'));
anterior.handlers.click();
assert.equal(contar(/data-evento-id=/g), 7);
diaria.handlers.click();
avancar(10);
assert.match(elementos['csa-data'].innerHTML, /1 de outubro de 2026/);
assert.equal(contar(/<br>Disponível/g), 3);
avancar(92);
assert.match(elementos['csa-data'].innerHTML, /1 de janeiro de 2027/);
semanal.handlers.click();
assert.match(elementos['csa-data'].innerHTML, /28 de dezembro de 2026 a 2 de janeiro de 2027/);
assert.equal(executar(`csaAgendaModelo.somarDias('2028-02-28', 1)`), '2028-02-29');
assert.equal(executar(`csaAgendaModelo.somarDias('2028-02-29', 1)`), '2028-03-01');
assert.equal(executar(`csaAgendaModelo.lerDia('2026-02-29')`), null);
assert.throws(() => executar(`csaDadosAgenda.consultarPeriodo('2026-02-30', '2026-03-01')`), /Período inválido/);

const base = executar(`csaDadosAgenda.consultarPeriodo('2026-09-21', '2026-09-26')`);
const evento = base.eventos[0];
for (const invalido of [null, { ...evento, id: undefined }, { ...evento, nome: '' },
  { ...evento, espacoId: 'inexistente' }, { ...evento, inicio: undefined },
  { ...evento, inicio: '2026-02-30T09:00:00' }, { ...evento, inicio: '2026-09-21T25:00:00' },
  { ...evento, termino: '2026-09-21T08:00:00' }, { ...evento, termino: evento.inicio },
  { ...evento, inicio: '2026-09-21T09:00:00Z' }]) {
  contexto.eventoTeste = invalido;
  assert.equal(executar('csaAgenda.EventCard(eventoTeste, csaDadosAgenda.espacos[0])'), '');
}
assert.equal(executar('csaAgenda.EventCard({}, undefined)'), '');
contexto.eventoTeste = { ...evento, status: 'cancelado', nome: '<img src=x onerror=alert(1)>' };
const protegido = executar('csaAgenda.EventCard(eventoTeste, csaDadosAgenda.espacos[0])');
assert.match(protegido, /Status desconhecido/);
assert.ok(!protegido.includes('Pendente'));
assert.ok(!protegido.includes('<img'));
assert.match(protegido, /&lt;img/);
assert.match(protegido, /09:00 às 12:00/);

// Componentes recebem catálogos diferentes, sem consultar os mocks.
contexto.dadosTeste = { ...base, espacos: [{ id: 'novo', nome: 'Espaço recebido', visual: 'auditorio' }],
  eventos: Array.from({ length: 12 }, (_, i) => ({ ...evento, id: `extra-${i}`, espacoId: 'novo' })) };
const celula = executar(`csaAgenda.AgendaCell('2026-09-21', dadosTeste.turnos[0], dadosTeste)`);
assert.equal((celula.match(/data-evento-id=/g) || []).length, 12);
assert.match(celula, /Espaço recebido/);
const disponibilidade = executar(`csaAgenda.AvailabilityCard({ data: '2026-10-01' }, { id: 'noite', nome: 'Noite' }, false)`);
assert.match(disponibilidade, /Noite<br>Disponível/);
assert.match(disponibilidade, /Adicionar<br>Evento/);
assert.ok(!disponibilidade.includes('onclick'));
base.eventos[0].nome = 'Mutação no resultado';
assert.notEqual(executar(`csaDadosAgenda.consultarPeriodo('2026-09-21', '2026-09-26').eventos[0].nome`), 'Mutação no resultado');
const antes = html();
document.dispatchEvent({ type: 'csa:evento-atualizado', detail: { id: evento.id } });
assert.equal(html(), antes);
const pagina = fs.readFileSync(path.join(raiz, 'pages/agenda.html'), 'utf8');
assert.match(pagina, /<main class="csa-agenda">[\s\S]*<aside id="csa-painel" class="csa-painel" hidden><\/aside>/);
const cssAgenda = fs.readFileSync(path.join(raiz, 'css/agenda.css'), 'utf8');
const cssPaineis = fs.readFileSync(path.join(raiz, 'css/paineis.css'), 'utf8');
assert.match(cssAgenda, /#csa-agenda\s*\{[^}]*width:\s*100%/);
assert.match(cssAgenda, /\.csa-grid\s*\{[^}]*min-width:\s*100%/);
assert.match(cssPaineis, /\.csa-painel--aberto\s*\{[^}]*flex:\s*0 0 clamp/);
assert.match(cssPaineis, /\.csa-painel\[hidden\]\s*\{\s*display:\s*none/);
for (const [, recurso] of pagina.matchAll(/(?:src|href)="(\.\.\/[^\"]+)"/g)) {
  assert.ok(fs.existsSync(path.resolve(raiz, 'pages', recurso)), `Recurso ausente: ${recurso}`);
}
console.log('OK: semanal, diária, filtros, navegação entre meses/anos, cards de disponibilidade, múltiplos eventos, validação básica e escape de HTML.');