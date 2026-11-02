/* GET /api/users/:id (sem senha) · PATCH /api/users/:id (admin: aprovar/rejeitar/alterar) */
const { lerUsers, gravarUsers, publico, adminOk, corpo } = require("../_db");
const EDITAVEIS = ["nome", "sobrenome", "rg", "celular", "endereco", "tipoAcesso", "dataLimiteAcesso", "grupos"];

module.exports = async (req, res) => {
  try {
    const users = await lerUsers();
    const i = users.findIndex((u) => u.id === req.query.id);
    if (i < 0) return res.status(404).json({ erro: "Usuário não encontrado." });
    if (req.method === "GET") return res.json(publico(users[i]));
    if (req.method === "PATCH") {
      if (!adminOk(req)) return res.status(403).json({ erro: "Acesso restrito ao administrador." });
      const b = corpo(req);
      EDITAVEIS.forEach((c) => { if (b[c] !== undefined) users[i][c] = b[c]; });
      users[i].atualizadoEm = new Date().toISOString();
      await gravarUsers(users);
      return res.json(publico(users[i]));
    }
    res.status(405).json({ erro: "Método não permitido." });
  } catch (e) { res.status(500).json({ erro: "Erro interno." }); }
};
