// O #csa-agenda nunca é recriado, só o conteúdo dele. Por isso o listener
// fica nele e continua funcionando depois de cada redesenho.
document.getElementById("csa-agenda").addEventListener("click", (e) => {
  const titulo = e.target.closest(".csa-grid--diaria tbody th");
  if (!titulo) return;
  titulo.parentElement.classList.toggle("csa-turno--fechado");
});
