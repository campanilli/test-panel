# MVP Login + Cadastro — API na Vercel

## Estrutura
- public/  → site estático (index.html, painéis, css/, js/)
- api/     → funções serverless: /api/login, /api/users, /api/users/:id
- db.json  → seed dos usuários (fica FORA de public, não é baixável)
- vercel.json → publica apenas public/ como site

## Deploy (GitHub + Vercel)
1. Suba esta pasta na raiz do repositório e importe na Vercel (Framework: Other; deixe Build/Output em branco, o vercel.json já define).
2. Settings → Environment Variables: crie ADMIN_KEY com uma chave longa (necessária para listar/aprovar usuários).
3. Para os cadastros PERSISTIREM: aba Storage → Marketplace → Upstash Redis → conectar ao projeto
   (as variáveis KV_REST_API_URL/TOKEN são criadas sozinhas) → Redeploy.
   Sem Redis a API funciona, mas guarda em memória e perde tudo em cold start.
4. No primeiro acesso com Redis, ele é populado com o db.json. Para repopular, apague a chave mvp:users.

## Local
    npx vercel dev      # serve public/ e api/ juntos

## Usuários de teste (senha: Senha@123)
maria.souza@gmail.com (1 painel → redireciona) · joao.silva@gmail.com (pendente) · carlos.lima@gmail.com (admin, 3 painéis)

## Aprovar um usuário (admin, via curl)
    curl https://SEU-APP.vercel.app/api/users -H "x-admin-key: SUA_CHAVE"        # lista (pegue o id)
    curl -X PATCH https://SEU-APP.vercel.app/api/users/ID -H "x-admin-key: SUA_CHAVE" \
      -H "Content-Type: application/json" \
      -d '{"grupos":[{"nome":"grupo01","status":"aprovado","paineis":[{"nome":"painel-grupo01-a","status":"aprovado"}]}]}'

## Segurança (MVP)
- A API nunca devolve a senha; status "pendente", id e data limite são forçados no servidor.
- Senha ainda é btoa (reversível): trocar por bcrypt/argon2 no servidor e sessão por JWT/cookie httpOnly.
- Os HTMLs dos painéis são públicos; só o conteúdo carregado via API deve ser protegido de verdade.
- Use apenas dados fictícios nesta fase.

## Próximos passos
Área administrativa (usa GET/PATCH com x-admin-key → trocar por login de admin com JWT), Google OAuth real, rate limit no /api/login.
