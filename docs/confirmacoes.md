# Telas de confirmação

Abra com Live Server:

- `pages/cliente/confirmacao-reserva.html?demo=1`
- `pages/cliente/confirmacao-visita.html?demo=1`
- `pages/cliente/reservas.html?demo=1` para demonstrar preenchimento, revisão, edição e confirmação com os dados informados.

Sem `?demo=1`, a confirmação de reserva recupera o rascunho do formulário, quando disponível. Sem rascunho ou entrada válida, aparece o estado sem solicitação. Os exemplos ficam em `js/cliente/confirmacao-dados.js`. Não há endpoint de envio configurado.

O formulário dispara `csa:reserva-preparada` depois de validar as respostas. `js/cliente/reservas-confirmacao.js` guarda o payload original e os arquivos no IndexedDB, usando um identificador de rascunho no sessionStorage da aba, e abre `pages/cliente/confirmacao-reserva.html`. Não há dados pessoais na URL. O resumo resolve os títulos das opções pela definição existente em `reservas-dados.js`, sem manter outro catálogo.

“Voltar e alterar” e o botão superior retornam a `pages/cliente/reservas.html`. O script aguarda `csaReservas.pronto` e restaura os controles existentes, incluindo seleções, aceites e o PDF por `DataTransfer`, notificando o controlador pelo evento `change`. A próxima revisão substitui o rascunho pelos dados atualizados. O rascunho também permite recarregar a confirmação. O armazenamento local precisa estar disponível; falhas são informadas sem navegar nem anunciar sucesso. Não há autosave a cada digitação: o rascunho é salvo ao avançar para a revisão.

O layout e os componentes existentes são reutilizados. A única alteração no formulário é o carregamento do script de integração em seu HTML; o controlador, a definição, os componentes e as regras de validação permanecem inalterados.

## Envio futuro

Sem `window.csaEnviarReserva`, “Confirmar e enviar” informa que o envio ainda não está disponível e preserva o rascunho. A integração futura deverá definir uma função assíncrona `window.csaEnviarReserva(entrada)`. Ela recebe uma cópia de `{ dados: { formularioId, versao, respostas }, arquivos }`, com os arquivos `File` e aceites originais, e deve resolver `{ enviada: true, status: 'pendente' }` ou `{ enviada: true, status: 'confirmada' }` somente após confirmação real do backend. Isso é um contrato local do adaptador, não um endpoint ou schema da API.

Durante a operação os botões ficam desabilitados. Rejeições e respostas sem confirmação explícita exibem erro e permitem corrigir ou tentar novamente. Sucesso oculta as ações de envio. Endpoint, autenticação, transporte do PDF, mapeamento da resposta, proteção contra reenvio entre recargas e encerramento do rascunho após envio deverão ser definidos com o backend.

O modo `?demo=1` é habilitado somente em localhost, loopback ou arquivos locais. O formulário mantém esse parâmetro ao avançar e voltar e utiliza um rascunho separado do fluxo real. A revisão usa os dados preenchidos; sem rascunho, a confirmação demonstra os exemplos existentes. “Confirmar e enviar” apresenta os mesmos textos e estilos de sucesso e “Aguardando aprovação”, sem chamar `csaEnviarReserva`, acessar a API ou marcar o rascunho como enviado. Recarregar volta à revisão. Não há mensagens extras de demonstração na interface. A visita mantém sua demonstração existente. Sem o parâmetro, o sucesso continua exigindo confirmação explícita do adaptador de backend.

## Contrato local de apresentação (proposta, não contrato da API)

A integração pode definir `window.csaConfirmacaoEntrada` antes de `confirmacao.js`, ou chamar:

```js
window.csaConfirmacao.apresentar({
  enviada: true,
  status: 'pendente',
  dados: { responsavel: 'Nome recebido' },
  urlFormulario: '/caminho-real-do-formulario'
});
```

Campos comuns: `responsavel`, `telefone`, `email`, `instituicao`.

Reserva: `segmento`, `pauta`, `classificacao`, `periodicidade`, `publico`, `arquivo` (nome, sem upload), `link` (texto, sem navegação automática).

Visita: `formacao`, `disciplina`, `endereco`, `natureza`, `escolaridade`, `curso`, `local`, `quantidade`, `faixaEtaria`, `grupo`, `acessibilidade`, `quantidadePcd`.

Valores de apresentação são strings ou números. Campos ausentes aparecem como “Não informado”. Nome do responsável, indicação de envio e status reconhecido são necessários para apresentar uma confirmação real. Texto é inserido com `textContent`. Não há persistência em localStorage nem dados pessoais na URL.

`status` aceita `pendente` ou `confirmada`, conforme a resposta real. `urlFormulario` é opcional e aceita somente a mesma origem HTTP(S). O objeto acima exemplifica apenas a interface de apresentação; não é enviado a nenhum endpoint.

O botão superior de retorno fica desabilitado sem URL de formulário configurada. Não são presumidas rotas, protocolos, prazos ou notificações por e-mail. A equipe deve mapear os estados reais da API para este adaptador e definir como os dados chegam à página, inclusive após recarregamento.

## Aparência

CSS e JS compartilhados entre as páginas, isolados por `csa-confirmacao`. Reutiliza o logo `csca-gov.svg` e a faixa `barra1.svg` disponíveis na branch atual. A fonte Outfit é carregada pelo Google Fonts, com fallback local; aparência exata depende da disponibilidade da fonte. Os arquivos globais da agenda não foram alterados. O CSS próprio evita trazer o layout administrativo para o fluxo público.

## Verificação

`node --check js/cliente/confirmacao.js`

`node --test tests/agenda.test.cjs`

`node tests/confirmacao.browser.cjs` (Chrome instalado; opcionalmente configure `CSA_CHROME` com o caminho do executável).

`node tests/reservas-confirmacao.browser.cjs` (Chrome instalado e servidor local em `http://127.0.0.1:3000/`; opcionalmente configure `CSA_BASE_URL`). Verifica o fluxo com dados reais, retorno, preservação do conteúdo do PDF, recarga, edição, remoção de anexo e envio indisponível. Os estados de operação, erro e sucesso usam funções substitutas apenas no teste, sem chamar um backend.
