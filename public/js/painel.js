/* painel.js — proteção comum a todos os painéis (o nome vem de <body data-painel="...">). */
(async () => {
  const u = await Auth.guard(document.body.dataset.painel);
  if (!u) return;
  $("#usuario").textContent = u.nome + " " + u.sobrenome + " (" + u.tipoAcesso + ")";
  $("#sair").onclick = () => Auth.logout();
})();
