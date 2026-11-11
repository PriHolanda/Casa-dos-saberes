
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const raiz = path.resolve(__dirname, '..');

const contexto = vm.createContext({
  structuredClone,
  URLSearchParams,
  Date,
  Intl,

  csaApi: {
    async requisitar(caminho, opcoes) {
      assert.equal(caminho, '/eventos/');
      assert.equal(opcoes.autenticado, false);

      return {
        eventos: [
          {
            id: 15,
            titulo: 'Evento aceito',
            descricao: 'Descrição confirmada de teste',
            data_inicio: '2026-11-20T09:00:00',
            data_fim: '2026-11-20T12:00:00',
            espaco_id: 1,
            status: 'aceito',
            classificacao_indicativa: 'Livre'
          },
          {
            id: 16,
            titulo: 'Evento pendente',
            descricao: 'Não pode aparecer',
            data_inicio: '2026-11-20T14:00:00',
            data_fim: '2026-11-20T16:00:00',
            espaco_id: 1,
            status: 'pendente'
          }
        ]
      };
    }
  }
});

// Carrega os módulos no mesmo contexto, sem depender do navegador.
for (const arquivo of [
  'agenda-modelo.js',
  'detalhes-dados.js',
  'detalhes-modelo.js'
]) {
  vm.runInContext(
    fs.readFileSync(path.join(raiz, 'js', arquivo), 'utf8'),
    contexto,
    { filename: arquivo }
  );
}

const dados = vm.runInContext('csaDadosDetalhes', contexto);
const modelo = vm.runInContext('csaDetalhesModelo', contexto);

function simples(objeto) {
  return JSON.parse(JSON.stringify(objeto));
}

test('modelo valida data, horário e título sem depender do DOM', () => {
  assert.throws(
    () => modelo.normalizarApresentacao({}),
    /título/
  );

  assert.throws(
    () => modelo.normalizarApresentacao({
      titulo: 'Evento',
      data: '2026-02-31'
    }),
    /Data/
  );

  assert.throws(
    () => modelo.normalizarApresentacao({
      titulo: 'Evento',
      horario: '28:55'
    }),
    /Horário/
  );

  assert.equal(
    modelo.formatarData('2026-09-21'),
    'Segunda-feira, 21 de setembro de 2026'
  );

  assert.equal(
    modelo.formatarHorario('09:00'),
    '9h00'
  );
});

test('um evento público aceito é consultado sem autenticação', async () => {
  const { evento, espaco } = await dados.consultarEvento('15');

  const preparado = modelo.prepararEvento(evento, espaco);

  assert.equal(preparado.modalidade, 'evento');
  assert.equal(preparado.titulo, 'Evento aceito');
  assert.equal(preparado.categoria, 'Auditório');
  assert.equal(preparado.espaco, 'Auditório');
  assert.equal(preparado.data, '2026-11-20');
  assert.equal(preparado.horario, '09:00');
  assert.equal(preparado.classificacao, 'Livre');

  // A página apresenta informações, sem criar links de reserva.
  assert.equal(
    Object.hasOwn(preparado, 'urlContinuar'),
    false
  );
});

test('evento pendente não é divulgado', async () => {
  await assert.rejects(
    dados.consultarEvento('16'),
    /não está disponível/
  );
});

test('consulta de espaços preserva o catálogo original', async () => {
  const espaco = await dados.consultarEspaco('2');

  assert.equal(espaco.nome, 'Quintal');

  // A consulta retorna uma cópia, sem modificar o catálogo.
  espaco.nome = 'Alterado';

  const outro = await dados.consultarEspaco('2');

  assert.equal(outro.nome, 'Quintal');

  // Espaços disponíveis não são preparados como páginas de detalhes.
  assert.equal(
    typeof modelo.prepararEspaco,
    'undefined'
  );
});

test('visita não inventa regras ou botões de continuidade', async () => {
  const espaco = await dados.consultarEspaco('3');

  const visita = simples(
    modelo.prepararVisita({}, espaco)
  );

  assert.equal(visita.modalidade, 'visita');
  assert.equal(visita.titulo, 'Visita mediada');
  assert.equal(visita.espaco, 'Salas Expositivas');
  assert.equal(visita.descricao, '');

  assert.deepEqual(visita.regras, []);

  // Não existe propriedade para encaminhamento ao formulário.
  assert.equal(
    Object.hasOwn(visita, 'urlContinuar'),
    false
  );
});

test('demo não contamina consultas normais e preserva os exemplos', () => {
  const exemploEvento = dados.consultarExemplo('reserva');

  const evento = modelo.prepararEvento(
    exemploEvento.evento,
    exemploEvento.espaco
  );

  assert.equal(
    evento.titulo,
    'Campeonato de Farmar Aura'
  );

  assert.equal(
    evento.classificacao,
    '14 anos'
  );

  const exemploVisita = dados.consultarExemplo('visita');

  assert.equal(
    exemploVisita.visita.titulo,
    'Exposição X'
  );

  const visita = modelo.prepararVisita(
    exemploVisita.visita,
    exemploVisita.espaco
  );

  assert.equal(
    visita.descricaoTitulo,
    'Sobre a exposição'
  );

  // Alterações feitas nos exemplos retornados não afetam a fonte.
  exemploEvento.evento.nome = 'Evento alterado';

  assert.equal(
    dados.consultarExemplo('reserva').evento.nome,
    'Campeonato de Farmar Aura'
  );
});

test('HTML mantém cards fixos e não possui botões de continuidade', () => {
  const script = fs.readFileSync(
    path.join(raiz, 'js', 'detalhes.js'),
    'utf8'
  );

  // O controlador não constrói os cards com innerHTML.
  assert.doesNotMatch(script, /innerHTML\s*=/);

  // Não há lógica de navegação para formulários.
  assert.doesNotMatch(script, /urlContinuar/);
  assert.doesNotMatch(script, /csa-detalhes-continuar/);

  for (const pagina of [
    'detalhes-reserva.html',
    'detalhes-visita.html'
  ]) {
    const html = fs.readFileSync(
      path.join(raiz, 'pages', pagina),
      'utf8'
    );

    assert.match(
      html,
      /class="csa-detalhes-card csa-detalhes-card--principal"/
    );

    assert.match(
      html,
      /id="csa-detalhes-grade"/
    );

    assert.match(
      html,
      /assets\/detalhes-evento-visita\/calendario-icon\.svg/
    );

    assert.match(
      html,
      /assets\/detalhes-evento-visita\/relogio-icon\.svg/
    );

    // As páginas não devem apresentar botões para formulários.
    assert.doesNotMatch(
      html,
      /id="csa-detalhes-acoes"/
    );

    assert.doesNotMatch(
      html,
      /id="csa-detalhes-continuar"/
    );

    // Todos os scripts referenciados devem existir no projeto.
    const scripts = [
      ...html.matchAll(/<script src="\.\.\/(js\/[^" ]+)"/g)
    ].map(resultado => resultado[1]);

    for (const src of scripts) {
      assert.ok(
        fs.existsSync(path.join(raiz, src)),
        `Script ausente: ${src}`
      );
    }
  }
});
