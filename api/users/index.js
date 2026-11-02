/* GET /api/users (admin) · POST /api/users (cadastro público) */
const crypto = require("crypto");
const { lerUsers, gravarUsers, publico, adminOk, corpo } = require("../_db");
const GRUPO = /^grupo\d{2}$/, PAINEL = /^painel-grupo\d{2}-[a-z]$/;

module.exports = async (req, res) => {
  try {
    if (req.method === "GET") {
      if (!adminOk(req)) return res.status(403).json({ erro: "Acesso restrito ao administrador." });
      return res.json((await lerUsers()).map(publico));
    }
    if (req.method !== "POST") return res.status(405).json({ erro: "Método não permitido." });

    const b = corpo(req);
    const obrig = ["nome", "sobrenome", "rg", "cpf", "celular", "endereco", "email", "senha"];
    if (obrig.some((c) => !b[c]) || !["administrador", "consulta"].includes(b.tipoAcesso)) return res.status(400).json({ erro: "Dados incompletos." });
    const grupos = (b.grupos || []).filter((g) => GRUPO.test(g.nome)).map((g) => ({
      nome: g.nome, status: "pendente",   // o servidor FORÇA "pendente": ninguém se auto-aprova
      paineis: (g.paineis || []).filter((p) => PAINEL.test(p.nome)).map((p) => ({ nome: p.nome, status: "pendente" })),
    }));
    if (!grupos.length) return res.status(400).json({ erro: "Selecione ao menos um grupo e painel." });

    const users = await lerUsers();
    if (users.some((u) => u.email.toLowerCase() === b.email.toLowerCase() || u.cpf === b.cpf))
      return res.status(409).json({ erro: "Já existe um cadastro com este e-mail ou CPF." });

    const agora = new Date(), lim = new Date(agora);
    lim.setFullYear(lim.getFullYear() + 1); lim.setUTCHours(23, 59, 59, 0);   // validade de 1 ano
    const novo = {
      id: crypto.randomUUID(), nome: b.nome, sobrenome: b.sobrenome, rg: b.rg, cpf: b.cpf, celular: b.celular,
      endereco: b.endereco, email: b.email.toLowerCase(), senha: b.senha, tipoAcesso: b.tipoAcesso,
      dataLimiteAcesso: lim.toISOString(), grupos, criadoEm: agora.toISOString(), atualizadoEm: agora.toISOString(),
    };
    users.push(novo); await gravarUsers(users);
    res.status(201).json(publico(novo));
  } catch (e) { res.status(500).json({ erro: "Erro interno." }); }
};
