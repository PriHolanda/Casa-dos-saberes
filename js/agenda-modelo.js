// Datas civis da API: YYYY-MM-DDTHH:mm[:ss], sem Z ou offset.
// UTC é usado apenas como calendário para evitar depender do fuso do navegador.
const csaAgendaModelo = (() => {
  const espacos = [
    { id: '1', nome: 'Auditório', visual: 'auditorio' },
    { id: '2', nome: 'Quintal', visual: 'quintal' },
    { id: '3', nome: 'Salas Expositivas', visual: 'salas' },
    { id: '4', nome: 'Varanda', visual: 'varanda' },
    { id: '5', nome: 'Área Externa', visual: 'externa' }
  ];
  const formatoCivil = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'America/Fortaleza', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23'
  });

  function dataCivil(valor) {
    if (typeof valor !== 'string') return '';
    if (!/(Z|[+-]\d\d:\d\d)$/.test(valor)) return valor.slice(0, 19);
    const data = new Date(valor);
    return Number.isFinite(data.getTime()) ? formatoCivil.format(data).replace(' ', 'T') : '';
  }
  const status = {
    aceito: { rotulo: 'Aceito', visual: 'aceito' },
    pendente: { rotulo: 'Pendente', visual: 'pendente' },
    negado: { rotulo: 'Negado', visual: 'negado' },
    cancelado: { rotulo: 'Cancelado', visual: 'cancelado' }
  };
  function lerDia(data) {
    if (typeof data !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(data)) return null;
    const valor = Date.parse(`${data}T00:00:00Z`);
    return Number.isFinite(valor) && new Date(valor).toISOString().slice(0, 10) === data ? valor : null;
  }
  function somarDias(data, quantidade) {
    const dia = lerDia(data);
    if (dia === null) throw new Error('Data da agenda inválida.');
    return new Date(dia + quantidade * 86400000).toISOString().slice(0, 10);
  }
  function lerDataHora(valor) {
    if (typeof valor !== 'string') return NaN;
    const partes = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(valor);
    if (!partes || lerDia(partes[1]) === null || +partes[2] > 23 || +partes[3] > 59 || +(partes[4] || 0) > 59) return NaN;
    return Date.parse(`${valor.length === 16 ? valor + ':00' : valor}Z`);
  }
  function intervalo(data, turno) {
    const inicio = lerDia(data);
    return { inicio: inicio + turno.inicio * 3600000, fim: inicio + turno.fim * 3600000 };
  }
  function definirStatus(valor) {
    return Object.hasOwn(status, valor) ? status[valor] : { rotulo: 'Status desconhecido', visual: 'desconhecido' };
  }
  function normalizarEvento(evento, espacos) {
    const temId = valor => (typeof valor === 'string' && valor.trim()) || Number.isSafeInteger(valor);
    if (!evento || !temId(evento.id) || !temId(evento.espacoId) || typeof evento.nome !== 'string' || !evento.nome.trim() || typeof evento.status !== 'string' || !evento.status.trim()) return null;
    if (!espacos.some(e => e.id === String(evento.espacoId))) return null;
    const inicioMs = lerDataHora(evento.inicio);
    const terminoMs = lerDataHora(evento.termino);
    if (!Number.isFinite(inicioMs) || !Number.isFinite(terminoMs) || terminoMs <= inicioMs) return null;
    return {
      id: String(evento.id), nome: evento.nome.trim(), espacoId: String(evento.espacoId),
      inicio: evento.inicio, termino: evento.termino, status: evento.status.trim(),
      solicitante: typeof evento.solicitante === 'string' ? evento.solicitante.trim() : '',
      celular: typeof evento.celular === 'string' ? evento.celular.trim() : '',
      publico: typeof evento.publico === 'string' ? evento.publico.trim() : '',
      classificacao: typeof evento.classificacao === 'string' ? evento.classificacao.trim() : '',
      descricao: typeof evento.descricao === 'string' ? evento.descricao.trim() : '',
      inicioMs, terminoMs, horarioInicio: evento.inicio.slice(11, 16), horarioTermino: evento.termino.slice(11, 16)
    };
  }
  function formatarDia(data) {
    return new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC', day: 'numeric', month: 'long', year: 'numeric' }).format(lerDia(data));
  }
  return { espacos, dataCivil, lerDia, lerDataHora, somarDias, intervalo, definirStatus, normalizarEvento, formatarDia };
})();
