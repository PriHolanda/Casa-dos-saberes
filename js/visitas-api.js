const csaVisitasApi = (() => {
  const { salas } = csaVisitasModelo;
  const publica = { autenticado: false };

  function lista(valor) {
    if (!Array.isArray(valor)) throw new Error('O servidor retornou dados de visita inválidos.');
    return valor;
  }

  async function exposicoes() {
    return lista((await csaApi.requisitar('/exposicoes/', publica))?.exposicoes).map(exposicao => ({
      ...exposicao, sala: salas[exposicao.sala_id - 1]
    }));
  }

  async function editorExposicoes() {
    const painel = await csaApi.requisitar('/exposicoes/administracao');
    return { salas: lista(painel?.salas), exposicoes: lista(painel?.exposicoes) };
  }

  async function salvarExposicao(salaId, dados) {
    const resposta = await csaApi.requisitar(`/exposicoes/${encodeURIComponent(salaId)}`, { metodo: 'PUT', dados });
    if (resposta?.sala_id !== salaId || typeof resposta.pausada !== 'boolean') {
      throw new Error('O servidor não confirmou o salvamento da exposição.');
    }
    return resposta;
  }

  async function formulario() {
    return lista((await csaApi.requisitar('/visitas/formulario', publica))?.campos);
  }

  async function salvarFormulario(campos) {
    const resposta = await csaApi.requisitar('/visitas/formulario', { metodo: 'PUT', dados: { campos } });
    return lista(resposta?.campos);
  }

  async function disponibilidade(dia) {
    const resposta = await csaApi.requisitar(`/visitas/disponibilidade?${new URLSearchParams({ data: dia })}`, publica);
    if (resposta?.data !== dia) throw new Error('O servidor não retornou a disponibilidade da data escolhida.');
    return lista(resposta.horarios_reservaveis);
  }

  async function enviar(dados) {
    const resposta = await csaApi.requisitar('/visitas/', { ...publica, metodo: 'POST', dados });
    if (!Number.isSafeInteger(resposta?.id) || resposta.id <= 0 || resposta.status !== 'pendente') {
      throw new Error('O servidor não confirmou o recebimento da solicitação.');
    }
    return { enviada: true, status: resposta.status, id: resposta.id };
  }

  return { exposicoes, editorExposicoes, salvarExposicao, formulario, salvarFormulario, disponibilidade, enviar };
})();
