---
name: Qi Buxo Catálogo
description: The shop's flyer set turned into one working order screen, chocolate and cream with strawberry red only for prices and the add action.
colors:
  cacau: "#47301c"
  cacau-2: "#5e3f25"
  cacau-3: "#7a5634"
  creme: "#fbefe4"
  paper: "#fff8f1"
  leite: "#f6e6d6"
  bege: "#ead7c1"
  linha: "#d8c0a4"
  ink: "#3a2413"
  ink-2: "#6a4b33"
  on-cacau-2: "#e6cfb6"
  morango: "#b5302a"
  morango-2: "#8f221e"
typography:
  display:
    fontFamily: "Londrina Solid, Arial Narrow, sans-serif"
    fontSize: "clamp(3.2rem, 13vw, 6rem)"
    fontWeight: 900
    lineHeight: 0.95
    letterSpacing: "0.01em"
  headline:
    fontFamily: "Londrina Solid, Arial Narrow, sans-serif"
    fontSize: "clamp(2.6rem, 10vw, 4.2rem)"
    fontWeight: 900
    lineHeight: 0.95
  title:
    fontFamily: "Nunito Variable, system-ui, sans-serif"
    fontSize: "1.12rem"
    fontWeight: 800
    lineHeight: 1.2
  body:
    fontFamily: "Nunito Variable, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Nunito Variable, system-ui, sans-serif"
    fontSize: "0.85rem"
    fontWeight: 700
    lineHeight: 1.5
  price:
    fontFamily: "Londrina Solid, Arial Narrow, sans-serif"
    fontSize: "2rem"
    fontWeight: 900
    lineHeight: 1
rounded:
  sm: "12px"
  md: "14px"
  lg: "20px"
  xl: "24px"
  sheet: "26px"
  band: "28px"
  pill: "999px"
spacing:
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "24px"
  xl: "40px"
components:
  button-add:
    backgroundColor: "{colors.morango}"
    textColor: "{colors.creme}"
    rounded: "{rounded.pill}"
    padding: "0 18px 0 12px"
    height: "46px"
  button-add-hover:
    backgroundColor: "{colors.morango-2}"
  button-cart:
    backgroundColor: "{colors.cacau}"
    textColor: "{colors.creme}"
    rounded: "{rounded.pill}"
    padding: "0 16px"
    height: "44px"
  button-send:
    backgroundColor: "{colors.morango}"
    textColor: "{colors.creme}"
    rounded: "{rounded.md}"
    height: "52px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.cacau}"
    rounded: "{rounded.md}"
    height: "52px"
  tab:
    backgroundColor: "transparent"
    textColor: "{colors.cacau}"
    rounded: "{rounded.pill}"
    padding: "0 16px"
    height: "44px"
  tab-on:
    backgroundColor: "{colors.cacau}"
    textColor: "{colors.creme}"
  chip-size:
    backgroundColor: "{colors.creme}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "8px 12px"
    height: "62px"
  chip-size-on:
    backgroundColor: "{colors.cacau}"
    textColor: "{colors.creme}"
  card-product:
    backgroundColor: "{colors.paper}"
    rounded: "{rounded.lg}"
    padding: "12px"
  card-kit:
    backgroundColor: "{colors.cacau}"
    textColor: "{colors.creme}"
    rounded: "{rounded.xl}"
    padding: "20px"
  notice:
    backgroundColor: "{colors.leite}"
    textColor: "{colors.ink-2}"
    rounded: "18px"
    padding: "16px 18px"
  field:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    height: "48px"
---

# Design System: Qi Buxo Catálogo

## Overview

**Creative North Star: "The Flyer Turned Order Screen"**

The catalogue is the shop's own flyer set made operable. The world is pinned by the client's artwork, not invented: chocolate-brown fields against warm cream, hand-cut heavy lettering with a pale outline, a heart as the only ornament, and the dashed "Informações" panel of the flyers. Warm, homely, regional; the opposite of the pastel-serif patisserie page and of the anonymous delivery-app grid.

The structure is a standard e-commerce shell (sticky header, scrollspy category chips, sectioned grid, bottom-sheet cart that becomes a side drawer from 720px). The world enters through palette, lettering, kit blocks and the dashed notice, not through layout novelty. Every size and price is visible without a tap; density is moderate and thumb-first.

Without content the page is still recognizable by the brown/cream split, the outlined lettering and the mascot badge on a cream tile.

**Key Characteristics:**
- Brown (cacau) and cream (creme) carry all structure; strawberry red (morango) is rationed to prices, the add action, the cart count badge, hearts, errors and focus.
- Londrina Solid caps for titles, prices and totals; Nunito for everything read.
- Pill controls for actions and filters, softly rounded cards (20-24px), large touch targets (44px minimum).
- Flat, warm-tinted depth: low diffuse brown shadows, no hard offsets.
- Heart is the only ornament; faint outline heart watermark inside the chocolate intro band.

## Colors

Chocolate, cream and one strawberry accent, all warm-tinted; no cool neutrals, no pure black or white.

### Primary
- **Cacau Chocolate** (#47301c): structural brown. Intro band, kit blocks, footer, cart bar, selected chip and tab, cart pill, headings on cream. Hover step Cacau Médio (#5e3f25); mid brown (#7a5634) for the notice dashed border and scrollbar.

### Secondary
- **Morango Strawberry** (#b5302a): the mascot's scarf. Prices, add pills, send-to-WhatsApp button, count badges, link-buttons, hearts, error borders and the focus ring. Hover/pressed Morango Escuro (#8f221e).

### Neutral
- **Creme** (#fbefe4): page ground, top bar, tab strip, cart sheet, text on chocolate.
- **Paper** (#fff8f1): product cards, ladder cards, form fields, sheet footer; one step lighter than the page.
- **Leite** (#f6e6d6): notice box, hover wash, icon-button ground, art tile.
- **Bege** (#ead7c1): lettering outline on cream, badges, photo placeholders.
- **Linha** (#d8c0a4): all hairlines and idle borders.
- **Tinta** (#3a2413) body text; **Tinta Suave** (#6a4b33) secondary text; **Creme Sombreado** (#e6cfb6) secondary text on chocolate.

### Named Rules
**The Strawberry Reserve Rule.** Red marks money and the commit action. If an element is neither a price, an add/send control, a count, a heart or an error, it is brown or cream.

**The Warm Neutrals Rule.** Every neutral is a brown or cream tint; shadows are tinted with the brown (rgb 40-71 / 24-48 / 10-28), never neutral gray.

## Typography

**Display Font:** Londrina Solid 900 (Arial Narrow fallback), self-hosted via @fontsource
**Body Font:** Nunito Variable (system-ui fallback), self-hosted via @fontsource

**Character:** Londrina is the hand-cut flyer lettering: heavy, uppercase, tight. Nunito is round and friendly and stays legible at phone sizes for a wide age range.

### Hierarchy
- **Display** (900, clamp(3.2rem, 13vw, 6rem), 0.95): the "CATÁLOGO" title in the intro band, creme fill with a dark-brown 8px outline (paint-order stroke).
- **Headline** (900, clamp(2.6rem, 10vw, 4.2rem), 0.95): category titles in cacau with a 7px bege outline.
- **Group title** (900, 1.8rem, caps, cacau-2): sub-group labels with a linha rule running to the edge. Kit names 2.1rem, cart title 2.2rem, ladder names 1.7rem.
- **Price** (900, 2rem on cards, 2.4rem on kits, 1.6rem on ladder rows and bar total, 2.1rem cart total; tabular numerals): always Londrina, red on cream, creme on chocolate.
- **Title** (Nunito 800, 1.12rem, 1.2): product names. Body (400-600, 1rem, 1.5): descriptions at 0.92rem, blurbs 1.05rem at max 60ch.
- **Label** (Nunito 700-800, 0.8-0.9rem): option labels, chip details, unit text, badges.

### Named Rules
**The Outlined Lettering Rule.** Large Londrina on a field carries a thick stroke in the field's neighbour tone (bege on cream, near-black brown on cacau) with paint-order stroke, echoing the flyers. Small Londrina (prices, group titles) stays unstroked.

**The Numerals Rule.** Every figure is tabular-nums; every price is Londrina.

## Layout

Single column on phones inside 16px gutters; content max-width 1180px. Product grid is 1 column, 2 from 720px, 3 from 1040px (gap 14px, 18px from 720px). Header is 60px (68px from 720px) and the category strip a further 60px; both are sticky and the category scroll-margin accounts for them. Sections open with 40px (56px desktop) top padding; groups separate by 34px. Spacing runs on a loose 4/8/12/16/24/40 rhythm rather than a strict token scale.

On phones a product card is a 104px photo beside the name block, with options and buy row spanning below; single-option cards put the price beside the photo. From 720px cards stack with a 4:3 photo. The order bar floats at the bottom (full width on phones, 480px at right on desktop). The cart is a bottom sheet (max 92dvh) on phones and a 480px right drawer from 720px.

## Elevation & Depth

Mostly flat and tonal: depth comes from the paper-on-cream step and 1px linha borders. Shadows are soft, long-offset and brown-tinted, and only on cards, kits and the order bar. The cart sits over a brown-tinted scrim.

### Shadow Vocabulary
- **Card rest** (`0 1px 0 rgb(71 48 28 / 0.05), 0 14px 28px -20px rgb(71 48 28 / 0.45)`): product and ladder cards.
- **Kit rest** (`0 18px 30px -22px rgb(40 24 10 / 0.7)`): chocolate kits.
- **Order bar** (`0 16px 32px -10px rgb(40 24 10 / 0.6)`): floating bar.

### Named Rules
**The Tinted Shadow Rule.** Shadows are diffuse with negative spread and brown; no hard offsets, no glows.

## Shapes

Soft and rounded, never sharp. Pills (999px) for actions, tabs, badges and the steppers; 12-16px for chips, fields, buttons and icon buttons; 20px product cards, 24px kits, 18px notice; 26-28px for the cart sheet, the intro band's bottom edge and the footer's top edge. The mascot sits on a 26px cream tile. Borders are 1px linha on cards, 1.5px on chips, tabs and fields, and a 2px dashed cacau-3 on the notice. Hearts are the only glyph ornament.

## Components

### Buttons
- **Add pill:** morango, creme text, full pill, 46px tall, a round translucent plus icon at left; hover morango-2; press scale .96; the added state turns cacau and reads "No pedido" for 1.4s. On kits it inverts to a creme pill with cacau text (red when added).
- **Ladder add:** 44px round morango plus; added state cacau with a check.
- **Cart pill (header):** cacau, creme text, 44px, with a red count badge. **Send to WhatsApp:** full-width morango, 52px, 16px radius. **Ghost:** 2px cacau outline, transparent. **Link-button:** morango underlined text.
- Easing is `cubic-bezier(0.16, 1, 0.3, 1)` at about 0.18s for press and 0.2-0.25s for color.

### Chips and tabs
- **Category tab:** outlined pill, 1.5px linha border, cacau text; selected is solid cacau with creme text. Horizontal-scroll strip, scrollbar hidden.
- **Size chip:** each carries label, optional detail and its own price; idle creme with a linha border, selected solid cacau. Auto-fit grid, 92px minimum.
- **Badge:** bege pill, cacau 800 text.

### Cards / Containers
- **Product card:** paper, 1px linha, 20px radius, 12px padding, card-rest shadow, photo in a 14px radius frame (leite tile for drawn cake art).
- **Kit block:** solid cacau, 24px radius, 20px padding, heart-bulleted list, creme Londrina price.
- **Ladder card:** paper card with no photo, a small drawn tier-cake, then rows of label, red Londrina price and a round add button, separated by linha hairlines.
- **Notice:** dashed 2px box on leite with heart-led creme pills, mirroring the flyers' information panel.

### Inputs / Fields
Paper fill, 1.5px linha border, 14px radius, 48px minimum height (44px small), morango caret. Focus is a 3px morango outline and border; error is a morango border with morango 700 message text. Search is a creme field sitting inside the chocolate band with a bege focus outline. Segmented options are two-up paper tiles that fill cacau when chosen.

### Navigation
Sticky creme top bar: logo plus outlined wordmark at left, cart pill at right, 1px linha underline. The category strip sticks directly below.

### Cart sheet
Creme panel with a Londrina caps title, hairline-divided lines with 44px pill steppers, and a paper footer holding the Londrina total and the send button. Bottom sheet on phones, side drawer from 720px, slide-in animation only when motion is not reduced.

## Do's and Don'ts

### Do:
- **Do** keep prices in Londrina, tabular, morango on cream (#b5302a) and creme on chocolate.
- **Do** make brown fields (cacau #47301c) and cream ground the structural split; use paper (#fff8f1) for raised cards.
- **Do** show every size with its own price on the card; selection state is solid cacau.
- **Do** keep touch targets at 44px or larger and use the 3px morango focus ring (creme on brown surfaces).
- **Do** wrap motion in `prefers-reduced-motion: no-preference`.
- **Do** use the heart as the single ornament.

### Don't:
- **Don't** use morango for decoration, headings or large fills outside the add/send controls.
- **Don't** introduce serif display type, pastel palettes, cool grays, pure black or pure white.
- **Don't** use hard offset shadows, gradient text or glass effects; depth is tonal plus the tinted shadows above.
- **Don't** add ornaments other than the heart, or invent shop facts (delivery, hours, testimonials); content comes from the flyers.

## Not canonized (build carries these)

Off-token one-offs: the kit heart tint (#e98a80), the intro title outline (#2a190b), the cake-leaf green (#5d7a3a) and the mixed 18px/26px/28px radii outside a named scale. Kept as local values, not rules for new surfaces.
