# Contrato de dados da agenda

A agenda continua em JavaScript puro. `agenda-modelo.js` centraliza datas,
status e validação. `dados-exemplo.js` oferece a fonte local e o ponto de troca
por um adaptador. `agenda.js` controla a interface e renderiza componentes
que recebem os dados por parâmetros. Não há integração HTTP nesta etapa.

## Configuração provisória

- Fuso da instituição: `America/Fortaleza`, configurado em
  `csaAgendaModelo.configuracao`. Não depende do fuso do navegador.
- Turnos: manhã 00:00–12:00, tarde 12:00–18:00 e noite 18:00–24:00.
  Os limites precisam ser confirmados pela equipe.
- Semana visível: segunda a sábado, mantendo o desenho aprovado.
- Datas civis usam `YYYY-MM-DD`. Horários aceitam ISO com `Z`, offset ou sem
  offset; neste último caso, são interpretados no fuso da instituição.
- Internamente os eventos usam instantes UTC, e a apresentação usa o fuso
  da instituição. Intervalos usam início inclusivo e término exclusivo.

## Fonte de dados

`csaDadosAgenda.consultarPeriodo(inicio, fim)` retorna uma Promise de um
snapshot normalizado. As datas do período são inclusivas. Alterar o resultado
não altera a fonte. São retornados `espacos`, `eventos`, `disponibilidade`,
`turnos` e `avisos`.

Para integrar a API, registrar um objeto com
`csaDadosAgenda.definirFonte(adaptador)`. O adaptador deve oferecer:

| Método | Argumento | Resposta |
|---|---|---|
| `consultarPeriodo` | `{ inicio, fim, fusoHorario }` | `{ espacos, eventos, disponibilidade }` ou Promise desse objeto |
| `atualizarEvento` | Evento completo | Evento salvo ou Promise do evento |
| `removerEvento` | ID como string | Resultado da remoção ou Promise |

Os métodos de escrita são opcionais para fontes somente leitura. Se ausentes,
o serviço rejeita a operação explicitamente. A fonte local faz inclusão ou
substituição pelo ID em `atualizarEvento`; o adaptador futuro define o fluxo
de persistência. Não foram criados endpoints.

Os três arrays da consulta são obrigatórios, inclusive quando vazios.
Eventos fora do período são removidos após normalização. Eventos que começam
antes do período e terminam dentro dele também são incluídos.

## Registros

- Espaço: `{ id, nome, visual }`. `visual` identifica a variante CSS existente.
  Um novo espaço pode reutilizar uma variante ou receber uma nova regra de cor,
  sem duplicar o HTML dos cards.
- Evento: `{ id, nome, espacoId, inicio, termino, status }`. IDs são normalizados
  para strings. Campos obrigatórios, datas, intervalos e referência ao espaço
  são validados. Registros inválidos ou duplicados são ignorados com avisos;
  não interrompem os outros eventos. Atualizações inválidas são rejeitadas.
- Status: o mapa `csaAgendaModelo.status` mantém aceito e pendente. Um status
  não registrado recebe rótulo neutro, nunca o rótulo pendente. Não há novos filtros.
- Disponibilidade: `{ data, turno, espacoIds, situacao? }`. Situações aceitas:
  `disponivel`, `indisponivel`, `nao_informada`. Sem `situacao`, uma lista
  não vazia confirma os espaços disponíveis; uma lista vazia indica indisponibilidade.

Registros disponíveis do mesmo dia/turno são unidos e IDs são deduplicados.
Estados contraditórios resultam em informação não confirmada e aviso. Registro
ausente não significa disponível. Somente disponibilidade confirmada mostra
“Adicionar Evento”, que continua sem ação de clique.

Disponibilidade é independente dos eventos. O mock não recalcula esses registros
após uma escrita; a fonte futura deve retornar disponibilidade autoritativa
atualizada conforme as regras de reserva definidas pela equipe.

## Integração com os painéis

Os arquivos de painéis não foram alterados. Após uma escrita bem-sucedida:

```js
const salvo = await csaDadosAgenda.atualizarEvento(evento);
document.dispatchEvent(new CustomEvent('csa:evento-atualizado', {
  detail: { id: salvo.id }
}));
```

O evento solicita uma nova consulta; não precisa alterar referências internas.
Depois de remover um evento, o mesmo aviso pode ser emitido com o ID removido.
Cards preservam `data-evento-id`, `data-data` e `data-turno` para integração futura.

A interface informa carregamento, falha e disponibilidade ausente. Respostas
antigas são descartadas se a visualização mudou durante a consulta. Os controles
permitem tentar novamente; `csaAgenda.recarregar()` também retorna uma Promise.

## Verificação

```powershell
node tests/agenda.test.cjs
```

Os testes não exigem dependências. Verificam navegação, filtros, componentes,
validação, fuso, disponibilidade, atualização, snapshots, carregamento, falhas
e respostas assíncronas fora de ordem. A validação visual deve usar Live Server
em `pages/agenda.html`.
