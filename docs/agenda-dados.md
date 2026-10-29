# Dados e componentes da agenda

A implementação usa HTML, CSS e JavaScript puro, com consulta síncrona aos
mocks. Não há API, persistência, estados de requisição ou confirmação de reservas.

## Organização

- `js/dados-exemplo.js`: espaços, turnos, sete eventos de exemplo e
  `csaDadosAgenda.consultarPeriodo(inicio, fim)`, com datas inclusivas.
- `js/agenda-modelo.js`: auxiliares pequenos de calendário, validação básica
  dos eventos e mapeamento de status.
- `js/agenda.js`: estado da visualização, controles e funções `AgendaGrid`,
  `AgendaCell`, `EventCard` e `AvailabilityCard`.

Eventos possuem `{ id, nome, espacoId, inicio, termino, status }`. Espaços possuem
`{ id, nome, visual }`. A consulta ignora eventos inválidos ou duplicados e devolve
`{ espacos, turnos, eventos }`, incluindo eventos que atravessam o período.
Os objetos de eventos retornados são independentes dos registros originais.

## Datas e status

Os mocks usam datas civis `YYYY-MM-DD` e horários `YYYY-MM-DDTHH:mm[:ss]`, sem
`Z` ou offset. Os valores representam o dia e horário escritos, sem conversão
de fuso. UTC é usado somente como calendário interno para impedir que o fuso
do navegador mude o dia exibido. Valores com offset precisam ser adaptados na
futura fonte de dados; não são aceitos silenciosamente nesta versão.

Turnos: manhã 00:00–12:00, tarde 12:00–18:00 e noite 18:00–24:00. Eventos podem
aparecer em mais de um turno quando atravessam seus limites. A semana mostra
segunda a sábado; a visão diária também permite navegar para domingo.

Aceito e pendente mantêm seus estilos. Status não mapeados recebem identificação
neutra, nunca o rótulo pendente. Textos dinâmicos são escapados antes de entrar
no HTML. Campos obrigatórios, datas, intervalos e referência ao espaço são validados.

## Disponibilidade visual provisória

Todo turno sem eventos mostra o card cinza com o nome do turno, “Disponível”
e “Adicionar Evento”. Nas células com eventos, a opção aparece na variante
compacta. Filtrar um evento não altera a variante da célula.

**Isso é somente apresentação do frontend com mocks. Não confirma disponibilidade
real de qualquer espaço para reserva.** Não há cálculo de conflitos, união de
registros de disponibilidade ou consulta a regras de reserva.

Ao clicar em um evento, o painel lateral exibe seus detalhes; solicitações
pendentes podem ser aprovadas ou removidas. “Adicionar Evento” abre um formulário
com data e turno preenchidos a partir do card selecionado. O envio cria um evento
pendente nos mocks em memória e atualiza a grade; os dados não sobrevivem ao
recarregamento da página. A persistência real depende da futura API.

A grade ocupa toda a largura disponível enquanto o painel está fechado. Ao abrir
detalhes ou o formulário, a agenda e o painel dividem a mesma linha do layout; o
painel não cobre a grade.

## Integração futura

Os componentes recebem dados por parâmetros e não consultam os mocks. O ponto
de substituição da fonte é `consultarPeriodo`; a futura comunicação assíncrona
precisará ser implementada no controlador, sem reconstruir o HTML dos cards.
Não há métodos antecipados de atualização, remoção ou troca de adaptador.

Continuam ativos `csa:mudar-visao`, `csa:mudar-data`, `csa:mudar-filtro` e
`csa:evento-atualizado`; o último solicita uma nova renderização. Os atributos
`data-evento-id`, `data-data` e `data-turno` preservam os pontos de integração
futuros. `csaAgenda.recarregar()` também redesenha a visualização atual.

## Verificação

Execute `node tests/agenda.test.cjs` e abra `pages/agenda.html` com Live Server.
Os testes cobrem navegação, filtros, cards, vários eventos, validações básicas,
textos dinâmicos e recursos locais, sem dependências adicionais.