// Regras puras de preparação: sem DOM, fetch ou armazenamento.
// A interface recebe uma única estrutura de apresentação, independente da fonte.
const csaDetalhesModelo = (() => {
  const turnos = { manha: 'Manhã', tarde: 'Tarde', noite: 'Noite' };

  function texto(valor) {
    return typeof valor === 'string' ? valor.trim() : '';
  }

  function dataValida(valor) {
    return Boolean(texto(valor)) && csaAgendaModelo.lerDia(valor) !== null;
  }

  function horarioValido(valor) {
    if (!/^\d{2}:\d{2}$/.test(valor)) return false;
    const [horas, minutos] = valor.split(':').map(Number);
    return horas < 24 && minutos < 60;
  }

  function regrasValidas(lista) {
    if (!Array.isArray(lista)) return [];
    return lista.filter(item => typeof item === 'string' && item.trim()).map(item => item.trim());
  }

  function normalizarApresentacao(entrada) {
    if (!entrada || typeof entrada !== 'object' || Array.isArray(entrada) || !texto(entrada.titulo)) {
      throw new Error('Dados de apresentação inválidos: título obrigatório.');
    }
    if (entrada.data && !dataValida(entrada.data)) throw new Error('Data de apresentação inválida.');
    if (entrada.horario && !horarioValido(entrada.horario)) throw new Error('Horário de apresentação inválido.');
    return {
      modalidade: texto(entrada.modalidade),
      categoria: texto(entrada.categoria),
      titulo: texto(entrada.titulo),
      descricao: texto(entrada.descricao),
      descricaoTitulo: texto(entrada.descricaoTitulo),
      espaco: texto(entrada.espaco),
      classificacao: texto(entrada.classificacao),
      data: texto(entrada.data),
      horario: texto(entrada.horario),
      turno: texto(entrada.turno),
      orientacoes: texto(entrada.orientacoes),
      regras: regrasValidas(entrada.regras),
      urlContinuar: texto(entrada.urlContinuar)
    };
  }

  function prepararEvento(evento, espaco) {
    if (!evento || !espaco || typeof espaco.nome !== 'string') {
      throw new Error('Evento ou espaço inválido.');
    }
    // Reutiliza a normalização de datas e referências ao espaço da agenda.
    const normalizado = csaAgendaModelo.normalizarEvento(evento, [espaco]);
    if (!normalizado) throw new Error('Evento inválido.');
    return normalizarApresentacao({
      modalidade: 'evento',
      categoria: espaco.nome,
      titulo: normalizado.nome,
      espaco: espaco.nome,
      descricao: normalizado.descricao,
      descricaoTitulo: 'Sobre o evento',
      classificacao: normalizado.classificacao,
      data: normalizado.inicio.slice(0, 10),
      horario: normalizado.horarioInicio,
      orientacoes: espaco.orientacoes,
      regras: espaco.regras
      // Evento da programação pública: o botão de reserva não aparece.
    });
  }

  function prepararEspaco(espaco, selecao = {}) {
    if (!espaco || !texto(espaco.id) || !texto(espaco.nome)) {
      throw new Error('Informações do espaço inválidas.');
    }
    const data = texto(selecao.data);
    const turnoId = texto(selecao.turno);
    if (data && !dataValida(data)) throw new Error('Data selecionada inválida.');
    if (turnoId && !Object.hasOwn(turnos, turnoId)) throw new Error('Turno selecionado inválido.');

    // O formulário atual não lê esses parâmetros, mas o contexto é preservado
    // na URL para integração posterior sem editar js/reservas.js nesta task.
    const parametros = new URLSearchParams({ espacoId: espaco.id });
    if (data) parametros.set('data', data);
    if (turnoId) parametros.set('turno', turnoId);

    return normalizarApresentacao({
      modalidade: 'espaco',
      categoria: 'Espaço para reserva',
      titulo: espaco.nome,
      espaco: espaco.nome,
      descricao: espaco.descricao,
      descricaoTitulo: 'Sobre o espaço',
      orientacoes: espaco.orientacoes,
      regras: espaco.regras,
      data,
      turno: turnos[turnoId] || '',
      urlContinuar: `reservas.html?${parametros}`
    });
  }

  function prepararVisita(visita, espaco, urlFormulario = '') {
    if (!espaco || !texto(espaco.nome)) {
      throw new Error('Espaço da visita inválido.');
    }
    if (!visita || typeof visita !== 'object' || Array.isArray(visita)) {
      throw new Error('Informações da visita inválidas.');
    }
    return normalizarApresentacao({
      modalidade: 'visita',
      categoria: texto(visita.categoria) || 'Visita mediada',
      titulo: texto(visita.titulo) || 'Visita mediada',
      espaco: espaco.nome,
      descricao: visita.descricao || espaco.descricao,
      descricaoTitulo: visita.descricaoTitulo || 'Sobre a visita',
      classificacao: visita.classificacao,
      orientacoes: visita.orientacoes || espaco.orientacoes,
      regras: visita.regras || espaco.regras,
      data: visita.data,
      horario: visita.horario,
      urlContinuar: urlFormulario
    });
  }

  function formatarData(valor) {
    if (!dataValida(valor)) throw new Error('Data inválida.');

    const dataFormatada = new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'UTC', weekday: 'long', day: 'numeric',
      month: 'long', year: 'numeric'
    }).format(new Date(`${valor}T12:00:00Z`));

    return dataFormatada.charAt(0).toUpperCase() + dataFormatada.slice(1);
  }

  function formatarHorario(valor) {
    if (!horarioValido(valor)) throw new Error('Horário inválido.');
    const [hora, minuto] = valor.split(':');
    return `${Number(hora)}h${minuto}`;
  }


  return {
    prepararEvento, prepararEspaco, prepararVisita,
    normalizarApresentacao, formatarData, formatarHorario
  };
})();
