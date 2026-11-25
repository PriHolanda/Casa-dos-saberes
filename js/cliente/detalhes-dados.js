
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
  const { espacos } = csaAgendaModelo;

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

  async function consultarEvento(id) {
    if (typeof id !== 'string' || !/^\d+$/.test(id)) {
      throw new Error('Identificador de evento inválido.');
    }

    const eventos = await csaProgramacao.consultarEventos();
    const evento = eventos.find(item => item.id === id);
    if (!evento) throw new Error('O evento não está disponível para consulta pública.');

    return { evento, espaco: await consultarEspaco(evento.espacoId) };
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
