# Telas de confirmação

Abra com Live Server:

- `pages/confirmacao-reserva.html?demo=1`
- `pages/confirmacao-visita.html?demo=1`

Sem `?demo=1` e sem entrada válida, aparece o estado sem solicitação. Os exemplos ficam em `js/confirmacao-dados.js`. Nenhuma página envia dados ou acessa uma API.

Os protótipos apresentam revisão anterior ao envio. Esse visual e seus botões foram preservados na demonstração; “Confirmar e enviar” apenas mostra uma simulação pendente. Para uma resposta real já enviada, a página apresenta o resumo e o status, sem oferecer um segundo envio.

O modo `?demo=1` usa os textos finais de sucesso e “Aguardando aprovação”, sem realizar envio. Sem esse parâmetro, o sucesso exige uma entrada válida com `enviada: true` e status reconhecido, que a integração deverá fornecer somente após o sucesso da API. “Voltar e alterar” permanece clicável e sem ação. O botão superior de retorno fica desabilitado quando não há uma URL válida de formulário, sem exibir avisos adicionais.

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

`node --check js/confirmacao.js`

`node --test tests/agenda.test.cjs`

`node tests/confirmacao.browser.cjs` (Chrome instalado; opcionalmente configure `CSA_CHROME` com o caminho do executável).
