/* Camada de dados. Fonte inicial: db.json (seed). Persistência:
 *  - com Redis (Upstash via Vercel Marketplace → variáveis KV_REST_API_* ou UPSTASH_REDIS_REST_*): grava de verdade;
 *  - sem Redis: usa memória da instância (serve para ver funcionando, mas some em cold start). */
const seed = require("../db.json").users;
const URL_ = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
const KEY = "mvp:users";
let mem = null;

async function redis(cmd) {
  const r = await fetch(URL_, { method: "POST", headers: { Authorization: "Bearer " + TOKEN }, body: JSON.stringify(cmd) });
  const j = await r.json();
  if (j.error) throw new Error(j.error);
  return j.result;
}
async function lerUsers() {
  if (URL_ && TOKEN) {
    const v = await redis(["GET", KEY]);
    if (v) return JSON.parse(v);
    await gravarUsers(seed);
    return JSON.parse(JSON.stringify(seed));
  }
  return (mem = mem || JSON.parse(JSON.stringify(seed)));
}
async function gravarUsers(l) { if (URL_ && TOKEN) await redis(["SET", KEY, JSON.stringify(l)]); else mem = l; }
const publico = ({ senha, ...u }) => u;   // nunca devolve a senha
const adminOk = (req) => !!process.env.ADMIN_KEY && req.headers["x-admin-key"] === process.env.ADMIN_KEY;
const corpo = (req) => (typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {});
module.exports = { lerUsers, gravarUsers, publico, adminOk, corpo };
