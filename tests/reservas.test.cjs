// Contrato dinâmico e regras de reserva, sem navegador ou dependências.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const raiz = path.resolve(__dirname, '..');
const contexto = vm.createContext({ structuredClone, URL });
for (const arquivo of ['reservas-dados.js', 'reservas-modelo.js', 'reservas-perguntas/base.js',
  'reservas-perguntas/aberta.js', 'reservas-perguntas/escolha.js', 'reservas-perguntas/anexo.js',
  'reservas-perguntas/termo.js', 'reservas-perguntas/registro.js']) {
  vm.runInContext(fs.readFileSync(path.join(raiz, 'js', arquivo), 'utf8'), contexto, { filename: arquivo });
}
const executar = codigo => vm.runInContext(codigo, contexto);
const modelo = executar('csaReservasModelo');
const dados = executar('csaDadosReservas');
const componentes = executar('csaPerguntasReserva');
const respostasValidas = () => ({
  responsavel: ' Maria Silva ', telefone: '(88) 9 9999-1234', email: 'maria@example.com',
  instituicao: 'Coletivo', segmentos: ['musica', 'teatro'], pautas: ['social'], periodicidade: 'mensal',
  classificacao: 'livre', publico: '80', proposta: null, 'link-proposta': 'https://example.com/proposta',
  'ciencia-analise': true, 'ciencia-logos': true
});

test('definição e perguntas são independentes e consultáveis por ID', async () => {
  const formulario = modelo.prepararDefinicao(await dados.consultarFormulario());
  assert.equal(formulario.perguntas.length, 13);
  assert.equal((await dados.consultarPergunta('reservas', 'email')).campo, 'email');
  formulario.perguntas[0].titulo = 'Alterado';
  assert.notEqual((await dados.consultarFormulario()).perguntas[0].titulo, 'Alterado');
  await assert.rejects(dados.consultarPergunta('reservas', 'inexistente'));
  await assert.rejects(dados.consultarFormulario('outro'));
  const nova = { id: 'descricao-evento', tipo: 'aberta', campo: 'textarea', titulo: 'Descreva a proposta', descricao: 'Conte sua ideia', coluna: 'principal', ordem: 95 };
  formulario.perguntas.push(nova);
  formulario.perguntas = formulario.perguntas.filter(pergunta => pergunta.id !== 'instituicao');
  const dinamico = modelo.prepararDefinicao(formulario);
  assert.ok(componentes.renderizar(dinamico.perguntas.at(-1)).includes('<textarea'));
  const duplicado = structuredClone(dinamico);
  duplicado.perguntas.push(duplicado.perguntas[0]);
  assert.throws(() => modelo.prepararDefinicao(duplicado), /inválida ou repetida/);
  const semProposta = structuredClone(dinamico);
  semProposta.perguntas = semProposta.perguntas.filter(pergunta => pergunta.id !== 'proposta');
  assert.throws(() => modelo.prepararDefinicao(semProposta), /inexistente/);
});

test('nenhum aceite ou opção é preenchido automaticamente', async () => {
  const formulario = await dados.consultarFormulario();
  for (const pergunta of formulario.perguntas) {
    const html = componentes.renderizar(pergunta);
    assert.ok(!/\schecked(?:\s|>)/.test(html));
    assert.match(html, /data-pergunta-id=/);
    assert.ok(html.includes(pergunta.titulo));
  }
  const vazio = Object.fromEntries(formulario.perguntas.map(p => [p.id, modelo.valorInicial(p)]));
  const erros = modelo.validar(formulario, vazio);
  assert.ok(erros['ciencia-analise']);
  assert.ok(erros['ciencia-logos']);
  assert.ok(erros.proposta);
});

test('textos mobile são opcionais e não modificam respostas, regras ou definição desktop', async () => {
  const formulario = modelo.prepararDefinicao(await dados.consultarFormulario());
  const classificacao = formulario.perguntas.find(p => p.id === 'classificacao');
  assert.equal(modelo.apresentacao(classificacao, true).titulo, 'Qual a classificação indicativa?');
  assert.equal(modelo.apresentacao(classificacao, false).titulo, classificacao.titulo);
  const responsavel = formulario.perguntas.find(p => p.id === 'responsavel');
  assert.equal(modelo.apresentacao(responsavel, true).descricao, 'Digite o nome');
  assert.equal(modelo.apresentacao(responsavel, false).descricao, 'Nome');
  const segmentos = formulario.perguntas.find(p => p.id === 'segmentos');
  assert.equal(modelo.apresentacao(segmentos, true).titulo, segmentos.titulo);
  const respostas = respostasValidas();
  const antes = JSON.stringify(modelo.prepararEnvio(formulario, respostas));
  for (const pergunta of formulario.perguntas) modelo.apresentacao(pergunta, true);
  assert.equal(JSON.stringify(modelo.prepararEnvio(formulario, respostas)), antes);
  assert.equal(responsavel.descricao, 'Nome');
  responsavel.mobile.descricao = 123;
  assert.throws(() => modelo.prepararDefinicao(formulario), /mobile/);
});

test('valida opções, contatos, números inteiros e aceite dos termos', async () => {
  const formulario = await dados.consultarFormulario();
  assert.equal(Object.keys(modelo.validar(formulario, respostasValidas())).length, 0);
  for (const [id, valor] of [
    ['responsavel', '   '], ['email', 'email-invalido'], ['telefone', '123'], ['publico', '0'],
    ['publico', '-1'], ['publico', '1.5'], ['publico', '1e3'], ['segmentos', ['inexistente']],
    ['segmentos', 'musica'], ['periodicidade', ['mensal', 'semanal']], ['ciencia-logos', false],
    ['link-proposta', 'javascript:alert(1)'], ['link-proposta', 'example.com']
  ]) assert.ok(modelo.validar(formulario, { ...respostasValidas(), [id]: valor })[id], `${id}: ${valor}`);
});

test('aceita PDF ou link, detecta tipo, tamanho e arquivo vazio', async () => {
  const formulario = await dados.consultarFormulario();
  const arquivo = { name: 'proposta.pdf', type: 'application/pdf', size: 2000 };
  const respostas = { ...respostasValidas(), 'link-proposta': '', proposta: arquivo };
  assert.equal(Object.keys(modelo.validar(formulario, respostas)).length, 0);
  assert.equal(Object.keys(modelo.validar(formulario, { ...respostas, proposta: { ...arquivo, type: '' } })).length, 0);
  for (const proposta of [null, { ...arquivo, name: 'foto.png' }, { ...arquivo, type: 'image/png' },
    { ...arquivo, size: 0 }, { ...arquivo, size: 11 * 1024 * 1024 }]) {
    assert.ok(modelo.validar(formulario, { ...respostas, proposta }).proposta);
  }
});

test('prepara contrato por IDs, com número e arquivos separados, sem campos removidos', async () => {
  const formulario = await dados.consultarFormulario();
  formulario.perguntas = formulario.perguntas.filter(p => p.id !== 'instituicao');
  const pdf = { name: 'proposta.pdf', size: 1500, type: 'application/pdf' };
  const resultado = modelo.prepararEnvio(formulario, { ...respostasValidas(), proposta: pdf, invasor: 'ignorado' });
  assert.equal(resultado.dados.formularioId, 'reservas');
  assert.equal(resultado.dados.versao, 1);
  assert.equal(resultado.dados.respostas.publico, 80);
  assert.equal(resultado.dados.respostas.responsavel, 'Maria Silva');
  assert.equal(resultado.arquivos.proposta, pdf);
  assert.equal(resultado.dados.respostas.proposta.nome, 'proposta.pdf');
  assert.equal(resultado.dados.respostas.instituicao, undefined);
  assert.equal(resultado.dados.respostas.invasor, undefined);
  assert.throws(() => modelo.prepararEnvio(formulario, {}), /Revise/);
});

test('componentes escapam conteúdo dinâmico e mantêm recursos locais', async () => {
  const formulario = await dados.consultarFormulario();
  for (const original of formulario.perguntas) {
    const pergunta = structuredClone(original);
    pergunta.titulo = '<img src=x onerror=alert(1)>';
    pergunta.descricao = '"><script>alert(1)</script>';
    if (pergunta.texto) pergunta.texto = pergunta.titulo;
    if (pergunta.opcoes) pergunta.opcoes[0].titulo = pergunta.titulo;
    const html = componentes.renderizar(pergunta, original.tipo === 'aberta' ? '"><script>alert(1)</script>' : undefined);
    assert.ok(!html.includes('<script>'));
    assert.ok(!html.includes('<img src=x'));
    assert.ok(html.includes('&lt;img'));
  }
  const pagina = fs.readFileSync(path.join(raiz, 'pages/reservas.html'), 'utf8');
  const css = fs.readFileSync(path.join(raiz, 'css/reservas.css'), 'utf8');
  assert.ok(!pagina.includes('api.js'));
  const fontes = [pagina, css, componentes.renderizar(formulario.perguntas.find(p => p.tipo === 'anexo'))];
  for (const fonte of fontes) {
    assert.ok(!fonte.includes('figma.com/api/mcp/asset'));
    for (const [, atributo, url] of fonte.matchAll(/(?:src|href)="(\.\.\/[^\"]+)"|url\("(\.\.\/[^\"]+)"\)/g)) {
      // Os URLs CSS também são relativos a um diretório no primeiro nível.
      const recurso = atributo || url;
      assert.ok(fs.statSync(path.resolve(raiz, 'pages', recurso)).size > 0, recurso);
    }
  }
});
