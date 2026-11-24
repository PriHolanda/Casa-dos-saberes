const csaDadosAgenda = (() => {
  const demonstracao = typeof location !== 'undefined' && ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname) && new URLSearchParams(location.search).get('demo') !== '0';
  // A API aceita um identificador inteiro; o catálogo ainda não possui rota própria.
  const espacos = [
    { id: '1', nome: 'Auditório', visual: 'auditorio' },
    { id: '2', nome: 'Quintal', visual: 'quintal' },
    { id: '3', nome: 'Salas Expositivas', visual: 'salas' },
    { id: '4', nome: 'Varanda', visual: 'varanda' }
  ];
  const turnos = [
    { id: 'manha', nome: 'Manhã', inicio: 0, fim: 12 },
    { id: 'tarde', nome: 'Tarde', inicio: 12, fim: 18 },
    { id: 'noite', nome: 'Noite', inicio: 18, fim: 24 }
  ];
  let eventos = [];
  let proximoId = 13;
  const visitasDemonstracao = demonstracao ? Array.from({ length: 8 }, (_, indice) => ({
    id: `demo-visita-${indice + 1}`, instituicao: indice % 2 ? 'EEEP Dário Catunda Fontenele' : 'Universidade Federal do Ceará',
    nome_responsavel: 'Rafael Santos Silva', telefone: '(85) 99162-6347', email: 'rafael@example.com',
    local: 'Sala expositiva', quantidade_pessoas: 15, faixa_etaria: '18 a 22 anos',
    status: indice >= 5 ? 'pendente' : 'aprovada',
    data_inicio: `2026-09-${21 + Math.floor(indice / 2)}T${indice % 2 ? '08' : '14'}:00:00`,
    data_fim: `2026-09-${21 + Math.floor(indice / 2)}T${indice % 2 ? '09' : '15'}:00:00`
  })) : [];
  const statusPersistidos = new Set();
  function dataCivil(valor) {
    if (!/(Z|[+-]\d\d:\d\d)$/.test(valor)) return valor.slice(0, 19);
    const data = new Date(valor);
    const partes = new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Fortaleza', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).format(data);
    return partes.replace(' ', 'T');
  }
  function adaptar(item) {
    if (['aceito', 'pendente'].includes(item.status)) statusPersistidos.add(String(item.id));
    else statusPersistidos.delete(String(item.id));
    const espacoId = String(item.espaco_id);
    if (!espacos.some(e => e.id === espacoId)) throw new Error(`O evento ${item.id} possui um espaço inválido.`);
    const evento = csaAgendaModelo.normalizarEvento({
      id: item.id, nome: item.titulo, descricao: item.descricao,
      inicio: dataCivil(item.data_inicio), termino: dataCivil(item.data_fim),
      espacoId, solicitante: item.responsavel || '',
      publico: item.publico_estimado == null ? '' : String(item.publico_estimado),
      classificacao: item.classificacao_indicativa || '', celular: item.celular || '',
      status: item.status || 'pendente'
    }, espacos);
    if (!evento) throw new Error(`Não foi possível carregar o evento ${item.id}: as informações recebidas são inválidas.`);
    return evento;
  }
  function payload(evento) {
    return { status: evento.status || 'pendente', celular: evento.celular || null, titulo: evento.nome, descricao: evento.descricao, data_inicio: evento.inicio, data_fim: evento.termino,
      espaco_id: Number(evento.espacoId), responsavel: evento.solicitante || null,
      publico_estimado: evento.publico === '' ? null : Number(evento.publico), classificacao_indicativa: evento.classificacao || null };
  }
  async function carregar() {
    if (demonstracao) {
      const exemplos = [
        [21, '09', '12', '1', 'Campeonato de Farmar Aura'],
        [21, '10', '12', '2', 'Apresentação da banda'],
        [21, '14', '16', '3', 'Apresentação legal'],
        [22, '14', '16', '4', 'Apresentação cultural'],
        [22, '09', '12', '1', 'Encontro de cultura'],
        [22, '15', '17', '2', 'Apresentação da banda'],
        [23, '14', '16', '4', 'Oficina de arte'],
        [24, '09', '12', '1', 'Campeonato de Farmar Aura'],
        [24, '15', '17', '2', 'Apresentação da banda'],
        [25, '09', '12', '3', 'Campeonato de FreeFire'],
        [25, '14', '16', '4', 'Encontro da comunidade'],
        [26, '10', '12', '2', 'Apresentação musical']
      ];
      eventos = exemplos.map(([dia, inicio, fim, espaco, titulo], indice) => adaptar({
        id: `demo-evento-${indice + 1}`, titulo, espaco_id: espaco,
        data_inicio: `2026-09-${dia}T${inicio}:00:00`, data_fim: `2026-09-${dia}T${fim}:00:00`,
        status: [2, 3, 6, 10, 11].includes(indice) ? 'pendente' : 'aceito',
        responsavel: 'João Ferreira da Silva', celular: '(85) 12345-6789', publico_estimado: 100,
        classificacao_indicativa: 'Livre', descricao: 'Apresentação cultural com música regional e participação da comunidade. Evento aberto ao público com foco na valorização da cultura local.'
      }));
      return;
    }
    const resultado = await csaApi.requisitar('/eventos/');
    const novos = resultado.eventos.map(adaptar);
    eventos = novos;
  }
  async function salvar(evento, id) {
    if (demonstracao) {
      if (id && !eventos.some(item => item.id === String(id))) throw new Error('Evento não encontrado.');
      const novo = csaAgendaModelo.normalizarEvento({ ...evento, id: id || `demo-evento-${proximoId++}` }, espacos);
      if (!novo) throw new Error('Confira os dados do evento.');
      eventos = eventos.filter(item => item.id !== novo.id).concat(novo);
      return novo;
    }
    const novo = adaptar(await csaApi.requisitar(id ? `/eventos/${encodeURIComponent(id)}` : '/eventos/', { metodo: id ? 'PUT' : 'POST', dados: payload(evento) }));
    eventos = eventos.filter(e => e.id !== novo.id).concat(novo);
    return novo;
  }
  return {
    dataInicial: demonstracao ? '2026-09-21' : new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Fortaleza' }).format(new Date()),
    demonstracao,
    consultarVisitasDemonstracao: () => visitasDemonstracao.map(visita => ({ ...visita })),
    espacos, turnos, carregar, salvar, diasSemana: 7,
    buscarEvento: id => eventos.find(e => e.id === String(id)),
    async atualizarStatus(id, status) {
      const evento = eventos.find(e => e.id === String(id));
      if (!evento) throw new Error('Evento não encontrado.');
      if (!['aceito', 'pendente'].includes(status)) throw new Error('Status inválido.');
      if (demonstracao) return salvar({ ...evento, status }, id);
      if (!statusPersistidos.has(String(id))) {
        throw new Error('Não foi possível aprovar o evento. O serviço não permite atualizar o status no momento.');
      }
      const resposta = await csaApi.requisitar(`/eventos/${encodeURIComponent(id)}`, {
        metodo: 'PUT', dados: payload({ ...evento, status })
      });
      if (resposta.status !== status) throw new Error('A API não confirmou a alteração de status. Recarregue a página.');
      const atualizado = adaptar(resposta);
      eventos = eventos.map(e => e.id === String(id) ? atualizado : e);
      return atualizado;
    },
    async removerEvento(id) {
      if (demonstracao) {
        eventos = eventos.filter(evento => evento.id !== String(id));
        return;
      }
      await csaApi.requisitar(`/eventos/${encodeURIComponent(id)}`, { metodo: 'DELETE' });
      eventos = eventos.filter(e => e.id !== String(id));
    },
    consultarPeriodo(inicio, fim) {
      const de = csaAgendaModelo.lerDia(inicio), ate = csaAgendaModelo.lerDia(fim) + 86400000;
      return { espacos, turnos, eventos: eventos.filter(e => e.inicioMs < ate && e.terminoMs > de) };
    }
  };
})();
