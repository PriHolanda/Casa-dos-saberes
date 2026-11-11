
# Páginas de Informações — Reservas e Visitas Mediadas

## 1. Visão geral

As páginas de informações da Casa dos Saberes apresentam ao usuário os detalhes de eventos, espaços culturais e visitas mediadas, permitindo consultar descrições, horários, locais, classificações indicativas e orientações antes de prosseguir na navegação ou no agendamento.

A implementação utiliza HTML, CSS e JavaScript puro, seguindo a organização modular adotada no frontend do projeto.

As duas páginas compartilham estilos e lógica de apresentação, preservando as particularidades de cada modalidade.

## 2. Estrutura dos arquivos

```text
pages/
├── detalhes-reserva.html
└── detalhes-visita.html

css/
└── detalhes.css

js/
├── detalhes-dados.js
├── detalhes-modelo.js
└── detalhes.js

assets/
└── detalhes-evento-visita/
    ├── calendario-icon.svg
    └── relogio-icon.svg

docs/
└── detalhes.md

tests/
└── detalhes.test.cjs
```

### Responsabilidades

| Arquivo | Responsabilidade |
|---|---|
| `detalhes-reserva.html` | Estrutura visual das informações de eventos e espaços disponíveis. |
| `detalhes-visita.html` | Estrutura visual das informações de visitas mediadas. |
| `detalhes.css` | Estilização compartilhada e responsividade das páginas. |
| `detalhes-dados.js` | Consulta e disponibilização dos dados. |
| `detalhes-modelo.js` | Validação, normalização e formatação das informações. |
| `detalhes.js` | Carregamento, apresentação dos dados e interações. |
| `detalhes.test.cjs` | Testes automatizados das regras e comportamentos. |

## 3. Arquitetura

A implementação separa a obtenção dos dados, as regras de preparação e a apresentação das informações.

### 3.1. Camada de dados

O módulo `detalhes-dados.js` centraliza as consultas utilizadas pelas páginas.

Suas responsabilidades incluem:

- Consultar eventos pelo identificador.
- Recuperar informações dos espaços culturais.
- Disponibilizar dados demonstrativos para testes.
- Isolar a origem dos dados da lógica de apresentação.

A consulta de eventos utiliza a rota pública `GET /eventos/`, por meio da infraestrutura de API do projeto, com acesso não autenticado.

A exibição pública considera somente eventos com status `aceito`, evitando apresentar atividades pendentes como confirmadas.

As informações dos espaços são disponibilizadas por um catálogo local, permitindo a substituição da fonte de dados na integração com o backend.

### 3.2. Camada de modelo

O módulo `detalhes-modelo.js` concentra as regras de validação, normalização e preparação das informações.

É responsável por:

- Validar os dados recebidos.
- Preparar eventos, espaços e visitas para apresentação.
- Formatar datas e horários.
- Tratar campos opcionais.
- Garantir a consistência dos objetos apresentados.

As regras são implementadas sem acesso ao DOM ou realização de requisições.

A preparação dos eventos considera as estruturas e validações utilizadas pelo modelo da agenda.

### 3.3. Controlador

O módulo `detalhes.js` coordena o funcionamento das duas páginas.

Suas responsabilidades incluem:

- Identificar a modalidade da página.
- Interpretar os parâmetros recebidos pela URL.
- Solicitar os dados necessários.
- Preencher os elementos da interface.
- Controlar a visibilidade de campos opcionais.
- Apresentar mensagens de indisponibilidade.
- Gerenciar os botões de continuidade e a navegação.

A estrutura principal dos cards é definida no HTML. O controlador atualiza seus conteúdos utilizando `textContent`, enquanto listas variáveis de regras são preenchidas dinamicamente.

Essa organização mantém a apresentação independente da origem dos dados.

## 4. Páginas implementadas

### 4.1. Informações da reserva

**Arquivo:** `pages/detalhes-reserva.html`

Apresenta as informações correspondentes à opção selecionada na agenda.

A página contempla dois cenários.

#### Evento cadastrado

Permite consultar informações de uma atividade confirmada, incluindo:

- Nome do evento.
- Espaço de realização.
- Data e horário.
- Descrição da atividade.
- Classificação indicativa.
- Demais informações disponíveis.

#### Espaço disponível

Apresenta as informações de um espaço cultural disponível para solicitação de reserva, incluindo descrição, regras e orientações, quando disponibilizadas.

Nesse cenário, a página oferece continuidade para o formulário de reserva, preservando o contexto da seleção.

### 4.2. Informações da visita mediada

**Arquivo:** `pages/detalhes-visita.html`

Apresenta informações relacionadas às visitas mediadas e aos espaços destinados a essas atividades.

O conteúdo pode incluir:

- Identificação da visita ou atividade.
- Espaço relacionado.
- Descrição.
- Classificação indicativa.
- Data e horário, quando aplicáveis.
- Regras e orientações.
- Opção de continuidade para o agendamento.

Os campos opcionais são exibidos conforme a disponibilidade dos dados.

## 5. Navegação e integração com a agenda

As páginas utilizam parâmetros na URL para identificar a opção selecionada pelo usuário.

### 5.1. Evento cadastrado

```text
pages/detalhes-reserva.html?eventoId=15
```

O parâmetro `eventoId` identifica o evento que deverá ser consultado e apresentado.

### 5.2. Espaço disponível

```text
pages/detalhes-reserva.html?espacoId=1
```

O parâmetro `espacoId` identifica o espaço selecionado.

Também é possível preservar informações da escolha do usuário:

```text
pages/detalhes-reserva.html?espacoId=1&data=2026-11-20&turno=manha
```

### 5.3. Parâmetros utilizados

| Parâmetro | Descrição |
|---|---|
| `eventoId` | Identificador do evento selecionado. |
| `espacoId` | Identificador do espaço selecionado. |
| `data` | Data selecionada para a solicitação. |
| `turno` | Turno selecionado. |
| `demo` | Ativa o carregamento de dados demonstrativos. |

### 5.4. Contrato de navegação

A agenda pública deve encaminhar o usuário à página correspondente, informando o identificador da opção selecionada.

Exemplo de navegação para um evento:

```javascript
// Encaminha o evento selecionado para a página de informações.
window.location.href =
  `../detalhes-reserva.html?eventoId=${encodeURIComponent(evento.id)}`;
```

Exemplo de navegação para um espaço disponível:

```javascript
// Preserva o espaço, a data e o turno selecionados.
const parametros = new URLSearchParams({
  espacoId: espaco.id,
  data: dataSelecionada,
  turno: turnoSelecionado
});

window.location.href = `../detalhes-reserva.html?${parametros}`;
```

A página de detalhes realiza a consulta a partir do identificador recebido. Não é necessário transferir o objeto completo do evento pela URL.

## 6. Continuidade para os formulários

O comportamento dos botões de continuidade depende da modalidade apresentada.

### Reserva de espaço

A página pode encaminhar o usuário ao formulário de reserva, preservando o contexto da seleção:

```text
pages/reservas.html?espacoId=1&data=2026-11-20&turno=manha
```

O recebimento desses parâmetros pelo formulário permite uma futura integração para preenchimento automático dos dados relacionados à solicitação.

### Visita mediada

A página de visita utiliza um endereço de continuidade configurável.

O botão correspondente é exibido quando existe um endereço válido para o formulário de agendamento.

As URLs são validadas antes da apresentação dos botões.

## 7. Apresentação das informações

O controlador disponibiliza o método `csaDetalhes.apresentar()`, responsável por preencher os elementos visuais com os dados preparados.

Exemplo de utilização:

```javascript
csaDetalhes.apresentar({
  modalidade: 'evento',
  categoria: 'Auditório',
  titulo: 'Título do evento',
  espaco: 'Auditório',
  descricao: 'Descrição do evento.',
  classificacao: 'Livre',
  orientacoes: '',
  regras: [],
  data: '2026-11-20',
  horario: '09:00',
  urlContinuar: ''
});
```

Os campos opcionais são apresentados conforme o conteúdo disponível.

Essa abordagem permite reutilizar a estrutura visual para diferentes eventos, espaços e visitas.

## 8. Interface e responsividade

As páginas seguem a identidade visual do sistema Casa dos Saberes, utilizando a tipografia Urbanist, os elementos gráficos institucionais e as variáveis CSS compartilhadas.

O layout contempla:

- **Desktop:** organização dos conteúdos em cards principal e lateral.
- **Mobile:** reorganização vertical, com ajustes de espaçamentos, dimensões e tipografia.
- **Navegação:** menu responsivo e botões de interação.
- **Conteúdo:** exibição condicional das seções conforme as informações disponíveis.

Os estilos são centralizados em `css/detalhes.css`, utilizando também as variáveis definidas em `css/base.css`.

## 9. Testes e demonstração

As páginas disponibilizam um modo demonstrativo para validar o funcionamento das interfaces sem depender da disponibilidade do backend.

### Evento demonstrativo

```text
http://127.0.0.1:3001/pages/detalhes-reserva.html?demo=1
```

### Visita demonstrativa

```text
http://127.0.0.1:3001/pages/detalhes-visita.html?demo=1
```

### Espaço do catálogo

```text
http://127.0.0.1:3001/pages/detalhes-reserva.html?espacoId=1
```

O parâmetro `demo=1` utiliza dados de demonstração, mantendo esses exemplos separados das consultas normais.

### Testes automatizados

Execute na raiz do frontend:

```bash
node tests/detalhes.test.cjs
```

Os testes abrangem:

- Validação e formatação de dados.
- Consulta pública de eventos confirmados.
- Restrição de divulgação de eventos pendentes.
- Preparação dos dados de espaços e visitas.
- Isolamento dos dados demonstrativos.
- Organização dos componentes HTML e do controlador.

## 10. Considerações sobre a integração

As páginas estão organizadas para integrar o fluxo público de consulta de eventos e solicitação de agendamentos.

A comunicação entre os módulos utiliza identificadores na URL e uma camada de dados independente da apresentação.

A integração com a agenda pública deve utilizar os parâmetros documentados para encaminhar a opção selecionada.

As informações institucionais, como descrições, regras e orientações, são apresentadas de acordo com os dados disponíveis para cada modalidade.

Essa organização permite integrar os módulos do sistema sem comprometer a separação de responsabilidades, a responsividade e a manutenção das interfaces.
