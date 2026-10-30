# Qi Buxo — Catálogo digital

Catálogo mobile-first da confeitaria Qi Buxo (Vite + React + TypeScript). O cliente escolhe produtos, tamanhos, sabores e extras, monta o pedido e toca em **Enviar pedido**. O pedido vai para o **Mesa Fácil**, onde a loja administra tudo (pedidos, cozinha, caixa, preços, esgotado, horário, equipe).

- Site: https://qibuxo-catalogo.vercel.app
- **Não existe mais painel `/admin` neste projeto.** A administração é só no Mesa Fácil.

## Como funciona

- `api/` — funções da Vercel: `catalog` (leitura pública), `media` (fotos), `orders` (reserva: valida e recalcula o pedido quando o Mesa Fácil não responde; **não grava nada**).
- O catálogo (textos, fotos, kits, ordem, prazos de encomenda e configurações da loja) vem do **Vercel Blob** (`catalog.json`, último estado publicado antes da remoção do painel) ou, se não houver, de `src/data/seed.ts`. Sem painel, **o Blob não pode mais ser editado por aqui**; mudanças de texto/foto/kit exigem alteração no código e na cópia do Blob (ver "Pendências").
- Preços e "esgotado" vêm do Mesa Fácil (seção abaixo).
- Variável na Vercel: `BLOB_READ_WRITE_TOKEN`. (`ADMIN_PASSWORD` e `SESSION_SECRET` não são mais usadas.)
- Segurança: pedidos recalculados no servidor (o cliente não altera preços), limite de pedidos por IP, armazenamento privado.

## Pendências por causa da remoção do painel

- **Horário, "fechar a loja agora", taxa de entrega, formas de pagamento e aviso no topo** ficam congelados no último estado salvo. O próximo passo é ler esses dados do Mesa Fácil (que já tem horários, regiões de entrega e "aceita pedidos").
- Fotos, textos e kits só mudam por código (`src/data/seed.ts` + atualização do Blob).
- Pedidos antigos que já estavam no Blob (`orders/*`) continuam lá e não aparecem em nenhum painel; podem ser apagados.

## Rodar localmente

```bash
npm install
vercel env pull .env.local   # variáveis de desenvolvimento
vercel dev --listen 3000     # site + funções em http://localhost:3000
npm run build                # gera dist/
vercel deploy --prod --yes   # publica
```

## Pontos para confirmar

- Fotos são recortes das artes enviadas (baixa resolução); o brownie já vem cortado na arte original. Trocar pelas originais exige alteração no código.
- Descrições dos Bolos especiais foram escritas a partir das fotos.
- Bolo Fuxico (R$ 45) só aparecia na arte individual; "Xique" aparece como "Xiqui".
- Kit PP: a arte diz "5,00 de desconto no cento de salgado"; o preço R$ 175 foi mantido.
- Torta de Ninho G: fatias não aparecem na arte; assumido 20.
- Bolo de 4 andares: não está claro se os itens "já inclusos" dos de 3 andares valem para ele.
- WhatsApp: (85) 9408-4103 foi guardado como 5585994084103 (com o 9 na frente).

## Preços e disponibilidade vêm do Mesa Fácil

Com o Mesa Fácil ligado (`src/mesa.ts`), o preço de cada produto, tamanho e adicional, e o "esgotado", vêm do menu do Mesa Fácil (`api/_lib/mesa-prices.ts`). Edite preços **no Mesa Fácil**; o catálogo mostra e cobra o mesmo valor, e o servidor recalcula o pedido com ele.

- O casamento é por **nome** (produto, tamanho e adicional). O que não casar mantém o valor do catálogo; os nomes aparecem no log da função (`mesa-prices: sem correspondência`).
- Fotos, textos, kits, ordem e prazos de encomenda continuam sendo do catálogo.
- Para voltar a usar os preços do próprio catálogo, defina `MESA_PRICES=off` na Vercel.
- Se o Mesa Fácil não responder (3 s), o catálogo usa os valores que já tem e o pedido segue pelo WhatsApp.
