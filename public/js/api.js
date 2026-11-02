/* api.js — cliente da API REST publicada na Vercel (funções em /api).
 *   GET /api/users (admin) · GET /api/users/:id · POST /api/users · PATCH /api/users/:id (admin) · POST /api/login
 * Rotas de administrador exigem o cabeçalho x-admin-key (variável ADMIN_KEY na Vercel). */
const API = (() => {
  const BASE = "/api";
  async function req(path, opt = {}, adminKey) {
    const headers = { "Content-Type": "application/json" };
    if (adminKey) headers["x-admin-key"] = adminKey;
    let r;
    try { r = await fetch(BASE + path, { ...opt, headers }); } catch { throw new Error("Sem conexão com a API."); }
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.erro || "Falha na API (" + r.status + ").");
    return j;
  }
  return {
    getUsers: (k) => req("/users", {}, k),
    getUser: (id) => req("/users/" + id),
    createUser: (u) => req("/users", { method: "POST", body: JSON.stringify(u) }),
    patchUser: (id, p, k) => req("/users/" + id, { method: "PATCH", body: JSON.stringify(p) }, k),
    login: (email, senha) => req("/login", { method: "POST", body: JSON.stringify({ email, senha }) }),
  };
})();
