# Agenda Casa dos Saberes — Front-end (Tela do Administrador, Desktop)

Front-end da **Agenda Administrativa** do sistema de agendamento da **Casa dos Saberes Cego Aderaldo (Quixadá-CE)**.

Nesta tela o administrador:

- visualiza a agenda dos espaços nas visões **semanal** e **diária**;
- **cadastra** eventos;
- **aprova** ou **nega** solicitações pendentes;
- **edita** ou **cancela** eventos aceitos.

> Escopo atual: apenas a tela do administrador na versão **desktop**. A versão mobile é uma etapa futura.

## Sumário

1. [Tecnologias](#tecnologias)
2. [Estrutura de arquivos](#estrutura-de-arquivos)
3. [Como começar](#como-começar)
4. [Como as partes se conectam](#como-as-partes-se-conectam)
5. [Padrões do projeto](#padrões-do-projeto)
6. [Fluxo de trabalho com Git](#fluxo-de-trabalho-com-git)
7. [Divisão do trabalho e cronograma](#divisão-do-trabalho-e-cronograma)
8. [Integração com o WordPress](#integração-com-o-wordpress)
9. [Pendências e pontos em aberto](#pendências-e-pontos-em-aberto)

---

## Tecnologias

- **HTML, CSS e JavaScript puro** (sem frameworks e sem etapa de build)
- **VS Code** como editor, com a extensão **Live Server**
- **Git/GitHub** para versionamento

O site do projeto é feito em **WordPress** (tema Kadence + Elementor). O código puro foi escolhido por facilitar a integração depois.

---

## Estrutura de arquivos

Cada arquivo tem um dono (T1, T2 ou T3). **Cada pessoa edita só os seus arquivos**, o que evita conflitos no Git.

```
agenda-casa-saberes/
├── pages/
│   └── agenda.html          T1   página única: moldura + espaços vazios + linhas que carregam os arquivos
├── css/
│   ├── variaveis.css        T1   cores, fontes, espaçamentos (valores provisórios: trocar pelos do design)
│   ├── base.css             T1   reset e estilos gerais
│   ├── layout.css           T1   header, faixa, sidebar, barra de controle e legenda
│   ├── componentes.css      T1   botão, badge, campo, arquivo anexado, container do painel
│   ├── agenda.css           T2   grade semanal/diária e cards
│   └── paineis.css          T3   conteúdo dos painéis laterais
├── js/
│   ├── utilitarios.js       T1   funções e tabelas de apoio (datas, nomes de espaços, proteção de HTML)
│   ├── dados-exemplo.js     todos  lista de eventos de exemplo (mock)
│   ├── barra-controle.js    T1   Diária/Semanal, setas de data e filtro de status
│   ├── agenda.js            T2   desenha a grade e os cards
│   └── paineis.js           T3   abre/fecha os painéis e monta o conteúdo
├── assets/                  logos, ícones e ilustrações exportados pelo design
├── .gitignore
└── README.md
```

### Imagens e ícones que o design precisa exportar (assets/)

| Onde aparece | Arquivo |
|---|---|
| Header | logo CSA e logo do Governo do Ceará |
| Faixa decorativa abaixo do header | padrão em imagem (repetido na horizontal) |
| Rodapé da sidebar | ilustração do músico com violão |
| Botão Agenda e seletor de data | ícone de calendário |
| Setas da data | seta esquerda e seta direita |
| Filtro "Status" e menu Admin | seta para baixo |
| Cards "Adicionar Evento" | ícone de mais |
| Cards de turno disponível | ícone de calendário pequeno |
| Badge do painel | ícone de check (Aceito) e de relógio (Pendente) |
| Arquivo anexado | ícone de download |
---

## Como começar

### O que instalar

| Ferramenta | Para quê |
|---|---|
| [VS Code](https://code.visualstudio.com) | Editor de código |
| [Git](https://git-scm.com) | Versionamento |
| Extensão **Live Server** (no VS Code) | Abre a página no navegador e atualiza sozinha |
| Extensão **Prettier** (opcional) | Mantém o código padronizado |
| Conta no [GitHub](https://github.com) | Hospedar o repositório |

### Passo a passo

1. Clone o repositório e entre na pasta:

   ```bash
   git clone <link-do-repositorio>
   cd agenda-casa-saberes
   ```

2. Abra a pasta no VS Code.
3. Abra `pages/agenda.html`, clique com o botão direito e escolha **Open with Live Server**.
4. Você já deve ver a agenda com os eventos de exemplo. Clique em um card para abrir o painel lateral.
5. Crie sua branch antes de começar a trabalhar (veja [Fluxo de trabalho com Git](#fluxo-de-trabalho-com-git)).

Não é preciso instalar o WordPress para desenvolver.

---

## Como as partes se conectam

Não há rotas nem `import`. O `agenda.html` é o "palco": ele carrega todos os arquivos com `<link>` e `<script>`, e todos os scripts rodam na **mesma página**, enxergando as mesmas funções e a mesma lista `eventos`. **Só a T1 edita o `agenda.html`.**

```
┌──────────────────────────────────────────────────────────────┐
│ HEADER (T1)                                                  │
├────────┬─────────────────────────────────────┬───────────────┤
│        │ BARRA DE CONTROLE (T1)              │               │
│SIDEBAR │ Diária/Semanal | data | filtro      │  PAINEL       │
│ (T1)   ├─────────────────────────────────────┤  LATERAL      │
│        │ #csa-agenda (T2)                    │  #csa-painel  │
│        │ grade com os cards                  │  (T3)         │
└────────┴─────────────────────────────────────┴───────────────┘
```

As partes se comunicam por **eventos do navegador**: uma parte avisa, a outra escuta.

| Evento | Quem dispara | Quem escuta | Dados (`detail`) |
|---|---|---|---|
| `csa:mudar-visao` | barra-controle.js (T1) | agenda.js (T2) | `{ visao: "diaria" \| "semanal" }` |
| `csa:mudar-data` | barra-controle.js (T1) | agenda.js (T2) | `{ direcao: -1 \| 1 }` |
| `csa:mudar-filtro` | barra-controle.js (T1) | agenda.js (T2) | `{ status: "todos" \| "aceito" \| "pendente" }` |
| `csa:abrir-detalhes` | agenda.js (T2) | paineis.js (T3) | `{ id }` |
| `csa:abrir-cadastro` | agenda.js (T2) | paineis.js (T3) | `{ data, turno }` |
| `csa:evento-atualizado` | paineis.js (T3) | agenda.js (T2) | `{ id }` |

Exemplo do fluxo ao aprovar uma solicitação:

1. O admin clica no card → a T2 dispara `csa:abrir-detalhes`.
2. A T3 escuta, busca o evento em `eventos` e abre o painel.
3. O admin clica em **Aprovar** → a T3 muda o status e dispara `csa:evento-atualizado`.
4. A T2 escuta e redesenha a grade: o card passa de pendente para aceito.

Os scripts compartilham o mesmo espaço, então **dê nomes específicos às suas funções** (`agendaDesenhar`, `painelAbrir`, `barra...`) para não sobrescrever as do colega.

---

## Padrões do projeto

1. **Prefixo `csa-` em todas as classes CSS** (ex.: `csa-botao`, `csa-card`), para evitar conflito com o tema Kadence e o Elementor do site.
2. **Nada de cor, fonte ou espaçamento escrito direto nos componentes.** Tudo vem das variáveis de `css/variaveis.css`:

   ```css
   .csa-botao--verde { background: var(--csa-verde); }
   ```

3. **Componentes reutilizáveis.** Funções que recebem os dados por parâmetro e devolvem o HTML, sem textos fixos dentro.
4. **Dados de exemplo (mock).** Enquanto o back não definir a API, os dados vêm de `js/dados-exemplo.js`. Quando a API existir, o mock é trocado sem mexer nos componentes.
5. **Escapar textos vindos de dados.** Use `csaEscapar()` ao colocar qualquer texto dentro de `innerHTML`.
6. **Conteúdo separado do container nos painéis.** No desktop, os painéis são laterais; no mobile viram pop-ups. Por isso o conteúdo é montado por funções (`painelConteudo...`) independentes do container (`#csa-painel`).
7. **Seguir o design fielmente.** Se algo estiver inconsistente, anote na tarefa e pergunte ao design, sem inventar.

---

## Fluxo de trabalho com Git

- Cada pessoa trabalha em **uma branch própria**:

  | Tarefa | Branch |
  |---|---|
  | 1. Fundação | `front/fundacao` |
  | 2. Agenda | `front/agenda` |
  | 3. Painéis laterais | `front/paineis` |

- Criar a branch: `git checkout -b front/agenda`
- Salvar e enviar:

  ```bash
  git add .
  git commit -m "Descreve o que foi feito"
  git push -u origin front/agenda
  ```

- Ao terminar, abra um **Pull Request** para a `main` e peça revisão de outra pessoa do front. **Ninguém junta o próprio PR sem revisão.**
- Não envie direto para a `main`.
- Mantenha sua branch atualizada: `git pull origin main`.

---

## Divisão do trabalho e cronograma

| # | Tarefa | Arquivos | O que inclui |
|---|---|---|---|
| 1 | **Fundação** | `agenda.html`, `variaveis.css`, `base.css`, `layout.css`, `componentes.css`, `utilitarios.js`, `barra-controle.js` | Guia de estilos, componentes base, layout (header, sidebar), barra de controle e legenda |
| 2 | **Agenda** | `agenda.css`, `agenda.js` | Grade semanal, grade diária, card de evento (variantes por espaço, compacto e grande), card de turno disponível |
| 3 | **Painéis laterais** | `paineis.css`, `paineis.js` | Cadastrar Evento, Detalhes do Evento (Aceito) e Detalhes da Solicitação (Pendente) |

O repositório já contém um **esqueleto funcional** de todas as partes. A tarefa de cada pessoa é refinar a sua parte até ficar igual ao design.

**Entrega final: 13/10/2026** (12/10 é feriado, então a meta é fechar tudo até 11/10).

| Tarefa | Meta |
|---|---|
| 1. Fundação | componentes base até 08/10; completa até 10/10 |
| 2. Agenda | 11/10 |
| 3. Painéis laterais | 11/10 |
| Fechamento: revisão cruzada, merge e teste do fluxo completo | 11/10 a 13/10 |

---

## Integração com o WordPress

> Esta parte ainda será confirmada com o tech lead e com o responsável pelo site.

O site é de outro desenvolvedor, hospedado na Hostinger, e o plano é gratuito (sem ambiente de teste). A proposta é **não mexer no site publicado** durante o desenvolvimento:

1. **Desenvolver** no VS Code, neste repositório.
2. **Testar dentro do WordPress** com o [LocalWP](https://localwp.com), instalado no computador. Uma cópia do site é exportada com o plugin *All-in-One WP Migration* (já instalado no site) e importada no LocalWP. Exige autorização do responsável pelo site. O arquivo exportado contém o banco de dados completo, então **não deve ser compartilhado em grupos públicos nem enviado ao Git** (o `.gitignore` já ignora `*.wpress`).
3. **Entregar** como um **plugin do WordPress com shortcode** (ex.: `[agenda_admin]`), que o responsável pelo site coloca numa página.

---

## Pendências e pontos em aberto

- [ ] Confirmar com o tech lead o fluxo de integração (LocalWP + plugin com shortcode).
- [ ] Definir **onde o back em Python vai rodar** e como será a API (hospedagem compartilhada costuma não suportar Python).
- [ ] Definir o **login do administrador**: usuário do WordPress ou sistema próprio do back.
- [ ] Design: exportar logos, ícones, ilustração e faixa decorativa; informar as fontes e os valores exatos de cor.
- [ ] Design: corrigir inconsistências entre as telas. Cadastrar Evento não tem celular, classificação indicativa nem anexo e usa "Responsável" onde os detalhes usam "Solicitante"; alguns cards têm horários incoerentes; as datas da semana no mockup (Sex e Sáb) repetem 24/09 e 25/09; o título da semana diz "21 a 27" mas não há coluna de domingo.
- [ ] Combinar com o responsável pelo site o aviso sobre o plugin *PRO Elements* (não é o Elementor Pro oficial).
- [ ] Ligar o botão Confirmar do cadastro, Editar Evento e Cancelar Evento à API do back (hoje só registram no console ou mudam o status no mock).

---

## Equipe

Projeto desenvolvido pela equipe do Projeto Social Casa dos Saberes (UFC Quixadá). Front-end: 3 pessoas. Design e back-end: outras equipes do projeto.