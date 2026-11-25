const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

function carregar(arquivos, nome, globais = {}) {
  const contexto = vm.createContext({ URLSearchParams, ...globais });
  for (const arquivo of arquivos) {
    const codigo = readFileSync(path.join(__dirname, '..', 'js', arquivo), 'utf8');
    vm.runInContext(codigo, contexto, { filename: arquivo });
  }
  return vm.runInContext(nome, contexto);
}

const solicitacao = carregar(['cliente/visita-solicitacao.js'], 'csaVisitaSolicitacao');
const dia = '2026-11-20';

test('só oferece horários de uma hora que cabem na janela do servidor', () => {
  const janelas = [
    { data_inicio: `${dia}T08:00:00`, data_fim: `${dia}T09:30:00` },
    { data_inicio: `${dia}T13:30:00-03:00`, data_fim: `${dia}T18:00:00-03:00` }
  ];
  assert.equal(solicitacao.horarioDisponivel(janelas, dia, '08:00'), true);
  assert.equal(solicitacao.horarioDisponivel(janelas, dia, '09:20'), false);
  assert.equal(solicitacao.horarioDisponivel(janelas, dia, '14:00'), true);
  assert.equal(solicitacao.horarioDisponivel(janelas, '2026-11-21', '14:00'), false);
});

test('envia os campos do contrato e preserva respostas complementares', () => {
  const respostas = {
    responsavel: 'Ana Silva', telefone: '85900000000', email: 'ana@example.com',
    quantidade: '15', natureza: 'Federal', acessibilidade: ['Outro'],
    'acessibilidade-outro': 'Baixa visão', quantidadePcd: '2',
    ciencia: 'on', logos: 'on', imagem: 'on', 'campo-extra': ['Opção A', 'Opção B']
  };
  const campos = [{ id: 'campo-extra', titulo: 'Pergunta personalizada' }];
  const requisicao = { dia, hora: '08:00', respostas, campos };
  const dados = solicitacao.montar(requisicao);
  assert.equal(dados.nome_responsavel, respostas.responsavel);
  assert.equal(dados.data_fim, `${dia}T09:00:00`);
  assert.equal(dados.natureza_instituicao, 'publica');
  assert.equal(dados.quantidade_pessoas, 15);
  assert.equal(dados.quantidade_pcd, 2);
  assert.equal(dados.possui_pcd, true);
  assert.equal(dados.tipos_deficiencia, 'Baixa visão');
  assert.equal(dados.aceitou_termos, true);
  assert.equal(dados.observacoes, 'Natureza da instituição: Federal\nPergunta personalizada: Opção A, Opção B\nUso de imagem e áudio autorizado.');
  assert.throws(() => solicitacao.montar({ ...requisicao, respostas: { ...respostas, quantidadePcd: '' } }), /quantidade de pessoas com deficiência/);
  assert.throws(() => solicitacao.montar({ ...requisicao, respostas: { ...respostas, 'campo-extra': 'a'.repeat(1001) } }), /1\.000 caracteres/);
});

test('usa autenticação apenas para as operações dos editores e exige confirmação no envio', async () => {
  const chamadas = [];
  const respostas = [
    { salas: [], exposicoes: [] }, { sala_id: 2, pausada: true }, { exposicoes: [{ sala_id: 2 }] },
    { campos: [] }, { campos: [] }, { data: dia, horarios_reservaveis: [] }, { id: 3, status: 'pendente' }
  ];
  const api = carregar(['visita-mediada/modelo.js', 'visitas-api.js'], 'csaVisitasApi', {
    csaApi: { requisitar: async (...argumentos) => { chamadas.push(argumentos); return respostas.shift(); } }
  });
  await api.editorExposicoes();
  await api.salvarExposicao(2, { nome: 'Memórias', pausada: true });
  assert.equal((await api.exposicoes())[0].sala, 'Sala expositiva 2');
  await api.formulario();
  await api.salvarFormulario([]);
  await api.disponibilidade(dia);
  assert.equal((await api.enviar({ nome_responsavel: 'Ana Silva' })).id, 3);
  assert.deepEqual(chamadas.map(([rota, opcoes]) => [rota, opcoes?.metodo ?? 'GET', opcoes?.autenticado ?? true]), [
    ['/exposicoes/administracao', 'GET', true],
    ['/exposicoes/2', 'PUT', true],
    ['/exposicoes/', 'GET', false],
    ['/visitas/formulario', 'GET', false],
    ['/visitas/formulario', 'PUT', true],
    [`/visitas/disponibilidade?data=${dia}`, 'GET', false],
    ['/visitas/', 'POST', false]
  ]);
  await assert.rejects(api.enviar({}), /servidor não confirmou/);
});
