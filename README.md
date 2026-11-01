# Qi Buxo — Catálogo digital + painel de administração

Catálogo mobile-first da confeitaria Qi Buxo (Vite + React + TypeScript) com painel do dono em `/admin`.
O cliente escolhe produtos, tamanhos, sabores e extras, monta o pedido e envia pelo WhatsApp. O pedido também fica registrado no painel.

- Site: https://qibuxo-catalogo.vercel.app
- Painel: https://qibuxo-catalogo.vercel.app/admin

## O painel (/admin)

Acesso só do dono, com senha. Quatro seções:

- **Pedidos:** todos os pedidos enviados pelo site, com status (novo, em preparo, pronto, entregue, cancelado), dados do cliente, itens, extras, endereço, pagamento e troco. Botão para falar com o cliente no WhatsApp, copiar o pedido e anotação interna. Atualiza sozinho a cada 30 s, com aviso e som quando chega pedido novo.
- **Catálogo:** categorias, grupos e produtos. Edite nome, descrição, foto (envio direto, a foto é reduzida sozinha), preços e opções, sabores/recheios/extras com valor adicional, kits, ordem, esgotado, oculto, duplicar e apagar. Mudanças só vão ao ar ao tocar em **Publicar**.
- **Loja:** fechar a loja agora, horário por dia, folgas e feriados, contato e endereço, retirada e entrega com taxa, formas de pagamento e aviso no topo do site.
- **Conta:** trocar a senha.

Segurança: sessão em cookie `HttpOnly`/`Secure`/`SameSite=Strict` (expira em 7 dias), trava de 15 min após 5 senhas erradas, escrita só com cabeçalho anti-CSRF, validação de tudo no servidor, pedidos recalculados no servidor (o cliente não consegue alterar preços), limite de pedidos por IP e armazenamento privado.

## Como funciona

- `api/` — funções da Vercel: `catalog` (leitura pública), `media` (fotos), `orders` (registrar pedido), `admin` (tudo do painel).
- Dados em um **Vercel Blob privado** (`qibuxo-data`, região São Paulo): `catalog.json` (catálogo + configurações), `orders/*` (pedidos), `media/*` (fotos), `auth/*`.
- `src/data/seed.ts` é só o catálogo inicial/reserva. Depois da primeira publicação, **o que vale é o que está no painel**; editar `seed.ts` não muda mais o site.
- Variáveis na Vercel: `ADMIN_PASSWORD` (senha inicial), `SESSION_SECRET`, `BLOB_READ_WRITE_TOKEN`.

## Rodar localmente

```bash
npm install
vercel env pull .env.local   # variáveis de desenvolvimento
vercel dev --listen 3000     # site + funções em http://localhost:3000 (painel em /admin)
npm run build                # gera dist/
vercel deploy --prod --yes   # publica
```

## Valores fictícios para trocar no painel

Colocados a pedido, só para funcionar. Troque pelos reais em **Loja** e **Catálogo**:

- Taxa de entrega: R$ 2,00 (Loja).
- Preço dos extras dos bolos confeitados (Catálogo → produto → Escolhas do cliente).
- Antecedência mínima de encomenda por categoria (Catálogo → categoria).
- Listas de sabores e recheios (doces tradicionais, salgados, cone trufado, brownie, recheio do Pinguinho).

## Pontos para confirmar

- Fotos são recortes das artes enviadas (baixa resolução); o brownie já vem cortado na arte original. Troque pelas originais no editor do produto.
- Descrições dos Bolos especiais foram escritas a partir das fotos.
- Bolo Fuxico (R$ 45) só aparecia na arte individual; "Xique" aparece como "Xiqui".
- Kit PP: a arte diz "5,00 de desconto no cento de salgado"; o preço R$ 175 foi mantido.
- Torta de Ninho G: fatias não aparecem na arte; assumido 20.
- Bolo de 4 andares: não está claro se os itens "já inclusos" dos de 3 andares valem para ele.
- WhatsApp: (85) 9408-4103 foi guardado como 5585994084103 (com o 9 na frente).

## Limites conhecidos

- Aviso de pedido novo (som e título da aba) só funciona com o painel aberto. Com o painel fechado, o aviso é o próprio WhatsApp.
- Um único usuário (o dono).
- Os dados ficam em arquivos JSON no Blob, o que serve bem para uma loja pequena; se o volume crescer muito, vale migrar para um banco SQL.

## Preços e disponibilidade vêm do Mesa Fácil

Com o Mesa Fácil ligado (`src/mesa.ts`), o preço de cada produto, tamanho e adicional, e o "esgotado", vêm do menu do Mesa Fácil (`api/_lib/mesa-prices.ts`). Edite preços **no Mesa Fácil**; o catálogo mostra e cobra o mesmo valor, e o servidor recalcula o pedido com ele.

- O casamento é por **nome** (produto, tamanho e adicional). O que não casar mantém o valor do catálogo; os nomes aparecem no log da função (`mesa-prices: sem correspondência`).
- Fotos, textos, kits, ordem e prazos de encomenda continuam sendo do catálogo (painel `/admin`).
- Alterar **preço** no painel `/admin` de um item que existe no Mesa Fácil não tem efeito. Para voltar ao comportamento antigo, defina `MESA_PRICES=off` na Vercel.
- Se o Mesa Fácil não responder (3 s), o catálogo usa os valores que já tem e o pedido segue pelo WhatsApp.
