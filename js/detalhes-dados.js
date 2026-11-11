// Fonte local dos espaços e acesso público aos eventos.
// Descrições/regras oficiais e o catálogo de visitas dependem da Casa dos Saberes.
// Não alterar js/dados-api.js: essa fonte é usada pela agenda administrativa.
const csaDadosDetalhes = (() => {
  // IDs e nomes correspondem ao catálogo provisório de js/dados-api.js.
  // Não há endpoint próprio de espaços no backend documentado.
  const espacos = [
    { id: '1', nome: 'Auditório', descricao: '', orientacoes: '', regras: [] },
    { id: '2', nome: 'Quintal', descricao: '', orientacoes: '', regras: [] },
    { id: '3', nome: 'Salas Expositivas', descricao: '', orientacoes: '', regras: [] },
    { id: '4', nome: 'Varanda', descricao: '', orientacoes: '', regras: [] }
  ];

  // Exemplos apenas para ?demo=1, baseados nas telas demonstrativas do protótipo.
  const exemplos = {
    reserva: {
      modalidade: 'evento',
      evento: {
        id: 'demo-1', nome: 'Campeonato de Farmar Aura', espacoId: '1',
        inicio: '2026-09-21T09:00:00', termino: '2026-09-21T12:00:00',
        status: 'aceito', classificacao: '14 anos',
        descricao: 'Uma disputa divertida e criativa onde os participantes mostram presença, estilo e muita atitude para ver quem consegue farmar mais aura. Venha acompanhar, torcer e entrar no clima!'
      },
      espaco: espacos[0]
    },
    visita: {
      modalidade: 'visita',
      visita: {
        titulo: 'Exposição X', categoria: 'SALA EXPOSITIVA', descricaoTitulo: 'Sobre a exposição',
        descricao: 'Descrição demonstrativa da exposição. As informações reais devem ser fornecidas pela Casa dos Saberes.',
        classificacao: '14 anos'
      },
      espaco: espacos[2]
    }
  };

  function encontrarEspaco(id) {
    return espacos.find(espaco => espaco.id === String(id));
  }

  async function consultarEspaco(id) {
    const espaco = encontrarEspaco(id);
    if (!espaco) throw new Error('Espaço não encontrado no catálogo atual.');
    return structuredClone(espaco);
  }

  // GET /eventos/{id}. Por enquanto a consulta por ID usa a listagem existente.
  async function consultarEvento(id) {
    if (typeof id !== 'string' || !id.trim() || id.length > 100) {
      throw new Error('Identificador de evento inválido.');
    }
    const resposta = await csaApi.requisitar('/eventos/', { autenticado: false });
    if (!Array.isArray(resposta?.eventos)) {
      throw new Error('A resposta da agenda não contém uma lista de eventos.');
    }
    const registro = resposta.eventos.find(item => String(item?.id) === id);
    // Não exibir pedidos pendentes nem eventos sem confirmação pública.
    if (!registro || registro.status !== 'aceito') {
      throw new Error('O evento não está disponível para consulta pública.');
    }
    const espaco = encontrarEspaco(registro.espaco_id);
    if (!espaco) throw new Error('O espaço do evento não foi encontrado.');

    const evento = csaAgendaModelo.normalizarEvento({
      id: registro.id,
      nome: registro.titulo,
      descricao: registro.descricao,
      espacoId: registro.espaco_id,
      inicio: dataCivil(registro.data_inicio),
      termino: dataCivil(registro.data_fim),
      status: registro.status,
      classificacao: registro.classificacao_indicativa || '',
      publico: registro.publico_estimado == null ? '' : String(registro.publico_estimado)
    }, espacos);
    if (!evento) throw new Error('Os dados deste evento estão incompletos ou inválidos.');
    return { evento, espaco: structuredClone(espaco) };
  }

  // Mesma convenção civil utilizada em js/dados-api.js, para datas do FastAPI.
  function dataCivil(valor) {
    if (typeof valor !== 'string') return '';
    if (!/(Z|[+-]\d\d:\d\d)$/.test(valor)) return valor.slice(0, 19);
    const data = new Date(valor);
    if (!Number.isFinite(data.getTime())) return '';
    return new Intl.DateTimeFormat('sv-SE', {
      timeZone: 'America/Fortaleza', year: 'numeric', month: '2-digit',
      day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
      hourCycle: 'h23'
    }).format(data).replace(' ', 'T');
  }

  function consultarExemplo(tipo) {
    if (!Object.hasOwn(exemplos, tipo)) throw new Error('Demonstração inexistente.');
    return structuredClone(exemplos[tipo]);
  }

  return { consultarEspaco, consultarEvento, consultarExemplo };
})();
