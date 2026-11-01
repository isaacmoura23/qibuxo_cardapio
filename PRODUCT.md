# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Vite + React + TypeScript (user choice). Plain CSS with design tokens; no UI kit. Static output, deployable to any static host (host not yet decided).

## Users

Clientes de confeitaria local (festas de aniversário, eventos, encomendas do dia a dia, ou um bolo/doce avulso) que chegam pelo celular, quase sempre vindos do Instagram ou de um link no WhatsApp. Querem ver o que existe, quanto custa, escolher tamanho/quantidade e fechar o pedido sem ficar perguntando preço por mensagem. A dona/dono da confeitaria recebe o pedido pronto no WhatsApp.

## Product Purpose

Catálogo digital da confeitaria **Qi Buxo** que substitui as ~40 artes soltas (kits, doces, bolos, tortas, salgados, sobremesas) por um só lugar organizado, com preços e tamanhos corretos, onde o cliente monta o pedido e o envia já formatado pelo WhatsApp. Sucesso: menos perguntas de preço no WhatsApp, pedidos completos (item, tamanho, quantidade) chegando prontos.

## Positioning

Catálogo da própria Qi Buxo, com os produtos, tamanhos e preços reais dela e o confeiteiro-mascote da marca; o pedido sai direto para o WhatsApp da loja, sem cadastro nem pagamento online.

## Operating Context

- Os dados vêm de artes (flyers) enviadas pelo cliente; fonte da verdade em `catalog-data.json` e nas imagens originais.
- Preços em R$; alguns produtos têm tamanho/fatias (P, M, G, 8/12/20 fatias) e outros têm tabela por quantidade (25/50/100 unidades).
- Há itens "ver opções do dia" (cone trufado, bandeja de doces, caixa mocinha) cujo sabor é combinado pelo WhatsApp.
- Bolos confeitados (glitter, flores artificiais, topo 3D, cores metalizadas, frutas, doces) têm valor adicional; em bolos de 3 andares já vêm incluídos topo 3D, cores metalizadas, frutas e doces.
- Tortas não acompanham topo, tema, cores ou plaquinhas.

## Capabilities and Constraints

- Carrinho + envio do pedido por link `wa.me` com texto formatado (confirmado pelo usuário).
- Painel de administração do dono em /admin (confirmado pelo usuário): pedidos com status, catálogo completo, configurações da loja, conta. Backend nas funções da Vercel com Vercel Blob privado; um único usuário. Sem pagamento online.
- Confirmados pelo cliente: WhatsApp (85) 9408-4103 (guardado como 5585994084103, com o 9 na frente, a confirmar), Instagram @confeitariaqibuxo, endereço R. Maria Joaquina, Ocara - CE, 62755-000, pagamento Pix/dinheiro/cartão, horário seg a sáb 08h-18h e dom 09h-12h (do Google Maps). Tudo em `src/config.ts`.
- VALORES FICTÍCIOS, autorizados pelo cliente e a trocar pelos reais: taxa de entrega R$ 2,00, preço dos extras dos bolos confeitados, antecedência de encomenda por categoria, e as listas de sabores/recheios (doces tradicionais, salgados, cone trufado, brownie, recheio do Pinguinho).
- Checkout: nome obrigatório, endereço obrigatório só na entrega, pagamento obrigatório, data com antecedência mínima por item.
- Fotos: recortadas das artes enviadas (qualidade limitada); trocar por originais quando houver.

## Brand Commitments

Nome **Qi Buxo**. Identidade já existente nas artes: marrom-chocolate e creme/bege, letras de forma grossas desenhadas à mão, coração-contorno, e o confeiteiro-mascote (chapéu de chef, bigode, lenço vermelho, saco de confeitar, bolo com morangos) dentro de um círculo marrom com a faixa "Qi Buxo". Slogan: "Todos os nossos doces são feitos com produtos de alta qualidade, e um toque muito especial de Amor!". Nomes dos bolos têm sotaque nordestino/regional (Xodó, Xiqui, Fuxico, Paidegua, Arretado, Amostrado); o dono aparece de chapéu de cangaceiro/vaqueiro nas artes.

## Evidence on Hand

- 40 imagens de artes do catálogo (kits, doces, bolos caseirinhos e especiais, bolos por tamanho, 2/3/4 andares, tortas, tortinhas, salgados, sobremesas) em `C:\Users\isaac\AppData\Local\Temp\claude\...\images\` e dados estruturados em `src/data/catalog.ts`.
- Logo/mascote e foto do dono nas artes (aparecem recortáveis); sem arquivo vetorial do logo.
- Ausentes e que não devem ser inventados: depoimentos, área de entrega, preços reais dos extras e da taxa.

## Product Principles

1. O preço e o tamanho certos primeiro: o cliente nunca precisa perguntar quanto custa.
2. Do produto ao pedido em poucos toques no celular, com uma mão.
3. A marca fala como a Qi Buxo fala (calorosa, regional, caseira), sem virar genérico de "confeitaria chique".
4. Nada que a loja não confirmou: sem frete, prazo ou promessa inventados.

## Accessibility & Inclusion

Público amplo, muito celular de entrada e faixa etária variada: texto legível, alvos de toque grandes, contraste AA, preço sempre legível, respeitar prefers-reduced-motion. Idioma pt-BR.
