# Páginas públicas de informações — espaços, eventos e visitas

## Escopo

Tarefa: apresentar espaço/atividade e visita mediada antes do agendamento, com descrição, regras, orientações e continuidade quando houver formulário disponível. HTML e CSS seguem o protótipo; o conteúdo institucional não é inventado quando ausente.

- `pages/detalhes-reserva.html`: informações de evento confirmado **ou** espaço disponível escolhido para solicitar uso.
- `pages/detalhes-visita.html`: informações de visita mediada ou espaço de visita.
- `css/detalhes.css`: estilos compartilhados, Urbanist, fundo creme, classes `csa-`.
- `js/detalhes-dados.js`: consulta de espaços e eventos, demonstrações isoladas.
- `js/detalhes-modelo.js`: prepara dados para a apresentação, sem DOM/API.
- `js/detalhes.js`: controlador que preenche os cards **declarados no HTML**.

Não altera nem compartilha o controlador da agenda administrativa. Não altera o formulário de reservas.

## Execução estática

Execute `./scripts/iniciar-reservas.sh` e abra:

- `http://127.0.0.1:3001/pages/detalhes-reserva.html?demo=1` — evento fictício do Figma.
- `http://127.0.0.1:3001/pages/detalhes-visita.html?demo=1` — exposição fictícia.
- `http://127.0.0.1:3001/pages/detalhes-reserva.html?espacoId=1` — Auditório do catálogo local.
- `http://127.0.0.1:3001/pages/detalhes-reserva.html?espacoId=2&data=2026-11-20&turno=manha` — seleção de espaço com data e turno.
- `http://127.0.0.1:3001/pages/detalhes-visita.html?espacoId=3` — visão básica do espaço de visita.

Os dois SVGs `assets/detalhes-evento-visita/calendario-icon.svg` e `relogio-icon.svg` foram exportados do Figma pela equipe e devem estar presentes no projeto. Não foram incluídos no ZIP original utilizado como base para esta refatoração.

## Evento real

`pages/detalhes-reserva.html?eventoId=15` (ou `?id=15`):

1. `csaDadosDetalhes.consultarEvento('15')` chama `csaApi.requisitar('/eventos/', { autenticado: false })`.
2. Busca o evento pelo ID, **exigindo status `aceito`** para não divulgar solicitações pendentes.
3. Resolve `espaco_id` no catálogo de espaços atual, com IDs 1–4.
4. Usa `csaAgendaModelo.normalizarEvento` para validar referências, datas e horários civis.
5. `csaDetalhesModelo.prepararEvento` prepara os campos da interface.
6. `csaDetalhes.apresentar` preenche os elementos já existentes no HTML com `textContent`.

O backend documentado expõe `GET /eventos/` público, mas **não confirma** `GET /eventos/{id}`. Por isso a implementação consulta a listagem. Não há uso de sessão administrativa nesta tela. Para a chamada real, o FastAPI precisa estar rodando e liberar a origem do frontend via CORS.

### Observação importante sobre o catálogo

O catálogo local `{1: Auditório, 2: Quintal, 3: Salas Expositivas, 4: Varanda}` foi extraído de `js/dados-api.js`, pois o backend ainda não oferece um endpoint específico de espaços. As descrições, orientações e regras são strings/listas vazias por padrão. **Os textos oficiais deverão ser fornecidos pela instituição; não foram presumidos.** Quando houver endpoint próprio, substitua apenas a implementação de consulta em `detalhes-dados.js`.

## Fluxo e continuidade

A agenda pública ainda não está presente no ZIP utilizado como base. A página `pages/agenda.html` atual é a **agenda administrativa** e seus cards acionam painéis internos (`csa:abrir-detalhes`). Não altere esse comportamento.

O fluxo público projetado é:

- **Evento já confirmado:** agenda pública → `detalhes-reserva.html?eventoId=15` → informações do evento. Sem botão de solicitação, conforme o frame de evento no protótipo.
- **Espaço disponível:** agenda pública → `detalhes-reserva.html?espacoId=1&data=2026-11-20&turno=manha` → informação do espaço → `reservas.html?espacoId=1&data=2026-11-20&turno=manha`.
- **Visita mediada:** agenda pública → `detalhes-visita.html?espacoId=3` → informações da visita → formulário quando a equipe definir sua rota.

**Atenção:** o formulário `reservas.html` existente ainda não consome `espacoId`, `data` nem `turno`. Os parâmetros preservam contexto para a futura integração, mas não preenchem automaticamente o formulário nem garantem disponibilidade.

Não há `pages/visita.html` ou `pages/visitas.html` no ZIP. Em vez de criar um link quebrado, o botão de continuidade de visita permanece oculto até que a equipe forneça uma rota real. Para configurar, forneça `csaConfig.formularioVisitaUrl`, por exemplo, `globalThis.csaConfig = { formularioVisitaUrl: 'NOME-REAL-DO-FORMULARIO.html' }` antes de `config.js`. O controlador só habilita URLs HTTP(S) da mesma origem.

## Contrato de apresentação

Sem acoplamento ao endpoint, um integrador pode chamar:

```js
csaDetalhes.apresentar({
  modalidade: 'visita',
  categoria: 'Visita mediada',
  titulo: 'Título fornecido pela instituição',
  espaco: 'Salas Expositivas',
  descricao: 'Descrição fornecida pela instituição',
  classificacao: '',
  orientacoes: 'Orientações fornecidas pela instituição',
  regras: ['Regra oficial 1', 'Regra oficial 2'],
  data: '',
  horario: '',
  urlContinuar: ''
});
```

A apresentação atualiza apenas os campos do HTML, ocultando seções opcionais vazias. Apenas itens de lista (`li`) são criados dinamicamente. Não usa `innerHTML` para dados externos.

## Estados e segurança

A página não exibe eventos fictícios sem `?demo=1`. Falhas apresentam apenas uma mensagem breve no conteúdo, sem criar telas inteiras não previstas no protótipo. Os dados e regras apresentados não são persistidos em localStorage. URLs de continuidade são validadas pela mesma origem e protocolos HTTP(S).

## Verificação

```bash
node --check js/detalhes-dados.js
node --check js/detalhes-modelo.js
node --check js/detalhes.js
node --test tests/detalhes.test.cjs
```

Compare visualmente as versões desktop e mobile com as imagens do Figma. O arquivo base do projeto não traz todos os assets pessoais exportados na sua branch nem a futura página pública da agenda.
