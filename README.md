# Agenda Casa dos Saberes — Front-end (Tela do Administrador, Desktop)

Front-end da **Agenda Administrativa** do sistema de agendamento da **Casa dos Saberes Cego Aderaldo (Quixadá-CE)**.

Nesta tela o administrador:

- visualiza a agenda dos espaços nas visões **semanal** e **diária**;
- **cadastra** eventos;
- **aprova** ou **nega** solicitações pendentes;
- **edita** ou **cancela** eventos aceitos.

> Escopo atual: apenas a tela do administrador na versão **desktop**. A versão mobile é uma etapa futura.

---

## Sumário

1. [Tecnologias](#tecnologias)
2. [Estrutura de pastas](#estrutura-de-pastas)
3. [Como começar](#como-começar)
4. [Padrões do projeto](#padrões-do-projeto)
5. [Fluxo de trabalho com Git](#fluxo-de-trabalho-com-git)
6. [Divisão do trabalho](#divisão-do-trabalho)
7. [Integração com o WordPress](#integração-com-o-wordpress)
8. [Pendências e pontos em aberto](#pendências-e-pontos-em-aberto)

---

## Tecnologias

- **HTML, CSS e JavaScript puro** (sem frameworks)
- **VS Code** como editor
- **Git/GitHub** para versionamento
- **Live Server** (extensão do VS Code) para visualizar as páginas

O site do projeto é feito em **WordPress** (tema Kadence + Elementor). O código puro foi escolhido por facilitar a integração depois.

---

## Estrutura de pastas

```
agenda-casa-saberes/
├── css/
│   ├── variaveis.css      # cores, fontes e espaçamentos (única fonte de estilo global)
│   ├── base.css           # reset e estilos gerais
│   └── componentes.css    # estilos dos componentes reutilizáveis
├── js/
│   └── dados-exemplo.js   # dados de exemplo (mock) até a API do back existir
├── pages/
│   ├── componentes.html   # vitrine de todos os componentes (documentação e teste)
│   └── agenda.html        # tela da Agenda Administrativa
├── assets/                # logos, ícones e ilustrações
└── README.md
```

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
3. Abra `pages/agenda.html` (ou `pages/componentes.html`), clique com o botão direito e escolha **Open with Live Server**.
4. Crie sua branch antes de começar a trabalhar (veja [Fluxo de trabalho com Git](#fluxo-de-trabalho-com-git)).

Não é preciso instalar o WordPress para desenvolver. Ele só entra na hora de testar dentro do site (veja [Integração com o WordPress](#integração-com-o-wordpress)).

---

## Padrões do projeto

Todo o time segue estas regras:

1. **Prefixo `csa-` em todas as classes CSS** (ex.: `csa-botao`, `csa-card`). Isso evita conflito com o tema Kadence e com o Elementor do site.
2. **Nada de cor, fonte ou espaçamento escrito direto nos componentes.** Tudo vem das variáveis de `css/variaveis.css`:

   ```css
   .csa-botao--verde { background: var(--csa-verde); }
   ```

3. **Componentes reutilizáveis e isolados.** Cada componente recebe seus dados por parâmetro, sem textos ou valores fixos dentro:

   ```js
   function criarCardEvento(evento, compacto) { /* devolve o HTML do card */ }
   ```

4. **Dados de exemplo (mock).** Enquanto o back não definir a API, os dados vêm de `js/dados-exemplo.js`. Quando a API existir, o mock é trocado sem mexer nos componentes.
5. **Conteúdo separado do container nos painéis.** No desktop, Cadastrar Evento, Detalhes do Evento e Detalhes da Solicitação aparecem num **painel lateral**; no mobile viram **pop-ups**. Por isso o conteúdo de cada painel é uma função independente do container que o exibe.
6. **Seguir o design fielmente.** Se algo estiver inconsistente ou faltando, anote na tarefa e pergunte ao design, sem inventar.

### Comunicação entre a agenda e os painéis

A agenda dispara eventos do navegador e os painéis os escutam:

| Evento | Quando dispara | Dados (`detail`) |
|---|---|---|
| `csa:abrir-detalhes` | Clique em um card de evento | `{ id }` |
| `csa:abrir-cadastro` | Clique em "Adicionar Evento" | `{ data, turno }` |

```js
document.dispatchEvent(new CustomEvent("csa:abrir-detalhes", { detail: { id: 1 } }));
```

---

## Fluxo de trabalho com Git

- Cada pessoa trabalha em **uma branch própria**:

  | Tarefa | Branch |
  |---|---|
  | 1. Fundação | `front/fundacao` |
  | 2. Agenda | `front/agenda` |
  | 3. Painéis laterais | `front/paineis` |

- Criar a branch:

  ```bash
  git checkout -b front/agenda
  ```

- Salvar e enviar o trabalho:

  ```bash
  git add .
  git commit -m "Descreve o que foi feito"
  git push -u origin front/agenda
  ```

- Ao terminar, abra um **Pull Request** para a `main` e peça revisão de outra pessoa do front. **Ninguém junta o próprio PR sem revisão.**
- Não envie direto para a `main`.
- Mantenha sua branch atualizada: `git pull origin main`.

---

## Divisão do trabalho

| # | Tarefa | O que inclui | Depende de |
|---|---|---|---|
| 1 | **Fundação** | Guia de estilos (variáveis CSS), componentes base (botão, badge de status, campo, item de arquivo anexado, container do painel), layout base (header e sidebar) e barra de controle (Diária/Semanal, navegação de data, filtro de status, legenda) | — |
| 2 | **Agenda** | Grade semanal, grade diária, card de evento (variantes por espaço, versões compacta e grande), card de turno disponível, toggle Diária/Semanal | Badge e cores da Tarefa 1 |
| 3 | **Painéis laterais** | Cadastrar Evento, Detalhes do Evento (Aceito) e Detalhes da Solicitação (Pendente), com Detalhes como componente único | Botão, campos, badge, anexo e container da Tarefa 1 |

A Tarefa 1 é a base das outras duas, por isso entrega primeiro. Enquanto ela não termina, as tarefas 2 e 3 usam estilos provisórios e trocam depois.

### Cronograma (entrega final: 13/10/2026)

| Tarefa | Meta |
|---|---|
| 1. Fundação | 10/10 (componentes base até 08/10) |
| 2. Agenda | 11/10 |
| 3. Painéis laterais | 11/10 |
| Fechamento: revisão cruzada, merge e teste do fluxo completo | 11/10 a 13/10 |

---

## Integração com o WordPress

> Esta parte ainda será confirmada com o tech lead e com o responsável pelo site.

O site é de outro desenvolvedor, hospedado na Hostinger, e o plano é gratuito (sem ambiente de teste). A proposta é **não mexer no site publicado** durante o desenvolvimento:

1. **Desenvolver** no VS Code, em HTML/CSS/JS puro, neste repositório.
2. **Testar dentro do WordPress** com o [LocalWP](https://localwp.com), instalado no computador. Uma cópia do site é exportada com o plugin *All-in-One WP Migration* (já instalado no site) e importada no LocalWP. Exige autorização do responsável pelo site. O arquivo exportado contém o banco de dados completo, então **não deve ser compartilhado em grupos públicos nem enviado ao Git**.
3. **Entregar** como um **plugin do WordPress com shortcode** (ex.: `[agenda_admin]`), que o responsável pelo site coloca numa página.

---

## Pendências e pontos em aberto

- [ ] Confirmar com o tech lead o fluxo de integração (LocalWP + plugin com shortcode).
- [ ] Definir **onde o back em Python vai rodar** e como será a API (hospedagem compartilhada costuma não suportar Python).
- [ ] Definir o **login do administrador**: usuário do WordPress ou sistema próprio do back.
- [ ] Design: ajustar inconsistências entre as telas (ex.: Cadastrar Evento não tem celular, classificação indicativa nem anexo, e usa "Responsável" onde os detalhes usam "Solicitante"; alguns cards têm horários incoerentes).
- [ ] Combinar com o responsável pelo site o aviso sobre o plugin *PRO Elements* (não é o Elementor Pro oficial).

---

## Equipe

Projeto desenvolvido pela equipe do Projeto Social Casa dos Saberes (UFC Quixadá). Front-end: 3 pessoas. Design e back-end: outras equipes do projeto.