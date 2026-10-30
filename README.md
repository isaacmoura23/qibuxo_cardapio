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

## Pendências

- Fotos, textos e kits só mudam por código (`src/data/seed.ts` + atualização do Blob).
- **Aviso fixo do topo:** hoje vem da descrição de uma *exceção de horário de hoje* cadastrada no Mesa Fácil (ex.: "Hoje fechamos às 15h"). Um campo próprio de "aviso da vitrine" no Mesa Fácil ainda não existe; quando existir (`restaurant.notice` na API), o catálogo já o usa com prioridade.
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

## Dados que vêm do Mesa Fácil

Com o Mesa Fácil ligado (`src/mesa.ts`, `api/_lib/mesa-sync.ts`), estes dados vêm do menu público dele e **são editados lá**; o catálogo mostra o mesmo valor e o servidor recalcula o pedido com ele:

| No catálogo | Vem do Mesa Fácil |
|---|---|
| Preço de produto, tamanho e adicional; "esgotado" | Cardápio |
| Horário de funcionamento | Horários (por dia; com mais de um intervalo no dia vale do primeiro ao último) |
| "Fechar a loja agora" | Pedidos pausados |
| Folgas | Exceções de horário marcadas como "fechado" |
| Taxa de entrega, entrega e retirada | Região de entrega (a primeira) e modalidades |
| WhatsApp e endereço | Contato |
| Aviso do topo | Descrição da exceção de horário de hoje (ver Pendências) |

- Mudanças aparecem em até cerca de 1 minuto (cache do Mesa Fácil + do catálogo).
- Produtos, tamanhos e adicionais são casados por **nome**. O que não casar mantém o valor do catálogo; os nomes aparecem no log da função (`mesa-sync: sem correspondência`).
- Exceções de horário com horário próprio (não "fechado") não são representadas no catálogo.
- Fotos, textos, kits, ordem e prazos de encomenda continuam sendo do catálogo.
- Se o Mesa Fácil não responder (3 s), o catálogo usa os valores que já tem e o pedido segue pelo WhatsApp.
- Para voltar a usar só os dados do catálogo, defina `MESA_SYNC=off` na Vercel.
