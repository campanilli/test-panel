/* auth.js — autenticação, cadastro e regras de acesso (grupos + painéis + status + data limite). */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

/* Catálogo: cada grupo pode ter vários painéis. Para novos painéis, basta acrescentar aqui. */
const CATALOGO = {
  grupo01: ["painel-grupo01-a", "painel-grupo01-b"],
  grupo02: ["painel-grupo02-a"],
  grupo03: ["painel-grupo03-a"],
  grupo04: ["painel-grupo04-a"],
};
const SESSION_KEY = "mvp_session";
/* MVP: btoa NÃO é segurança de verdade. Em produção use hash no servidor (bcrypt/argon2). */
const hash = (s) => btoa(unescape(encodeURIComponent(s)));

const Auth = {
  expirado: (u) => new Date(u.dataLimiteAcesso) < new Date(),
  /* REGRA CENTRAL: painel liberado = data limite válida + grupo "aprovado" + painel "aprovado".
     Qualquer status "pendente" ou "rejeitado" (no grupo ou no painel) bloqueia. */
  paineisLiberados(u) {
    if (this.expirado(u)) return [];
    return u.grupos.filter((g) => g.status === "aprovado")
      .flatMap((g) => g.paineis.filter((p) => p.status === "aprovado").map((p) => p.nome));
  },
  getSession() { try { return JSON.parse(sessionStorage.getItem(SESSION_KEY)); } catch { return null; } },
  setSession(u) { sessionStorage.setItem(SESSION_KEY, JSON.stringify({ id: u.id, nome: u.nome, email: u.email })); },
  logout() { sessionStorage.removeItem(SESSION_KEY); location.href = "index.html"; },
  /* Chamado pelos painéis: sem sessão, sem aprovação ou com data vencida → volta ao index. */
  async guard(painel) {
    const s = this.getSession();
    if (!s) return location.replace("index.html");
    try {
      const u = await API.getUser(s.id);   // revalida na API a cada abertura de painel
      if (!u || !this.paineisLiberados(u).includes(painel)) return location.replace("index.html");
      document.body.hidden = false;
      return u;
    } catch { location.replace("index.html"); }
  },
};

/* ---------- Validações ---------- */
function cpfValido(v) {
  const c = v.replace(/\D/g, "");
  if (c.length !== 11 || /^(\d)\1+$/.test(c)) return false;
  const dig = (n) => { let s = 0; for (let i = 0; i < n; i++) s += +c[i] * (n + 1 - i); s = (s * 10) % 11; return s === 10 ? 0 : s; };
  return dig(9) === +c[9] && dig(10) === +c[10];
}
const celularValido = (v) => /^\(\d{2}\) 9\d{4}-\d{4}$/.test(v);   // celular BR: DDD + 9 + 8 dígitos
const emailValido = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
const senhaForte = (v) => v.length >= 8 && /[A-Za-z]/.test(v) && /\d/.test(v);

/* ---------- Máscaras ---------- */
const mascCPF = (v) => v.replace(/\D/g, "").slice(0, 11).replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2");
const mascCel = (v) => v.replace(/\D/g, "").slice(0, 11).replace(/^(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d{1,4})$/, "$1-$2");
const mascRG = (v) => v.toUpperCase().replace(/[^0-9X.\-]/g, "").slice(0, 14);

/* ---------- UI helpers ---------- */
function showAlert(msg, tipo = "erro") { const a = $("#alert"); a.textContent = msg; a.className = "alert " + tipo; a.hidden = false; }
const hideAlert = () => { $("#alert").hidden = true; };
function setErr(el, msg) {
  const w = el.closest(".field"); let s = w.querySelector(".err");
  if (!s) { s = document.createElement("small"); s.className = "err"; w.appendChild(s); }
  s.textContent = msg || ""; w.classList.toggle("invalid", !!msg);
}
function loading(btn, on) { btn.disabled = on; btn.classList.toggle("loading", on); }
function trocar(v) { $$(".view").forEach((s) => s.classList.toggle("active", s.id === "view-" + v)); hideAlert(); scrollTo(0, 0); }

/* ---------- Pós-login: decide para onde o usuário vai ---------- */
function resolver(u, forcarLista = false) {
  if (Auth.expirado(u)) return resultado("Seu acesso expirou", "Peça ao administrador para renovar a data limite do seu acesso.", []);
  const lib = Auth.paineisLiberados(u);
  if (!lib.length) {
    // Mostra as solicitações (pendentes/rejeitadas) para o usuário acompanhar.
    const todos = u.grupos.flatMap((g) => g.paineis.map((p) => ({ nome: p.nome, status: g.status === "aprovado" ? p.status : (g.status === "rejeitado" ? "rejeitado" : "pendente") })));
    return resultado("Seu cadastro está em análise", "Você poderá acessar os painéis quando o administrador aprovar a solicitação.", todos);
  }
  if (lib.length === 1 && !forcarLista) return void (location.href = lib[0] + ".html");   // 1 painel → redireciona
  resultado("Olá, " + u.nome, "Escolha o painel que deseja abrir:", lib.map((n) => ({ nome: n, status: "aprovado", link: n + ".html" })));
}
function resultado(titulo, msg, itens) {
  $("#res-titulo").textContent = titulo; $("#res-msg").textContent = msg;
  $("#res-lista").innerHTML = itens.map((i) => i.link
    ? `<li><a href="${i.link}">${i.nome}<span class="badge aprovado">aprovado</span></a></li>`
    : `<li class="item">${i.nome}<span class="badge ${i.status}">${i.status}</span></li>`).join("");
  trocar("resultado");
}

/* ---------- Página de login/cadastro ---------- */
function initPagina() {
  // Alternância Login <-> Cadastro (sem recarregar)
  $$("[data-goto]").forEach((b) => b.addEventListener("click", () => trocar(b.dataset.goto)));
  $("#btn-sair").onclick = () => Auth.logout();

  // Máscaras
  $("#cad-cpf").oninput = (e) => (e.target.value = mascCPF(e.target.value));
  $("#cad-celular").oninput = (e) => (e.target.value = mascCel(e.target.value));
  $("#cad-rg").oninput = (e) => (e.target.value = mascRG(e.target.value));

  // Grupos e painéis dinâmicos: ao marcar um grupo, aparecem os painéis dele.
  $("#grupos-box").innerHTML = Object.keys(CATALOGO).map((g) => `<label class="opt"><input type="checkbox" name="grupo" value="${g}"> ${g}</label>`).join("");
  const marcados = new Set();                                  // lembra painéis marcados ao alternar grupos
  function renderPaineis() {
    $$("input[name=painel]").forEach((p) => (p.checked ? marcados.add(p.value) : marcados.delete(p.value)));
    const gs = $$("input[name=grupo]:checked").map((g) => g.value);
    $("#paineis-box").innerHTML = gs.length ? `<fieldset class="field" id="fs-paineis"><legend>Painéis desejados</legend>` +
      gs.map((g) => `<div class="painel-grupo"><strong>${g}</strong>` + CATALOGO[g].map((p) =>
        `<label class="opt"><input type="checkbox" name="painel" data-grupo="${g}" value="${p}" ${marcados.has(p) ? "checked" : ""}> ${p}</label>`).join("") + `</div>`).join("") + `</fieldset>` : "";
  }
  $("#grupos-box").addEventListener("change", renderPaineis);

  // Login por e-mail + senha
  $("#form-login").addEventListener("submit", async (e) => {
    e.preventDefault(); hideAlert();
    const email = $("#login-email").value.trim(), senha = $("#login-senha").value, btn = e.submitter;
    if (!emailValido(email) || !senha) return showAlert("Informe um e-mail válido e a senha.");
    loading(btn, true);
    try { const u = await API.login(email, hash(senha)); Auth.setSession(u); resolver(u); }
    catch (err) { showAlert(err.message); }
    finally { loading(btn, false); }
  });

  // "Entrar com Google" — SIMULADO. Só facilita a identificação; não dispensa o cadastro completo.
  async function google(modo) {
    const email = (prompt("Simulação do login Google. Informe seu Gmail:") || "").trim().toLowerCase();
    if (!email) return;
    if (!/^[^\s@]+@gmail\.com$/.test(email)) return showAlert("Informe um endereço @gmail.com válido.");
    if (modo === "login") {   // sem OAuth real, a senha continua necessária (evita login só com e-mail)
      $("#login-email").value = email; $("#login-senha").focus();
      return showAlert("E-mail preenchido. Informe a senha para entrar (OAuth real do Google fica para a próxima etapa).", "info");
    }
    const campo = $("#cad-email"); campo.value = email; campo.readOnly = true;
  }
  $("#btn-google-login").onclick = () => google("login");
  $("#btn-google-cad").onclick = () => google("cadastro");

  // Cadastro
  $("#form-cadastro").addEventListener("submit", async (e) => {
    e.preventDefault(); hideAlert();
    const v = (id) => $(id).value.trim(); let ok = true;
    const chk = (el, cond, msg) => { setErr(el, cond ? "" : msg); if (!cond) ok = false; };
    chk($("#cad-nome"), v("#cad-nome").length >= 2, "Informe o nome.");
    chk($("#cad-sobrenome"), v("#cad-sobrenome").length >= 2, "Informe o sobrenome.");
    chk($("#cad-rg"), v("#cad-rg").length >= 5, "Informe o RG.");
    chk($("#cad-cpf"), cpfValido(v("#cad-cpf")), "CPF inválido.");
    chk($("#cad-celular"), celularValido(v("#cad-celular")), "Use o formato (11) 98765-4321.");
    chk($("#cad-endereco"), v("#cad-endereco").length >= 10, "Informe o endereço completo.");
    chk($("#cad-email"), emailValido(v("#cad-email")), "E-mail inválido.");
    chk($("#cad-senha"), senhaForte($("#cad-senha").value), "Mínimo de 8 caracteres, com letras e números.");
    chk($("#cad-senha2"), $("#cad-senha2").value === $("#cad-senha").value, "As senhas não conferem.");
    const tipo = $("input[name=tipoAcesso]:checked");
    chk($("#fs-tipo"), !!tipo, "Escolha o tipo de acesso.");
    const gs = $$("input[name=grupo]:checked").map((g) => g.value);
    chk($("#fs-grupos"), gs.length > 0, "Selecione ao menos um grupo.");
    // cada grupo marcado precisa de pelo menos um painel
    const semPainel = gs.filter((g) => !$$(`input[name=painel][data-grupo="${g}"]:checked`).length);
    if (gs.length) chk($("#fs-paineis"), !semPainel.length, "Escolha ao menos um painel em: " + semPainel.join(", ") + ".");
    if (!ok) return showAlert("Corrija os campos destacados.");

    const btn = e.submitter; loading(btn, true);
    try {
      const cpf = v("#cad-cpf"), email = v("#cad-email").toLowerCase();
      // duplicidade de e-mail/CPF, status "pendente", id e data limite são conferidos/forçados no servidor (api/users)
      const agora = new Date(), limite = new Date(agora);
      limite.setFullYear(limite.getFullYear() + 1); limite.setUTCHours(23, 59, 59, 0);   // validade: 1 ano
      const novo = {
        id: crypto.randomUUID(), nome: v("#cad-nome"), sobrenome: v("#cad-sobrenome"), rg: v("#cad-rg"), cpf,
        celular: v("#cad-celular"), endereco: v("#cad-endereco"), email, senha: hash($("#cad-senha").value),
        tipoAcesso: tipo.value, dataLimiteAcesso: limite.toISOString(),
        // Tudo nasce "pendente": o admin aprova/rejeita grupos e painéis depois (PATCH /users/:id).
        grupos: gs.map((g) => ({ nome: g, status: "pendente",
          paineis: $$(`input[name=painel][data-grupo="${g}"]:checked`).map((p) => ({ nome: p.value, status: "pendente" })) })),
        criadoEm: agora.toISOString(), atualizadoEm: agora.toISOString(),
      };
      await API.createUser(novo);
      e.target.reset(); $("#cad-email").readOnly = false; marcados.clear(); renderPaineis();
      $("#login-email").value = email; trocar("login");
      showAlert("Cadastro enviado! Seus acessos estão pendentes de aprovação.", "ok");
    } catch (err) { showAlert(err.message); }
    finally { loading(btn, false); }
  });

  // Sessão existente (ex.: voltou de um painel): retoma o fluxo.
  const s = Auth.getSession();
  if (s) API.getUser(s.id).then((u) => resolver(u, location.hash === "#paineis")).catch(() => {});
}
if ($("#view-login")) initPagina();
