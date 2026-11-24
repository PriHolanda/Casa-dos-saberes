(() => {
  'use strict';
  const tipo = document.body.dataset.csaTipo;
  const demo = new URLSearchParams(window.location.search).get('demo') === '1'
    && (['localhost', '127.0.0.1', '[::1]'].includes(location.hostname) || location.protocol === 'file:');
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
    ['Sobre a visita', [['quantidade', 'Quantidade de pessoas'], ['faixaEtaria', 'Faixa etária'], ['grupo', 'Grupo composto em sua maioria por:'], ['acessibilidade', 'Pessoas com deficiência?'], ['quantidadePcd', 'Número de pessoas com deficiência'], ['trabalho', 'O grupo trabalhou ou pretende trabalhar alguma questão referente a exposição em sala de aula?'], ['primeiraVisita', 'Primeira vez visitando a Casa de Saberes Cego Aderaldo'], ['objetivo', 'Objetivo da visita'], ['preparacao', 'Foi realizada alguma atividade de preparação para a visitação do equipamento?']]]
  ];
  let retorno = null;
  let aoVoltar = null;
  function elemento(tag, classe, texto) {
    const no = document.createElement(tag);
    if (classe) no.className = classe;
    if (texto !== undefined) no.textContent = texto;
    return no;
  }
  function voltar() {
    if (aoVoltar) { aoVoltar(); return; }
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
  function renderizar(entrada, demonstracao = false, revisao = null) {
    grade.replaceChildren();
    grade.hidden = true;
    estado.hidden = false;
    botaoVoltar.disabled = true;
    titulo.textContent = tipo === 'visita' ? 'Confirme as informações' : 'Confirme as Informações';
    retorno = null;
    aoVoltar = revisao?.voltar || null;
    const dados = entrada && entrada.dados;
    if (!dados || typeof dados !== 'object' || Array.isArray(dados) || typeof dados.responsavel !== 'string' || !dados.responsavel.trim()
      || (!demonstracao && !revisao && (entrada.enviada !== true || !['pendente', 'confirmada'].includes(entrada.status)))) {
      estado.replaceChildren(elemento('h2', '', 'Nenhuma solicitação disponível'), elemento('p', '', 'Não foi possível localizar a solicitação. Retorne ao formulário para conferir suas informações.'));
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
    botaoVoltar.disabled = !retorno && !aoVoltar;
    for (const [indice, [nome, campos]] of secoes.entries()) {
      const card = elemento('section', 'csa-confirmacao-card');
      card.append(elemento('h2', '', nome));
      const lista = elemento('dl');
      const extras = tipo === 'visita' && indice === 2 && Array.isArray(entrada.extras) ? entrada.extras : [];
      for (const [chave, rotulo] of [...campos, ...extras]) {
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
    if (demonstracao || revisao) {
      estado.hidden = true;
      const termos = elemento('p', 'csa-confirmacao-termos', 'Ao confirmar, você declara que revisou as informações e está de acordo com os termos apresentados no formulário.');
      termos.prepend(elemento('span', '', 'Atenção:'), ' ');
      const acoes = elemento('div', 'csa-confirmacao-acoes');
      const confirmar = elemento('button', 'csa-confirmacao-botao csa-confirmacao-botao--principal', 'Confirmar e enviar');
      confirmar.type = 'button';
      confirmar.addEventListener('click', async () => {
        let status = 'pendente';
        if (revisao && !demonstracao) {
          confirmar.disabled = true;
          alterar.disabled = true;
          botaoVoltar.disabled = true;
          estado.replaceChildren(elemento('p', '', 'Enviando solicitação…'));
          estado.hidden = false;
          estado.setAttribute('aria-busy', 'true');
          try {
            const resposta = await revisao.enviar();
            if (resposta?.enviada !== true || !['pendente', 'confirmada'].includes(resposta.status)) {
              throw new Error('Não foi possível confirmar o envio. Suas informações foram preservadas.');
            }
            status = resposta.status;
            aoVoltar = null;
          } catch (erro) {
            estado.replaceChildren(elemento('h2', '', 'Envio não concluído'), elemento('p', '', erro?.message || 'Não foi possível enviar. Suas informações foram preservadas.'));
            confirmar.disabled = false;
            alterar.disabled = false;
            botaoVoltar.disabled = false;
            return;
          } finally {
            estado.removeAttribute('aria-busy');
            estado.focus();
          }
        }
        if (revisao?.sucesso) { revisao.sucesso(); return; }
        mostrarStatus(status);
        termos.hidden = true;
        acoes.hidden = true;
        titulo.textContent = 'Resumo da solicitação';
        estado.focus();
      });
      const alterar = elemento('button', 'csa-confirmacao-botao', 'Voltar e alterar');
      alterar.type = 'button';
      if (revisao) alterar.addEventListener('click', voltar);
      acoes.append(confirmar, alterar);
      grade.append(termos, acoes);
    } else {
      titulo.textContent = 'Resumo da solicitação';
      mostrarStatus(entrada.status);
    }
  }
  window.csaConfirmacao = Object.freeze({
    apresentar: entrada => renderizar(entrada),
    revisar: (entrada, acoes) => renderizar(entrada, demo, acoes)
  });
  renderizar(demo ? { dados: window.csaConfirmacaoExemplos?.[tipo] } : window.csaConfirmacaoEntrada, demo);
})();
