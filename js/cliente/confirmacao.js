(() => {
  'use strict';
  const tipo = document.body.dataset.csaTipo;
  const demo = new URLSearchParams(window.location.search).get('demo') === '1';
  const grade = document.getElementById('csa-confirmacao-grade');
  const estado = document.getElementById('csa-confirmacao-estado');
  const botaoVoltar = document.querySelector('[data-csa-voltar]');
  const titulo = document.getElementById('csa-confirmacao-titulo');
  const comum = [['responsavel', tipo === 'reserva' ? 'Responsável pelo agendamento' : 'Responsável pela visita'], ['telefone', 'Telefone'], ['email', 'E-mail']];
  const secoes = tipo === 'reserva' ? [
    ['Dados do responsável', [...comum, ['instituicao', 'Instituição, grupo ou coletivo']]],
    ['Sobre a proposta', [['segmento', 'Segmento'], ['pauta', 'Pauta'], ['classificacao', 'Classificação indicativa'], ['periodicidade', 'Periodicidade'], ['publico', 'Público estimado']]],
    ['Anexos da proposta', [['arquivo', 'Arquivo anexado'], ['link', 'Link complementar']]]
  ] : [
    ['Dados do responsável', [...comum, ['formacao', 'Formação do responsável'], ['disciplina', 'Disciplina que ministra']]],
    ['Sobre a instituição', [['instituicao', 'Nome da instituição'], ['endereco', 'Endereço da instituição'], ['natureza', 'Natureza da instituição'], ['escolaridade', 'Grau de escolaridade'], ['curso', 'Curso e semestre']]],
    ['Sobre a visita', [['local', 'Local solicitado'], ['quantidade', 'Quantidade de pessoas'], ['faixaEtaria', 'Faixa etária'], ['grupo', 'Grupo composto em sua maioria por:'], ['acessibilidade', 'Pessoas com deficiência?'], ['quantidadePcd', 'Número de pessoas com deficiência']]]
  ];
  let retorno = null;
  function elemento(tag, classe, texto) {
    const no = document.createElement(tag);
    if (classe) no.className = classe;
    if (texto !== undefined) no.textContent = texto;
    return no;
  }
  function voltar() {
    if (retorno) window.location.assign(retorno);
  }
  botaoVoltar.addEventListener('click', voltar);
  function mostrarStatus(status) {
    estado.replaceChildren();
    const confirmada = status === 'confirmada';
    estado.append(elemento('h2', '', 'Solicitação enviada com sucesso!'));
    estado.append(elemento('span', 'csa-confirmacao-status' + (confirmada ? ' csa-confirmacao-status--confirmada' : ''), confirmada ? 'Confirmada' : 'Aguardando aprovação'));
    estado.append(elemento('p', '', confirmada
      ? 'Sua solicitação foi confirmada. Confira abaixo os dados enviados.'
      : 'Sua solicitação foi recebida e será analisada pela equipe da Casa dos Saberes. Aguarde o retorno com as próximas orientações.'));
    estado.hidden = false;
  }
  function renderizar(entrada, demonstracao = false) {
    grade.replaceChildren();
    grade.hidden = true;
    estado.hidden = false;
    botaoVoltar.disabled = true;
    titulo.textContent = 'Confirme as Informações';
    retorno = null;
    const dados = entrada && entrada.dados;
    if (!dados || typeof dados !== 'object' || Array.isArray(dados) || typeof dados.responsavel !== 'string' || !dados.responsavel.trim()
      || (!demonstracao && (entrada.enviada !== true || !['pendente', 'confirmada'].includes(entrada.status)))) {
      estado.replaceChildren(elemento('h2', '', 'Nenhuma solicitação disponível'), elemento('p', '', 'Não foi possível localizar os dados de uma solicitação enviada. Nenhum envio foi confirmado nesta página.'));
      const link = elemento('a', 'csa-confirmacao-exemplos', 'Visualizar demonstração com dados fictícios');
      link.href = '?demo=1';
      estado.append(link);
      return;
    }
    if (typeof entrada.urlFormulario === 'string') {
      try {
        const url = new URL(entrada.urlFormulario, window.location.href);
        if (url.origin === window.location.origin && ['http:', 'https:'].includes(url.protocol)) retorno = url.href;
      } catch {
        retorno = null;
      }
    }
    botaoVoltar.disabled = !retorno;
    for (const [nome, campos] of secoes) {
      const card = elemento('section', 'csa-confirmacao-card');
      card.append(elemento('h2', '', nome));
      const lista = elemento('dl');
      for (const [chave, rotulo] of campos) {
        const campo = elemento('div', 'csa-confirmacao-campo');
        const valor = dados[chave];
        const temValor = (typeof valor === 'string' && valor.trim()) || Number.isFinite(valor);
        campo.append(elemento('dt', '', rotulo), elemento('dd', '', temValor ? String(valor) : 'Não informado'));
        lista.append(campo);
      }
      card.append(lista);
      grade.append(card);
    }
    grade.hidden = false;
    if (demonstracao) {
      estado.hidden = true;
      const termos = elemento('p', 'csa-confirmacao-termos', 'Ao confirmar, você declara que revisou as informações e está de acordo com os termos apresentados no formulário.');
      const acoes = elemento('div', 'csa-confirmacao-acoes');
      const confirmar = elemento('button', 'csa-confirmacao-botao csa-confirmacao-botao--principal', 'Confirmar e enviar');
      confirmar.type = 'button';
      confirmar.addEventListener('click', () => {
        mostrarStatus('pendente');
        termos.hidden = true;
        acoes.hidden = true;
        titulo.textContent = 'Resumo da solicitação';
        estado.focus();
      });
      const alterar = elemento('button', 'csa-confirmacao-botao', 'Voltar e alterar');
      alterar.type = 'button';
      acoes.append(confirmar, alterar);
      grade.append(termos, acoes);
    } else {
      titulo.textContent = 'Resumo da solicitação';
      mostrarStatus(entrada.status);
    }
  }
  window.csaConfirmacao = Object.freeze({ apresentar: entrada => renderizar(entrada) });
  renderizar(demo ? { dados: window.csaConfirmacaoExemplos?.[tipo] } : window.csaConfirmacaoEntrada, demo);
})();
