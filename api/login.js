/* POST /api/login  { email, senha(hash) } → usuário sem senha */
const { lerUsers, publico, corpo } = require("./_db");
module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ erro: "Método não permitido." });
  try {
    const { email = "", senha = "" } = corpo(req);
    const u = (await lerUsers()).find((x) => x.email.toLowerCase() === String(email).toLowerCase() && x.senha === senha);
    if (!u) return res.status(401).json({ erro: "E-mail ou senha inválidos." });
    res.json(publico(u));
  } catch (e) { res.status(500).json({ erro: "Erro interno." }); }
};
