# Formulário de reserva

Página: `pages/reservas.html`. Referências: [desktop no Figma](https://www.figma.com/design/tMVK9Y7SW6weOfEss6KhDf/SGA---Casa-de-Saberes--c%C3%B3pia-?node-id=398-403), frame de 1544 × 2359 px, e [mobile no Figma](https://www.figma.com/design/tMVK9Y7SW6weOfEss6KhDf/SGA---Casa-de-Saberes--c%C3%B3pia-?node-id=90-582), frame de 402 × 2854 px.

Esta entrega implementa somente o frontend. A página não depende de login, Keycloak ou FastAPI. Não consulta disponibilidade, não envia reservas e não persiste dados. As respostas e o PDF permanecem na memória da página até que ela seja fechada ou recarregada.

## Abrir e verificar

Para visualizar somente esta página, execute `./scripts/iniciar-reservas.sh` na raiz e abra **http://127.0.0.1:3001/pages/reservas.html**. Esse script usa somente um servidor estático Python, sem consultar backend ou Keycloak. Use `Ctrl+C` para encerrar e `PORT=3002 ./scripts/iniciar-reservas.sh` para escolher outra porta. Também é possível abrir o arquivo com Live Server.

O caminho atual é uma página HTML física, como as outras telas do projeto. Não foi adicionado roteador, framework, etapa de build ou alteração no redirecionamento da página inicial.

## Organização e responsabilidades

| Arquivo | Responsabilidade |
|---|---|
| `pages/reservas.html` | Moldura, cabeçalho, introdução e formulário; carrega os recursos na ordem necessária. |
| `css/reservas.css` | Tokens locais, layout e aparência dos componentes. Reutiliza `base.css` e `componentes.css`, com prefixo `csa-`. |
| `js/reservas-dados.js` | Definição local das perguntas e consultas assíncronas por ID. Ponto de substituição por HTTP. |
| `js/reservas-modelo.js` | Validação da definição, respostas e preparação dos dados para a futura integração; sem DOM. |
| `js/reservas-perguntas/base.js` | Estrutura de cada pergunta: título, descrição, corpo e erro; escape de textos. |
| `js/reservas-perguntas/aberta.js` | Campo de texto, telefone, e-mail, URL, número ou texto longo. A descrição aparece como placeholder. |
| `js/reservas-perguntas/escolha.js` | Escolha única ou múltipla, com opções recebidas nos dados. |
| `js/reservas-perguntas/anexo.js` | Seletor de PDF e área de arquivo selecionado. |
| `js/reservas-perguntas/termo.js` | Aceite individual de um termo. |
| `js/reservas-perguntas/registro.js` | Resolve o componente pelo tipo da pergunta. |
| `js/reservas.js` | Consulta, montagem das colunas, apresentação responsiva, eventos, erros, arquivo e menu. |
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

Nesta fase, altere apenas o array `perguntas` em `js/reservas-dados.js`:

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
- PDF deve ter conteúdo, extensão `.pdf`, MIME compatível e até 10 MB. A validação de conteúdo e segurança do arquivo deverá ser feita novamente no servidor.
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

Ao clicar em **Enviar formulário**, o controlador valida as respostas. Se houver erro, exibe a mensagem junto à pergunta e move o foco para o primeiro controle inválido. Se estiver válido, mantém os campos, informa que nenhuma solicitação foi enviada e dispara:

```js
document.addEventListener('csa:reserva-preparada', evento => {
  const { dados, arquivos } = evento.detail;
  // Ponto de integração futuro: revisão ou envio pela API.
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

O evento real inclui todas as perguntas presentes na definição. `arquivos` é um objeto separado, indexado por ID da pergunta, contendo os objetos `File` originais. Não tentar transmitir `File` como JSON. Para integração com upload, usar `FormData`/multipart ou um fluxo de upload separado definido com o backend. O adaptador HTTP existente hoje serializa JSON; precisa ser estendido caso seja escolhido multipart.

## Rotas sugeridas para o backend — ainda não implementadas

Estes caminhos são uma proposta de contrato, não rotas existentes no FastAPI:

| Método e rota | Uso futuro |
|---|---|
| `GET /formularios/reservas` | Obter definição publicada completa, versão e regras. |
| `GET /formularios/reservas/perguntas/{perguntaId}` | Consultar uma pergunta por ID. |
| `POST /formularios/reservas/perguntas` | Administrador adiciona uma pergunta. |
| `PATCH /formularios/reservas/perguntas/{perguntaId}` | Administrador edita título, descrição, opções, coluna ou ordem. |
| `DELETE /formularios/reservas/perguntas/{perguntaId}` | Administrador remove uma pergunta da próxima versão. |
| `POST /solicitacoes-reserva` | Enviar respostas vinculadas à versão e os anexos, conforme contrato a definir. |

Para integrar a leitura, substitua o conteúdo de `consultarFormulario` e `consultarPergunta` pela requisição ao servidor, mantendo o formato documentado. O controlador já aguarda a consulta e trata falha de carregamento. Os componentes permanecem iguais.

Para integrar o envio, acrescente estados de envio, sucesso e falha no controlador, conecte o evento ou chame um serviço dedicado e só exiba confirmação após resposta real. O botão desta entrega não usa `csaApi`, não envia HTTP e não gera um número de reserva fictício.

Autorização das rotas administrativas, validação no servidor, retenção de respostas por versão e destino dos anexos ficam para o backend. Antes de excluir perguntas, preservar as definições usadas por solicitações anteriores. Também será necessário definir como a agenda pública fornecerá o espaço, a data e o horário escolhidos: esses campos não aparecem nesta tela do protótipo. Hoje os links “Voltar para agenda” apontam para a página de agenda existente, que mantém seu fluxo atual de autenticação. A tela de confirmação do Figma e a edição administrativa não fazem parte desta entrega.

## Aparência e verificação

O desktop usa as duas colunas do Figma, fonte Urbanist, faixa, logos, menu, seta e imagem do seletor de arquivo exportados localmente. A fonte variável e sua licença vêm do diretório `ofl/urbanist` do repositório Google Fonts. O CSS tem escopo na página de reservas e preserva os tamanhos nativos dos SVGs; a seta recebe transformação no tamanho do frame de referência.

As duplicações sobrepostas de algumas opções na árvore do Figma foram tratadas como uma única opção visível. O texto extra fora dos limites do frame não foi adicionado ao formulário.

### Apresentação mobile automática

A mesma URL usa o layout mobile quando a janela tem até **760 px** ou quando o dispositivo tem ponteiro primário de toque e não possui hover. Essa segunda condição mantém a apresentação mobile em celulares na horizontal e tablets, mesmo acima de 760 px, sem depender de identificação por user agent ou de uma rota separada.

A condição compartilhada pelo CSS e pelo `matchMedia` do controlador é:

```css
(max-width: 760px), (hover: none) and (pointer: coarse)
```

Se o breakpoint mudar, atualize tanto `css/reservas.css` quanto `js/reservas.js`. A alteração de apresentação não recarrega o formulário e não refaz seus componentes.

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
