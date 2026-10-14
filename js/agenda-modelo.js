// Configuração provisória: horário civil de Quixadá, independente do navegador.
// ISO sem offset é interpretado neste fuso; ISO com Z/offset representa um instante.
const csaAgendaModelo = (() => {
  const configuracao = Object.freeze({ fusoHorario: 'America/Fortaleza' });
  const turnos = Object.freeze([
    Object.freeze({ id: 'manha', nome: 'Manhã', inicio: 0, fim: 12 }),
    Object.freeze({ id: 'tarde', nome: 'Tarde', inicio: 12, fim: 18 }),
    Object.freeze({ id: 'noite', nome: 'Noite', inicio: 18, fim: 24 })
  ]);
  const status = Object.freeze({
    aceito: Object.freeze({ rotulo: 'Aceito', visual: 'aceito' }),
    pendente: Object.freeze({ rotulo: 'Pendente', visual: 'pendente' })
  });
  const formato = new Intl.DateTimeFormat('en-CA', {
    timeZone: configuracao.fusoHorario, year: 'numeric', month: '2-digit',
    day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23'
  });
  const copiar = valor => JSON.parse(JSON.stringify(valor));
  const texto = valor => typeof valor === 'string' && valor.trim().length > 0;
  const identificador = valor => texto(valor) || Number.isSafeInteger(valor);
  function lerDia(data) {
    if (typeof data !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(data)) return null;
    const instante = Date.parse(`${data}T00:00:00Z`);
    return Number.isFinite(instante) && new Date(instante).toISOString().slice(0, 10) === data ? instante : null;
  }
  function somarDias(data, quantidade) {
    const instante = lerDia(data);
    if (instante === null) throw new Error('Data da agenda inválida.');
    return new Date(instante + quantidade * 86400000).toISOString().slice(0, 10);
  }
  function partes(instante) {
    return Object.fromEntries(formato.formatToParts(instante).filter(p => p.type !== 'literal').map(p => [p.type, p.value]));
  }
  function localParaInstante(data, hora, minuto = 0, segundo = 0) {
    const dia = lerDia(data);
    if (dia === null) throw new Error('Data da agenda inválida.');
    const alvo = dia + (hora * 3600 + minuto * 60 + segundo) * 1000;
    let instante = alvo;
    for (let i = 0; i < 4; i++) {
      const p = partes(instante);
      const representado = Date.parse(`${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}Z`);
      const ajuste = alvo - representado;
      instante += ajuste;
      if (!ajuste) return instante;
    }
    return NaN; // Horário civil inexistente em uma eventual transição de fuso.
  }
  function lerInstante(valor) {
    if (typeof valor !== 'string') return NaN;
    const m = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})(?::(\d{2})(\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})?$/.exec(valor);
    if (!m || lerDia(m[1]) === null || +m[2] > 23 || +m[3] > 59 || +(m[4] || 0) > 59) return NaN;
    if (m[6]) {
      if (m[6] !== 'Z' && (+m[6].slice(1, 3) > 14 || +m[6].slice(4) > 59 || (+m[6].slice(1, 3) === 14 && +m[6].slice(4) !== 0))) return NaN;
      return Date.parse(`${m[1]}T${m[2]}:${m[3]}:${m[4] || '00'}${m[5] || ''}${m[6]}`);
    }
    return localParaInstante(m[1], +m[2], +m[3], +(m[4] || 0)) + Math.round(Number(m[5] || 0) * 1000);
  }
  function horario(instante) {
    const p = partes(instante);
    return `${p.hour}:${p.minute}`;
  }
  function intervalo(data, turno) {
    return { inicio: localParaInstante(data, turno.inicio), fim: turno.fim === 24 ? localParaInstante(somarDias(data, 1), 0) : localParaInstante(data, turno.fim) };
  }
  function definirStatus(valor) {
    return Object.hasOwn(status, valor) ? status[valor] : { rotulo: 'Status desconhecido', visual: 'desconhecido' };
  }
  function normalizarEvento(evento, espacos) {
    if (!evento || !identificador(evento.id) || !identificador(evento.espacoId) || !texto(evento.nome) || !texto(evento.status)) return null;
    const espacoId = String(evento.espacoId);
    if (!espacos.some(e => e.id === espacoId)) return null;
    const inicioMs = lerInstante(evento.inicio);
    const terminoMs = lerInstante(evento.termino);
    if (!Number.isFinite(inicioMs) || !Number.isFinite(terminoMs) || terminoMs <= inicioMs) return null;
    return {
      id: String(evento.id), nome: evento.nome.trim(), espacoId,
      inicio: new Date(inicioMs).toISOString(), termino: new Date(terminoMs).toISOString(),
      status: evento.status.trim(), inicioMs, terminoMs,
      horarioInicio: horario(inicioMs), horarioTermino: horario(terminoMs)
    };
  }
  function normalizarDados(resposta) {
    if (!resposta || !Array.isArray(resposta.eventos) || !Array.isArray(resposta.espacos) || !Array.isArray(resposta.disponibilidade)) throw new Error('Resposta de dados da agenda inválida.');
    const avisos = [];
    const espacos = [];
    for (const e of resposta.espacos) {
      if (!e || !identificador(e.id) || !texto(e.nome) || !texto(e.visual) || !/^[a-z][a-z0-9-]*$/.test(e.visual) || espacos.some(s => s.id === String(e.id))) {
        avisos.push('Espaço inválido ou duplicado.');
        continue;
      }
      espacos.push({ id: String(e.id), nome: e.nome.trim(), visual: e.visual });
    }
    const eventos = [];
    for (const registro of resposta.eventos) {
      const evento = normalizarEvento(registro, espacos);
      if (!evento || eventos.some(e => e.id === evento.id)) avisos.push('Evento inválido ou duplicado.');
      else eventos.push(evento);
    }
    const grupos = new Map();
    for (const d of resposta.disponibilidade) {
      if (!d || lerDia(d.data) === null || !turnos.some(t => t.id === d.turno) || !Array.isArray(d.espacoIds)) {
        avisos.push('Disponibilidade inválida.');
        continue;
      }
      const ids = [...new Set(d.espacoIds.map(String))];
      const situacao = d.situacao || (ids.length ? 'disponivel' : 'indisponivel');
      if (!['disponivel', 'indisponivel', 'nao_informada'].includes(situacao) || ids.some(id => !espacos.some(e => e.id === id)) || (situacao === 'disponivel') !== (ids.length > 0)) {
        avisos.push('Disponibilidade inconsistente.');
        continue;
      }
      const chave = `${d.data}/${d.turno}`;
      if (!grupos.has(chave)) grupos.set(chave, { data: d.data, turno: d.turno, espacoIds: [], situacoes: new Set() });
      const grupo = grupos.get(chave);
      grupo.situacoes.add(situacao);
      grupo.espacoIds = [...new Set([...grupo.espacoIds, ...ids])];
    }
    const disponibilidade = [...grupos.values()].map(g => {
      const conflitante = g.situacoes.size > 1;
      if (conflitante) avisos.push('Registros de disponibilidade conflitantes.');
      return { data: g.data, turno: g.turno, espacoIds: conflitante ? [] : g.espacoIds, situacao: conflitante ? 'nao_informada' : [...g.situacoes][0] };
    });
    return { espacos, eventos, disponibilidade, turnos: copiar(turnos), avisos };
  }
  function formatarDia(data) {
    return new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC', day: 'numeric', month: 'long', year: 'numeric' }).format(lerDia(data));
  }
  return { configuracao, turnos, status, copiar, lerDia, somarDias, lerInstante, intervalo, definirStatus, normalizarEvento, normalizarDados, formatarDia };
})();
