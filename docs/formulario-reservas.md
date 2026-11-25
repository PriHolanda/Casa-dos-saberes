# Formulário de reserva

Página: `pages/cliente/reservas.html`. Referências: [desktop no Figma](https://www.figma.com/design/tMVK9Y7SW6weOfEss6KhDf/SGA---Casa-de-Saberes--c%C3%B3pia-?node-id=398-403), frame de 1544 × 2359 px, e [mobile no Figma](https://www.figma.com/design/tMVK9Y7SW6weOfEss6KhDf/SGA---Casa-de-Saberes--c%C3%B3pia-?node-id=90-582), frame de 402 × 2854 px.

O formulário parte do horário escolhido na agenda pública e funciona sem login. As respostas e o PDF ficam em um rascunho local para revisão. Ao confirmar, o frontend consulta novamente a disponibilidade e envia a solicitação ao FastAPI.

## Abrir e verificar

Para visualizar somente esta página, execute `./scripts/iniciar-reservas.sh` na raiz e abra **http://127.0.0.1:3001/pages/cliente/reservas.html**. Esse script usa somente um servidor estático Python, sem consultar backend ou Keycloak. Use `Ctrl+C` para encerrar e `PORT=3002 ./scripts/iniciar-reservas.sh` para escolher outra porta. Também é possível abrir o arquivo com Live Server.

O caminho atual é uma página HTML física, como as outras telas do projeto. Não foi adicionado roteador, framework, etapa de build ou alteração no redirecionamento da página inicial.

## Organização e responsabilidades

| Arquivo | Responsabilidade |
|---|---|
| `pages/cliente/reservas.html` | Moldura, cabeçalho, introdução e formulário; carrega os recursos na ordem necessária. |
| `css/cliente/reservas.css` | Tokens locais, layout e aparência dos componentes. Reutiliza `base.css` e `componentes.css`, com prefixo `csa-`. |
| `js/cliente/reservas-dados.js` | Definição local das perguntas e consultas assíncronas por ID. Ponto de substituição por HTTP. |
| `js/cliente/reservas-modelo.js` | Validação da definição, respostas e preparação dos dados para a futura integração; sem DOM. |
| `js/cliente/reservas-perguntas/base.js` | Estrutura de cada pergunta: título, descrição, corpo e erro; escape de textos. |
| `js/cliente/reservas-perguntas/aberta.js` | Campo de texto, telefone, e-mail, URL, número ou texto longo. A descrição aparece como placeholder. |
| `js/cliente/reservas-perguntas/escolha.js` | Escolha única ou múltipla, com opções recebidas nos dados. |
| `js/cliente/reservas-perguntas/anexo.js` | Seletor de PDF e área de arquivo selecionado. |
| `js/cliente/reservas-perguntas/termo.js` | Aceite individual de um termo. |
| `js/cliente/reservas-perguntas/registro.js` | Resolve o componente pelo tipo da pergunta. |
| `js/cliente/reservas.js` | Consulta, montagem das colunas, apresentação responsiva, eventos, erros, arquivo e menu. |
| `assets/reservas/` | Recursos exportados do Figma e fonte Urbanist local, com licença. |
| `tests/reservas.test.cjs` | Contrato dinâmico, validação, escape de conteúdo e recursos locais. |

Os scripts seguem o padrão existente: `<script defer>` na ordem de dependência, objetos com nomes específicos e comunicação por `CustomEvent`, sem imports. Os componentes recebem dados por parâmetro e retornam HTML; não consultam a fonte nem fazem requisições.

## Cada pergunta é uma instância isolada

As 13 perguntas são renderizadas separadamente por `csaPerguntasReserva.renderizar(pergunta, valor)`. Cada uma recebe o próprio objeto e possui `data-pergunta-id`, nome de campo, título, corpo e mensagem de erro independentes. Perguntas do mesmo tipo compartilham o componente visual, sem depender do título ou de uma posição fixa no formulário.

Não há uma função diferente para cada texto do protótipo: isso impediria o administrador de cadastrar uma pergunta nova apenas pelos dados. O registro de componentes é por **tipo**, e a identificação e edição de cada pergunta são por **ID**.

Exemplo de definição de pergunta aberta:

```js
{
  id: 'responsavel',
  tipo: 'aberta',
  titulo: 'Responsável pelo agendamento',
  descricao: 'Nome',
  campo: 'text',
  autocomplete: 'name',
  obrigatoria: true,
  limite: 255,
  coluna: 'principal',
  ordem: 10
}
```

| Campo | Contrato |
|---|---|
| `id` | Identificador estável, único, começando com letra minúscula; demais caracteres: letras minúsculas, números e hífen. Não usar o título como ID. |
| `tipo` | `aberta`, `escolha`, `anexo` ou `termo`. Novos tipos exigem componente e validação correspondentes. |
| `titulo` | Texto do título, obrigatório. |
| `descricao` | Ajuda em texto simples. Em abertas, fica dentro do campo, em cinza claro; nas demais, aparece abaixo do título quando preenchida. |
| `mobile` | Objeto opcional com `titulo` e/ou `descricao` específicos do protótipo mobile. Campos ausentes usam os textos padrão. Não altera ID, opções, validação ou resposta. |
| `obrigatoria` | Booleano que controla a validação, sujeito às regras entre perguntas. |
| `coluna` | `principal` ou `complementar`. Em telas estreitas, a coluna complementar aparece depois da principal. |
| `ordem` | Número de ordenação dentro da coluna; independe da posição no array. |
| `campo` | Em abertas: `text`, `tel`, `email`, `url`, `number` ou `textarea`. |
| `limite`, `minimo`, `autocomplete` | Configuração adicional de campos abertos. |
| `tituloVisivel` | `false` mantém o título acessível, ocultando-o visualmente. Usado no link opcional para reproduzir o Figma. |
| `multipla`, `opcoes` | Em escolhas: seleção múltipla/única e lista `{ id, titulo }`. IDs de opções também devem ser estáveis. |
| `aceita`, `limiteBytes` | Em anexos: filtro do seletor e limite em bytes; o tipo atual aceita PDF. |
| `texto` | Em termos: texto associado à caixa de aceite. |

Textos são escapados antes de entrar no HTML. Não enviar HTML na descrição ou no título. Nomes de arquivos selecionados usam `textContent`.

As perguntas fechadas do protótipo não têm descrição adicional; o campo `descricao` fica vazio, mas já é suportado pelo componente. “Outro” mantém somente a opção mostrada no design. Nenhuma opção ou termo inicia marcado: as marcações do mockup ilustram o estado selecionado, não um consentimento do usuário.

Exemplo de variação de apresentação na mesma pergunta:

```js
{
  id: 'responsavel',
  tipo: 'aberta',
  titulo: 'Responsável pelo agendamento',
  descricao: 'Nome',
  mobile: { descricao: 'Digite o nome' },
  campo: 'text',
  obrigatoria: true,
  coluna: 'principal',
  ordem: 10
}
```

`csaReservasModelo.apresentacao(pergunta, mobile)` resolve esses textos. O controlador atualiza somente os títulos, descrições, placeholders e nome acessível do anexo com `textContent`/atributos. Os controles permanecem no DOM; girar o dispositivo ou redimensionar a janela preserva respostas, seleções, termos e PDF. Quando o administrador mudar um texto que tenha variante mobile, deverá revisar também essa variante.

## IDs da versão inicial

| ID | Pergunta / valor |
|---|---|
| `responsavel` | Nome do responsável; string. |
| `telefone` | Telefone com DDD; string. |
| `email` | E-mail; string. |
| `instituicao` | Instituição, grupo ou coletivo; string. |
| `segmentos` | Array de IDs de segmentos. |
| `pautas` | Array de IDs de pautas. |
| `periodicidade` | ID de uma opção. |
| `classificacao` | ID de uma opção. |
| `publico` | Inteiro positivo no payload. |
| `proposta` | PDF local; metadados ou `null` no payload, `File` separado. |
| `link-proposta` | URL HTTP(S) ou string vazia. |
| `ciencia-analise` | Booleano de aceite. |
| `ciencia-logos` | Booleano de aceite. |

## Adicionar, editar, remover ou reordenar

Nesta fase, altere apenas o array `perguntas` em `js/cliente/reservas-dados.js`:

1. Para adicionar, inclua uma definição com novo ID e tipo já registrado. O controlador cria a instância automaticamente.
2. Para editar, altere título, descrição, opções e regras, preservando o ID se ainda for a mesma pergunta.
3. Para remover, exclua a definição e ajuste regras que façam referência ao ID removido.
4. Para reordenar ou trocar de coluna, altere `ordem` ou `coluna`.
5. Incremente `versao` quando publicar uma nova definição que receberá respostas.

A página não contém uma lista paralela de perguntas. A coleta, a validação e o payload percorrem a definição carregada. Uma pergunta removida deixa de gerar campo e resposta. Uma pergunta nova do tipo `aberta` com `campo: 'textarea'`, por exemplo, funciona sem mudança no HTML.

`csaDadosReservas.consultarFormulario('reservas')` devolve uma cópia completa e independente. `csaDadosReservas.consultarPergunta('reservas', 'email')` consulta uma pergunta isolada. Ambas já são assíncronas para facilitar a troca da fonte local pela API.

## Regras atuais e decisões a confirmar na integração

O protótipo define o conteúdo e a aparência, mas não todos os critérios de validação. Os parâmetros abaixo são configurações iniciais do frontend, a confirmar com a equipe:

- Dados do responsável, instituição, segmentos, pautas, periodicidade, classificação e público são obrigatórios.
- Segmentos e pautas permitem múltiplas escolhas. Periodicidade e classificação permitem somente uma, com controles nativos `radio` e aparência quadrada do protótipo.
- Público deve ser inteiro a partir de 1. Telefone aceita DDD com ou sem código 55. E-mail e URL recebem validação básica.
- É obrigatório fornecer PDF **ou** link. Informar ambos também é permitido. O link é opcional quando existe PDF.
- PDF deve ter conteúdo, extensão `.pdf`, MIME compatível e até 10 MB. A validação de conteúdo do arquivo também é feita no servidor. No fluxo integrado, o limite é de 30 MB.
- Os dois termos exigem aceite explícito.

A alternativa PDF/link fica em `alternativasObrigatorias`, junto da definição, sem regra baseada em posição do campo:

```js
alternativasObrigatorias: [{
  ids: ['proposta', 'link-proposta'],
  mensagem: 'Adicione a proposta em PDF ou informe um link para ela.'
}]
```

A definição é validada antes da renderização. IDs repetidos, tipos desconhecidos, opções inválidas e referências a perguntas removidas geram falha de carregamento, em vez de aceitar um formulário incompleto silenciosamente.

## Preparação do envio

Ao clicar em **Enviar formulário**, o controlador valida as respostas. Se houver erro, exibe a mensagem junto à pergunta e move o foco para o primeiro controle inválido. Se estiver válido, prepara o rascunho para a revisão e dispara:

```js
document.addEventListener('csa:reserva-preparada', evento => {
  const { dados, arquivos } = evento.detail;
  // O controlador da confirmação guarda os dados e abre a revisão.
});
```

`dados` é serializável em JSON. Exemplo parcial:

```json
{
  "formularioId": "reservas",
  "versao": 1,
  "respostas": {
    "responsavel": "Maria Silva",
    "segmentos": ["musica"],
    "pautas": ["social"],
    "periodicidade": "mensal",
    "classificacao": "livre",
    "publico": 80,
    "proposta": { "nome": "proposta.pdf", "tamanho": 1500, "tipo": "application/pdf" },
    "link-proposta": "",
    "ciencia-analise": true,
    "ciencia-logos": true
  }
}
```

O evento inclui todas as perguntas da definição. `arquivos` conserva os objetos `File` originais, indexados por ID da pergunta. O controlador envia `POST /eventos/` em JSON quando há apenas link e em multipart com `dados` e `arquivo` quando há PDF. A solicitação só aparece como enviada quando a API confirma um ID e status pendente.

O FastAPI aceita um segmento e uma pauta por solicitação. A definição das perguntas de reserva ainda pertence ao frontend. Consulte os [contratos usados na integração](integracao-backend.md).

## Aparência e verificação

O desktop usa as duas colunas do Figma, fonte Urbanist, faixa, logos, menu, seta e imagem do seletor de arquivo exportados localmente. A fonte variável e sua licença vêm do diretório `ofl/urbanist` do repositório Google Fonts. O CSS tem escopo na página de reservas e preserva os tamanhos nativos dos SVGs; a seta recebe transformação no tamanho do frame de referência.

As duplicações sobrepostas de algumas opções na árvore do Figma foram tratadas como uma única opção visível. O texto extra fora dos limites do frame não foi adicionado ao formulário.

### Apresentação mobile automática

A mesma URL usa o layout mobile quando a janela tem até **760 px** ou quando o dispositivo tem ponteiro primário de toque e não possui hover. Essa segunda condição mantém a apresentação mobile em celulares na horizontal e tablets, mesmo acima de 760 px, sem depender de identificação por user agent ou de uma rota separada.

A condição compartilhada pelo CSS e pelo `matchMedia` do controlador é:

```css
(max-width: 760px), (hover: none) and (pointer: coarse)
```

Se o breakpoint mudar, atualize tanto `css/cliente/reservas.css` quanto `js/cliente/reservas.js`. A alteração de apresentação não recarrega o formulário e não refaz seus componentes.

O mobile reproduz as margens de 30 px, título de 30 px, campos de 40 px, caixas de seleção de 30 px, tipografia e quebras de linha dos grupos, área de PDF de 154 px e botão de largura completa do frame. Em dispositivos largos de toque, o conteúdo mantém uma coluna com largura máxima de 600 px. O cabeçalho usa sua faixa e fundo próprios, exportados em `faixa-mobile.png` e `menu-base-mobile.svg`; os demais recursos são compartilhados com o desktop.

O aviso introdutório fica visualmente oculto no mobile conforme o protótipo, mantendo a associação acessível `aria-describedby` do formulário. O título abreviado da classificação e os placeholders específicos ficam nos dados de cada pergunta. Campos digitáveis usam fonte de 16 px para evitar zoom automático no Safari móvel; o texto de ajuda mantém os 13 px do design. Textos longos e mensagens de erro podem aumentar naturalmente a altura da página.

Para conferir pelo computador, execute `./scripts/iniciar-reservas.sh`, abra a página e ative a visualização de dispositivo no navegador com largura de 402 px. Em celulares e tablets, a apresentação é selecionada automaticamente. As telas de confirmação mobile do Figma continuam fora deste escopo.

Execute:

```bash
./scripts/testar.sh
node tests/reservas.test.cjs
```

Os sete testes específicos cobrem alterações da definição, consultas por ID, estado inicial, textos mobile e fallback para desktop, validação, PDF/link, payload, escape de conteúdo e recursos locais. Na verificação em Chromium foram conferidos o frame de 1544 px, larguras de 1366, 1024, 760, 402 e 320 px, seleção única/múltipla, foco nos erros, PDF inválido/válido, remoção, menu e evento de preparação. As imagens carregaram localmente com as dimensões esperadas, sem erros de execução ou requisições de envio.

Também foram verificadas emulação de toque, dimensões móveis de 402 × 874, 390 × 844, 320 × 568, celular na horizontal em 844 × 390 e tablet em 1024 × 768. A mudança entre mobile e desktop preservou o mesmo controle, seu valor, seleção, aceite e arquivo. A captura desktop permaneceu idêntica à versão aprovada antes do ajuste mobile.
