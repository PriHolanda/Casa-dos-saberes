
// Regras puras para preparação dos dados de eventos e visitas.
//
// Não acessa DOM, API ou armazenamento do navegador.
// A apresentação recebe uma estrutura normalizada,
// independentemente da origem dos dados.

const csaDetalhesModelo = (() => {
  function texto(valor) {
    return typeof valor === 'string' ? valor.trim() : '';
  }

  function dataValida(valor) {
    return Boolean(texto(valor)) &&
      csaAgendaModelo.lerDia(valor) !== null;
  }

  function horarioValido(valor) {
    if (!/^\d{2}:\d{2}$/.test(valor)) return false;

    const [horas, minutos] = valor.split(':').map(Number);

    return horas < 24 && minutos < 60;
  }

  function regrasValidas(lista) {
    if (!Array.isArray(lista)) return [];

    return lista
      .filter(item => typeof item === 'string' && item.trim())
      .map(item => item.trim());
  }

  // Normaliza as informações utilizadas pelas duas páginas.
  // Campos opcionais são representados por strings vazias
  // ou listas vazias quando não possuem conteúdo.
  function normalizarApresentacao(entrada) {
    if (
      !entrada ||
      typeof entrada !== 'object' ||
      Array.isArray(entrada) ||
      !texto(entrada.titulo)
    ) {
      throw new Error(
        'Dados de apresentação inválidos: título obrigatório.'
      );
    }

    if (entrada.data && !dataValida(entrada.data)) {
      throw new Error('Data de apresentação inválida.');
    }

    if (entrada.horario && !horarioValido(entrada.horario)) {
      throw new Error('Horário de apresentação inválido.');
    }

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
      orientacoes: texto(entrada.orientacoes),
      regras: regrasValidas(entrada.regras)
    };
  }

  // Prepara os dados de um evento cadastrado e confirmado.
  // O modelo da agenda valida os horários e a relação
  // entre o evento e o espaço correspondente.
  function prepararEvento(evento, espaco) {
    if (
      !evento ||
      !espaco ||
      typeof espaco.nome !== 'string'
    ) {
      throw new Error('Evento ou espaço inválido.');
    }

    const normalizado = csaAgendaModelo.normalizarEvento(
      evento,
      [espaco]
    );

    if (!normalizado) {
      throw new Error('Evento inválido.');
    }

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
    });
  }

  // Prepara os dados de uma visita mediada.
  // Utiliza as informações específicas da visita e,
  // quando necessário, as informações do espaço relacionado.
  function prepararVisita(visita, espaco) {
    if (!espaco || !texto(espaco.nome)) {
      throw new Error('Espaço da visita inválido.');
    }

    if (
      !visita ||
      typeof visita !== 'object' ||
      Array.isArray(visita)
    ) {
      throw new Error('Informações da visita inválidas.');
    }

    return normalizarApresentacao({
      modalidade: 'visita',
      categoria: texto(visita.categoria) || 'Visita mediada',
      titulo: texto(visita.titulo) || 'Visita mediada',
      espaco: espaco.nome,
      descricao: visita.descricao || espaco.descricao,
      descricaoTitulo:
        visita.descricaoTitulo || 'Sobre a visita',
      classificacao: visita.classificacao,
      orientacoes:
        visita.orientacoes || espaco.orientacoes,
      regras: visita.regras || espaco.regras,
      data: visita.data,
      horario: visita.horario
    });
  }

  // Formata a data para o padrão brasileiro com
  // inicial maiúscula no dia da semana.
  function formatarData(valor) {
    if (!dataValida(valor)) {
      throw new Error('Data inválida.');
    }

    const dataFormatada = new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'UTC',
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(new Date(`${valor}T12:00:00Z`));

    return dataFormatada.charAt(0).toUpperCase() +
      dataFormatada.slice(1);
  }

  function formatarHorario(valor) {
    if (!horarioValido(valor)) {
      throw new Error('Horário inválido.');
    }

    const [hora, minuto] = valor.split(':');

    return `${Number(hora)}h${minuto}`;
  }

  return {
    prepararEvento,
    prepararVisita,
    normalizarApresentacao,
    formatarData,
    formatarHorario
  };
})();
