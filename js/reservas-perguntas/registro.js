// O registro escolhe o componente pelo tipo, nunca pelo texto ou posição da pergunta.
const csaPerguntasReserva = (() => {
  const componentes = {
    aberta: csaPerguntaAberta,
    escolha: csaPerguntaEscolha,
    anexo: csaPerguntaAnexo,
    termo: csaPerguntaTermo
  };
  function renderizar(pergunta, valor) {
    const componente = componentes[pergunta.tipo];
    if (!componente) throw new Error(`Tipo de pergunta não suportado: ${pergunta.tipo}`);
    return componente.renderizar(pergunta, valor);
  }
  return { renderizar };
})();
