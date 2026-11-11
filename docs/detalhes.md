
# Páginas de Informações — Eventos e Visitas Mediadas

## 1. Visão geral

As páginas de informações da Casa dos Saberes Cego Aderaldo apresentam ao usuário os detalhes de eventos e visitas mediadas disponíveis para consulta na programação pública.

A funcionalidade permite visualizar informações como título, descrição, espaço de realização, data, horário, classificação indicativa e orientações relacionadas à atividade.

A implementação utiliza HTML, CSS e JavaScript puro, seguindo a arquitetura modular adotada no frontend do projeto.

As páginas possuem estrutura responsiva e compartilham os módulos de consulta, preparação e apresentação dos dados.

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
| `detalhes-reserva.html` | Apresentação das informações de eventos cadastrados e confirmados. |
| `detalhes-visita.html` | Apresentação das informações de visitas mediadas. |
| `detalhes.css` | Estilos compartilhados e responsividade das páginas. |
| `detalhes-dados.js` | Consulta e disponibilização dos dados utilizados nas páginas. |
| `detalhes-modelo.js` | Validação, normalização e formatação das informações. |
| `detalhes.js` | Controlador responsável pelo carregamento e preenchimento das interfaces. |
| `detalhes.test.cjs` | Testes automatizados das principais regras e comportamentos. |

## 3. Arquitetura

A funcionalidade segue a separação de responsabilidades utilizada no frontend, organizando a implementação em três camadas principais: dados, modelo e controlador.

### 3.1. Camada de dados

O módulo `detalhes-dados.js` centraliza as consultas necessárias para a apresentação de eventos e visitas.

Suas principais responsabilidades são:

- Consultar eventos a partir de seus identificadores.
- Recuperar informações dos espaços associados às atividades.
- Disponibilizar dados demonstrativos para testes.
- Isolar a origem dos dados da lógica de apresentação.

#### Consulta de eventos

Os eventos são consultados por meio do endpoint:

`GET /eventos/`

A requisição é realizada utilizando `csaApi.requisitar`, com a opção `autenticado: false`, permitindo o acesso público às informações disponibilizadas pela API.

O módulo identifica o evento solicitado pelo seu ID e verifica o status do registro.

Somente eventos com status `aceito` são considerados disponíveis para apresentação pública.

Após identificar o evento, o módulo resolve o espaço associado e utiliza o modelo da agenda para validar e normalizar as informações recebidas.

#### Informações dos espaços

A camada de dados mantém um catálogo de espaços culturais utilizado para identificar os locais associados aos eventos e visitas.

O catálogo contempla:

- Auditório.
- Quintal.
- Salas Expositivas.
- Varanda.

As consultas retornam cópias dos objetos, evitando alterações acidentais na fonte original.

Os espaços são utilizados como informações complementares das atividades, não como uma modalidade independente da página de detalhes dos eventos.

### 3.2. Camada de modelo

O módulo `detalhes-modelo.js` concentra as regras de preparação dos dados apresentados nas páginas.

Suas principais funções são:

- `normalizarApresentacao()`: valida e normaliza a estrutura dos dados destinados à interface.
- `prepararEvento()`: prepara as informações de um evento e seu espaço correspondente.
- `prepararVisita()`: prepara as informações de uma visita mediada.
- `formatarData()`: formata datas no padrão brasileiro.
- `formatarHorario()`: formata horários para apresentação.

O modelo não realiza requisições nem acessa diretamente os elementos HTML.

#### Preparação dos eventos

A função `prepararEvento()` utiliza `csaAgendaModelo.normalizarEvento()` para verificar a consistência dos dados do evento.

Essa validação contempla a identificação do evento, a relação com o espaço e a consistência das datas e dos horários.

Após a validação, o evento é preparado para apresentação, utilizando os campos esperados pelo controlador.

#### Preparação das visitas

A função `prepararVisita()` organiza as informações de visitas mediadas, considerando os dados específicos da atividade e seu espaço correspondente.

Campos opcionais são normalizados, permitindo que a interface apresente somente as informações disponíveis.

### 3.3. Controlador

O módulo `detalhes.js` coordena o funcionamento das duas páginas.

Suas responsabilidades incluem:

- Identificar a modalidade da página acessada.
- Interpretar os parâmetros recebidos pela URL.
- Consultar os dados necessários.
- Preparar as informações para apresentação.
- Preencher os elementos HTML.
- Controlar a visibilidade das seções opcionais.
- Apresentar mensagens de carregamento e indisponibilidade.
- Gerenciar o menu de navegação.

A estrutura principal dos cards é definida diretamente nos arquivos HTML.

O controlador utiliza `textContent` para preencher títulos, descrições e demais informações.

As listas variáveis de regras são preenchidas dinamicamente com elementos `li`, mantendo a estrutura principal dos cards independente da quantidade de informações recebidas.

## 4. Páginas implementadas

### 4.1. Detalhes dos eventos

**Arquivo:** `pages/detalhes-reserva.html`

A página apresenta as informações de um evento selecionado na programação pública da Casa dos Saberes.

As informações disponíveis incluem:

- Nome do evento.
- Espaço de realização.
- Data e horário.
- Descrição da atividade.
- Classificação indicativa.
- Orientações e regras, quando disponíveis.

A página possui caráter informativo e não realiza solicitações de reserva.

Eventos cadastrados e confirmados podem ser consultados por meio de seus identificadores.

### 4.2. Detalhes das visitas mediadas

**Arquivo:** `pages/detalhes-visita.html`

A página apresenta informações relacionadas às visitas mediadas e aos espaços destinados a essas atividades.

O conteúdo contempla:

- Identificação da visita ou atividade.
- Espaço correspondente.
- Descrição.
- Classificação indicativa.
- Data e horário, quando disponíveis.
- Orientações e regras relacionadas à visita.

A interface adapta a apresentação conforme a disponibilidade dos dados.

Assim como a página de eventos, sua responsabilidade é exclusivamente informativa.

## 5. Navegação e integração com a agenda

As páginas são organizadas para receber as informações selecionadas na agenda pública.

### 5.1. Eventos

A agenda deve encaminhar o identificador do evento selecionado para a página de detalhes.

Exemplo:

```text
pages/detalhes-reserva.html?eventoId=15
```

O parâmetro `eventoId` identifica o registro que deverá ser consultado.

O controlador realiza a consulta, prepara as informações recebidas e preenche a interface.

Exemplo de navegação a partir da agenda pública:

```javascript
// Encaminha o evento selecionado para sua página de informações.
window.location.href =
  `../detalhes-reserva.html?eventoId=${encodeURIComponent(evento.id)}`;
```

A integração utiliza o identificador do evento, sem necessidade de transferir o objeto completo pela URL.

### 5.2. Visitas mediadas

A página de visitas pode ser acessada com o identificador de um espaço associado:

```text
pages/detalhes-visita.html?espacoId=3
```

Nesse cenário, o controlador utiliza as informações disponíveis no catálogo de espaços para preparar a apresentação básica da visita.

A identificação de visitas individuais dependerá do contrato de dados definido para esse módulo.

### 5.3. Solicitação de reserva de espaços

A solicitação de uso de espaços disponíveis constitui um fluxo independente da apresentação dos detalhes dos eventos.

Quando um usuário seleciona a opção **Solicitar reserva** na agenda pública, a navegação deve encaminhá-lo diretamente ao formulário:

```text
pages/reservas.html
```

A página `detalhes-reserva.html` não participa desse fluxo.

Essa separação mantém as responsabilidades das funcionalidades bem definidas:

- A agenda apresenta a programação e as opções disponíveis.
- As páginas de detalhes apresentam informações das atividades.
- O formulário de reservas recebe solicitações de uso de espaços.

## 6. Contrato de apresentação

O controlador disponibiliza o método `csaDetalhes.apresentar()`, responsável por preencher os elementos visuais com as informações recebidas.

Exemplo de utilização:

```javascript
csaDetalhes.apresentar({
  modalidade: 'evento',
  categoria: 'Auditório',
  titulo: 'Título do evento',
  espaco: 'Auditório',
  descricao: 'Descrição da atividade.',
  descricaoTitulo: 'Sobre o evento',
  classificacao: 'Livre',
  data: '2026-11-20',
  horario: '09:00',
  orientacoes: '',
  regras: []
});
```

Os campos opcionais são apresentados somente quando possuem conteúdo.

### Estrutura dos dados

| Campo | Descrição |
|---|---|
| `modalidade` | Identifica o tipo de apresentação. |
| `categoria` | Categoria ou espaço associado à atividade. |
| `titulo` | Título principal apresentado na página. |
| `espaco` | Nome do espaço de realização. |
| `descricao` | Descrição da atividade. |
| `descricaoTitulo` | Título da seção de descrição. |
| `classificacao` | Classificação indicativa. |
| `data` | Data da atividade no formato `YYYY-MM-DD`. |
| `horario` | Horário no formato `HH:mm`. |
| `orientacoes` | Orientações relacionadas à atividade. |
| `regras` | Lista de regras aplicáveis. |

O método `apresentar()` valida os dados antes de atualizar a interface.

As informações são inseridas utilizando operações seguras de manipulação do DOM, sem interpretar o conteúdo recebido como HTML.

## 7. Interface e responsividade

As páginas seguem a identidade visual do sistema Casa dos Saberes, utilizando tipografia Urbanist, elementos gráficos institucionais e variáveis CSS compartilhadas.

### Desktop

A interface organiza as informações em dois cards principais:

- **Card principal:** título, categoria, data, horário, descrição e orientações.
- **Card lateral:** espaço de realização e classificação indicativa.

### Mobile

Em telas menores, os cards são reorganizados verticalmente.

Também são adaptados:

- Espaçamentos internos e externos.
- Dimensões dos elementos.
- Tipografia.
- Organização das informações.
- Menu de navegação.

Os estilos são centralizados em `css/detalhes.css`, utilizando as variáveis globais definidas em `css/base.css`.

## 8. Estados de apresentação

O controlador gerencia diferentes estados durante o funcionamento das páginas.

### Carregamento

Ao iniciar uma consulta, a interface apresenta uma mensagem de carregamento.

### Apresentação

Após a obtenção e preparação dos dados, os cards são preenchidos e disponibilizados para visualização.

### Informações opcionais

Seções que não possuem informações disponíveis permanecem ocultas.

Isso permite apresentar diferentes atividades utilizando a mesma estrutura visual.

### Indisponibilidade

Quando os dados não podem ser consultados ou são considerados inválidos, a interface apresenta uma mensagem informativa sem modificar sua estrutura principal.

## 9. Testes e demonstração

As páginas disponibilizam um modo demonstrativo para validação das interfaces sem depender da disponibilidade do backend.

### Evento demonstrativo

```text
http://127.0.0.1:3001/pages/detalhes-reserva.html?demo=1
```

### Visita demonstrativa

```text
http://127.0.0.1:3001/pages/detalhes-visita.html?demo=1
```

### Consulta de espaço associado à visita

```text
http://127.0.0.1:3001/pages/detalhes-visita.html?espacoId=3
```

O parâmetro `demo=1` utiliza exemplos específicos para testes, mantendo-os separados das consultas normais.

### Testes automatizados

Para executar os testes, utilize o comando na raiz do projeto:

```bash
node tests/detalhes.test.cjs
```

Os testes verificam:

1. Validação de datas, horários e títulos.
2. Consulta de eventos confirmados sem autenticação administrativa.
3. Restrição de exibição pública de eventos pendentes.
4. Integridade dos dados do catálogo de espaços.
5. Preparação das informações de visitas mediadas.
6. Isolamento dos dados demonstrativos.
7. Organização dos componentes HTML e ausência de botões de continuidade.

Também é possível verificar a sintaxe dos módulos:

```bash
node --check js/detalhes-dados.js
node --check js/detalhes-modelo.js
node --check js/detalhes.js
```

## 10. Considerações sobre integração

As páginas foram organizadas para receber informações da agenda pública e apresentar os detalhes correspondentes à seleção do usuário.

A comunicação utiliza identificadores na URL e uma camada de consulta independente da interface.

A consulta de eventos considera os registros confirmados disponibilizados pelo backend, enquanto a preparação dos dados preserva compatibilidade com o modelo da agenda.

As descrições, regras e orientações específicas são apresentadas conforme as informações disponibilizadas para cada atividade.

A separação entre dados, modelo e controlador facilita a manutenção, a integração com os demais módulos do projeto e a evolução das interfaces sem comprometer suas responsabilidades.
