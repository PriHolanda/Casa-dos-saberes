
// Fonte de dados das páginas de informações.
//
// Eventos: consulta registros confirmados da programação pública.
// Espaços: identifica os locais associados aos eventos e visitas.
// Demonstração: fornece exemplos para testar as interfaces.
//
// A solicitação de reserva de espaços livres pertence ao formulário
// de reservas, acessado diretamente pela agenda pública.
//
// As descrições e orientações oficiais dependem dos dados
// disponibilizados pela Casa dos Saberes.

const csaDadosDetalhes = (() => {
  // Catálogo de espaços utilizado para identificar os locais.
  // Os identificadores seguem o catálogo atual da agenda.
  const espacos = [
    {
      id: '1',
      nome: 'Auditório',
      descricao: '',
      orientacoes: '',
      regras: []
    },
    {
      id: '2',
      nome: 'Quintal',
      descricao: '',
      orientacoes: '',
      regras: []
    },
    {
      id: '3',
      nome: 'Salas Expositivas',
      descricao: '',
      orientacoes: '',
      regras: []
    },
    {
      id: '4',
      nome: 'Varanda',
      descricao: '',
      orientacoes: '',
      regras: []
    }
  ];

  // Exemplos utilizados exclusivamente quando ?demo=1.
  const exemplos = {
    reserva: {
      modalidade: 'evento',
      evento: {
        id: 'demo-1',
        nome: 'Campeonato de Farmar Aura',
        espacoId: '1',
        inicio: '2026-09-21T09:00:00',
        termino: '2026-09-21T12:00:00',
        status: 'aceito',
        classificacao: '14 anos',
        descricao:
          'Uma disputa divertida e criativa onde os participantes mostram presença, estilo e muita atitude para ver quem consegue farmar mais aura. Venha acompanhar, torcer e entrar no clima!'
      },
      espaco: espacos[0]
    },

    visita: {
      modalidade: 'visita',
      visita: {
        titulo: 'Exposição X',
        categoria: 'SALA EXPOSITIVA',
        descricaoTitulo: 'Sobre a exposição',
        descricao:
          'Descrição demonstrativa da exposição. As informações reais devem ser fornecidas pela Casa dos Saberes.',
        classificacao: '14 anos'
      },
      espaco: espacos[2]
    }
  };

  function encontrarEspaco(id) {
    return espacos.find(
      espaco => espaco.id === String(id)
    );
  }

  // Consulta os dados de um espaço do catálogo.
  // Utilizada para identificar os locais das atividades.
  async function consultarEspaco(id) {
    const espaco = encontrarEspaco(id);

    if (!espaco) {
      throw new Error('Espaço não encontrado no catálogo atual.');
    }

    return structuredClone(espaco);
  }

  // Consulta um evento público pelo identificador.
  //
  // A API disponibiliza GET /eventos/.
  // A busca por ID é feita sobre a listagem retornada.
  //
  // Apenas registros com status 'aceito' podem ser apresentados
  // como eventos confirmados na programação pública.
  async function consultarEvento(id) {
    if (
      typeof id !== 'string' ||
      !id.trim() ||
      id.length > 100
    ) {
      throw new Error('Identificador de evento inválido.');
    }

    const resposta = await csaApi.requisitar('/eventos/', {
      autenticado: false
    });

    if (!Array.isArray(resposta?.eventos)) {
      throw new Error(
        'A resposta da agenda não contém uma lista de eventos.'
      );
    }

    const registro = resposta.eventos.find(
      item => String(item?.id) === id
    );

    if (!registro || registro.status !== 'aceito') {
      throw new Error(
        'O evento não está disponível para consulta pública.'
      );
    }

    const espaco = encontrarEspaco(registro.espaco_id);

    if (!espaco) {
      throw new Error('O espaço do evento não foi encontrado.');
    }

    // Reaproveita a normalização do modelo da agenda.
    const evento = csaAgendaModelo.normalizarEvento({
      id: registro.id,
      nome: registro.titulo,
      descricao: registro.descricao,
      espacoId: registro.espaco_id,
      inicio: dataCivil(registro.data_inicio),
      termino: dataCivil(registro.data_fim),
      status: registro.status,
      classificacao: registro.classificacao_indicativa || '',
      publico: registro.publico_estimado == null
        ? ''
        : String(registro.publico_estimado)
    }, espacos);

    if (!evento) {
      throw new Error(
        'Os dados deste evento estão incompletos ou inválidos.'
      );
    }

    return {
      evento,
      espaco: structuredClone(espaco)
    };
  }

  // Converte datas recebidas da API para a convenção civil
  // utilizada pelo modelo da agenda, no fuso de Fortaleza.
  function dataCivil(valor) {
    if (typeof valor !== 'string') return '';

    if (!/(Z|[+-]\d\d:\d\d)$/.test(valor)) {
      return valor.slice(0, 19);
    }

    const data = new Date(valor);

    if (!Number.isFinite(data.getTime())) return '';

    return new Intl.DateTimeFormat('sv-SE', {
      timeZone: 'America/Fortaleza',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23'
    }).format(data).replace(' ', 'T');
  }

  // Exemplos isolados das consultas reais.
  function consultarExemplo(tipo) {
    if (!Object.hasOwn(exemplos, tipo)) {
      throw new Error('Demonstração inexistente.');
    }

    return structuredClone(exemplos[tipo]);
  }

  return {
    consultarEspaco,
    consultarEvento,
    consultarExemplo
  };
})();
