const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const raiz = path.resolve(__dirname, '..');
const contexto = vm.createContext({
  structuredClone, URLSearchParams, Date, Intl,
  csaApi: {
    async requisitar(caminho, opcoes) {
      assert.equal(caminho, '/eventos/');
      assert.equal(opcoes.autenticado, false);
      return {
        eventos: [
          { id: 15, titulo: 'Evento aceito', descricao: 'Descrição confirmada de teste',
            data_inicio: '2026-11-20T09:00:00', data_fim: '2026-11-20T12:00:00',
            espaco_id: 1, status: 'aceito', classificacao_indicativa: 'Livre' },
          { id: 16, titulo: 'Evento pendente', descricao: 'Não pode aparecer',
            data_inicio: '2026-11-20T14:00:00', data_fim: '2026-11-20T16:00:00',
            espaco_id: 1, status: 'pendente' }
        ]
      };
    }
  }
});
for (const arquivo of ['agenda-modelo.js', 'detalhes-dados.js', 'detalhes-modelo.js']) {
  vm.runInContext(fs.readFileSync(path.join(raiz, 'js', arquivo), 'utf8'), contexto, { filename: arquivo });
}
const dados = vm.runInContext('csaDadosDetalhes', contexto);
const modelo = vm.runInContext('csaDetalhesModelo', contexto);

function simples(obj) { return JSON.parse(JSON.stringify(obj)); }

test('modelo valida data, horário e título sem depender do DOM', () => {
  assert.throws(() => modelo.normalizarApresentacao({}), /título/);
  assert.throws(() => modelo.normalizarApresentacao({ titulo: 'X', data: '2026-02-31' }), /Data/);
  assert.throws(() => modelo.normalizarApresentacao({ titulo: 'X', horario: '28:55' }), /Horário/);
  assert.equal(modelo.formatarData('2026-09-21'),
  'Segunda-feira, 21 de setembro de 2026');
  assert.equal(modelo.formatarHorario('09:00'), '9h00');
});

test('um evento público aceito é consultado sem autenticação', async () => {
  const { evento, espaco } = await dados.consultarEvento('15');
  const preparado = modelo.prepararEvento(evento, espaco);
  assert.equal(preparado.titulo, 'Evento aceito');
  assert.equal(preparado.categoria, 'Auditório');
  assert.equal(preparado.data, '2026-11-20');
  assert.equal(preparado.horario, '09:00');
  assert.equal(preparado.urlContinuar, '');
});

test('evento pendente não é divulgado', async () => {
  await assert.rejects(dados.consultarEvento('16'), /não está disponível/);
});

test('dados de um espaço são copiados e o link mantém o contexto', async () => {
  const espaco = await dados.consultarEspaco('2');
  espaco.nome = 'alterado';
  const outro = await dados.consultarEspaco('2');
  assert.equal(outro.nome, 'Quintal');
  const info = modelo.prepararEspaco(outro, { data: '2026-11-20', turno: 'manha' });
  assert.equal(info.modalidade, 'espaco');
  assert.equal(info.turno, 'Manhã');
  assert.match(info.urlContinuar, /reservas\.html\?espacoId=2/);
  assert.match(info.urlContinuar, /turno=manha/);
  assert.throws(() => modelo.prepararEspaco(outro, { turno: 'invalido' }), /Turno/);
});

test('visita não inventa regras ou endereço de formulário', async () => {
  const espaco = await dados.consultarEspaco('3');
  const visita = simples(modelo.prepararVisita({}, espaco));
  assert.equal(visita.titulo, 'Visita mediada');
  assert.deepEqual(visita.regras, []);
  assert.equal(visita.urlContinuar, '');
  assert.equal(visita.descricao, '');
});

test('demo não contamina consultas normais e preserva os exemplos', () => {
  const ex = dados.consultarExemplo('reserva');
  const info = modelo.prepararEvento(ex.evento, ex.espaco);
  assert.equal(info.titulo, 'Campeonato de Farmar Aura');
  assert.equal(info.classificacao, '14 anos');
  assert.equal(dados.consultarExemplo('visita').visita.titulo, 'Exposição X');
  assert.equal(modelo.prepararVisita(dados.consultarExemplo('visita').visita, dados.consultarExemplo('visita').espaco).descricaoTitulo, 'Sobre a exposição');
});

test('HTML fixa os cards; JS não monta cards por innerHTML', () => {
  const script = fs.readFileSync(path.join(raiz, 'js/detalhes.js'), 'utf8');
  assert.doesNotMatch(script, /innerHTML\s*=/);
  for (const pagina of ['detalhes-reserva.html', 'detalhes-visita.html']) {
    const html = fs.readFileSync(path.join(raiz, 'pages', pagina), 'utf8');
    assert.match(html, /class="csa-detalhes-card csa-detalhes-card--principal"/);
    assert.match(html, /id="csa-detalhes-grade"/);
    assert.match(html, /assets\/detalhes-evento-visita\/calendario-icon.svg/);
    assert.match(html, /assets\/detalhes-evento-visita\/relogio-icon.svg/);
    for (const src of [...html.matchAll(/<script src="\.\.\/(js\/[^" ]+)"/g)].map(m => m[1])) {
      assert.ok(fs.existsSync(path.join(raiz, src)), `Script ausente: ${src}`);
    }
  }
});
