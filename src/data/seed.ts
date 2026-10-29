import { EXTRA_PRICES, LEAD_DAYS, SEED_SETTINGS } from "../config.js";
import type { CatalogData, Category, ChoiceGroup, Option, Product } from "../types";

const img = (name: string) => `/img/${name}.webp`;

const sizes = (
  base: string,
  rows: [label: string, detail: string | undefined, price: number][],
): Option[] =>
  rows.map(([label, detail, price], i) => ({
    id: `${base}-${i}`,
    label,
    detail,
    price,
  }));

const qty = (base: string, rows: [number, number][]): Option[] =>
  rows.map(([n, price]) => ({
    id: `${base}-${n}`,
    label: `${n} un.`,
    price,
  }));

const single = (id: string, label: string, price: number, detail?: string): Option[] => [
  { id, label, price, detail },
];

/** Extras dos bolos confeitados; `skip` tira os que já vêm inclusos. */
const cakeExtras = (skip: string[] = []): ChoiceGroup => ({
  id: "extras",
  title: "Extras para o bolo",
  hint: "Valor adicional por bolo. Marque o que quiser.",
  required: false,
  multiple: true,
  choices: (
    [
      ["glitter", "Glitter"],
      ["flores", "Flores artificiais"],
      ["topo3d", "Topo 3D"],
      ["metal", "Cores metalizadas"],
      ["frutas", "Frutas"],
      ["doces", "Doces"],
    ] as const
  )
    .filter(([id]) => !skip.includes(id))
    .map(([id, label]) => ({ id, label, price: EXTRA_PRICES[id] })),
});

const pick = (
  id: string,
  title: string,
  labels: string[],
  opts: { required?: boolean; multiple?: boolean; hint?: string; appliesTo?: string[] } = {},
): ChoiceGroup => ({
  id,
  title,
  hint: opts.hint,
  required: opts.required ?? true,
  multiple: opts.multiple ?? false,
  appliesTo: opts.appliesTo,
  choices: labels.map((label) => ({ id: label.toLowerCase().replace(/[^a-z0-9]+/g, "-"), label })),
});

const PF = ["P", "M", "G"];
const tortaSizes = (base: string, p: [number, number, number]): Option[] =>
  PF.map((l, i) => ({
    id: `${base}-${l}`,
    label: l,
    detail: `${[10, 15, 20][i]} fatias`,
    price: p[i],
  }));

const tortinhaSizes = (base: string, p: [number, number, number]): Option[] =>
  ["Pequena", "Média", "Grande"].map((l, i) => ({
    id: `${base}-${l}`,
    label: l,
    detail: `${[10, 15, 20][i]} fatias`,
    price: p[i],
  }));

const tortaProd = (
  id: string,
  name: string,
  image: string,
  p: [number, number, number],
): Product => ({ id, name, image: img(image), optionLabel: "Tamanho", options: tortaSizes(id, p) });

const tortinhaProd = (
  id: string,
  name: string,
  image: string,
  p: [number, number, number],
): Product => ({
  id,
  name,
  image: img(image),
  optionLabel: "Tamanho",
  options: tortinhaSizes(id, p),
});

const GOURMET = qty("gourmet", [
  [25, 50],
  [50, 100],
  [100, 200],
]);
const gourmet = (
  id: string,
  name: string,
  image: string,
  description?: string,
  groups?: ChoiceGroup[],
): Product => ({
  id,
  name,
  description,
  groups,
  image: img(image),
  optionLabel: "Quantidade",
  options: GOURMET.map((o) => ({ ...o, id: `${id}-${o.id}` })),
});

const baseCategories: Category[] = [
  {
    id: "kits",
    name: "Kits",
    blurb: "Bolo, salgados e doces já combinados para a sua festa.",
    groups: [
      {
        products: [
          {
            id: "kit-trufado",
            name: "Kit Trufado",
            includes: ["Bolo trufado", "100 salgados", "1 refri 2L"],
            options: single("kit-trufado-1", "Kit completo", 115),
          },
          {
            id: "kit-bolinho",
            groups: [cakeExtras()],
            name: "Kit Bolinho",
            includes: ["Bolo confeitado 10 fatias", "100 salgados", "1 refri 2L"],
            options: single("kit-bolinho-1", "Kit completo", 130),
          },
          {
            id: "kit-pp",
            groups: [cakeExtras()],
            name: "Kit PP",
            includes: ["Bolo PP", "100 salgados"],
            fine: "R$ 5,00 de desconto no cento de salgado",
            options: single("kit-pp-1", "Kit completo", 175),
          },
          {
            id: "kit-p",
            groups: [cakeExtras()],
            name: "Kit P",
            includes: ["Bolo confeitado P", "200 salgados", "1 refri 2L"],
            options: single("kit-p-1", "Kit completo", 280),
          },
          {
            id: "kit-m",
            groups: [cakeExtras()],
            name: "Kit M",
            includes: ["Bolo médio", "200 salgados", "50 doces", "10 cup cakes"],
            options: single("kit-m-1", "Kit completo", 400),
          },
          {
            id: "kit-m2",
            groups: [cakeExtras()],
            name: "Kit M 2 Andares",
            includes: ["Bolo médio 2 andares", "200 salgados", "100 doces", "6 cup cakes"],
            options: single("kit-m2-1", "Kit completo", 550),
          },
        ],
      },
    ],
  },
  {
    id: "confeitados",
    name: "Bolos confeitados",
    blurb: "Do bolinho ao bolo de 4 andares.",
    notice: {
      title: "Esses extras têm valor adicional",
      text: "Combine pelo WhatsApp o que você quer no seu bolo.",
      items: ["Glitter", "Flores artificiais", "Topo 3D", "Cores metalizadas", "Frutas", "Doces"],
    },
    groups: [
      {
        products: [
          {
            id: "bolinhos",
            name: "Bolinhos",
            groups: [
              pick("recheio", "Recheio do Pinguinho", ["Brigadeiro", "Ninho", "Doce de leite", "Morango"], {
                hint: "O Pinguinho vem com 1 opção de recheio.",
                appliesTo: ["bolinhos-0"],
              }),
              cakeExtras(),
            ],
            fine: "O Pinguinho vem com 1 opção de recheio.",
            art: { kind: "tiers", tiers: 1 },
            options: sizes("bolinhos", [
              ["Pinguinho", "4 fatias", 35],
              ["Bolinho", "10 fatias", 75],
              ["Mini", "15 fatias", 100],
            ]),
          },
          {
            id: "confeitado-redondo",
            name: "Bolo de 1 andar",
            groups: [cakeExtras()],
            art: { kind: "tiers", tiers: 1 },
            options: sizes("confeitado", [
              ["PP", "20 fatias", 130],
              ["P", "30 fatias", 175],
              ["Médio", "40 fatias", 200],
              ["Grande", "50 fatias", 270],
              ["GG", "80 fatias", 330],
            ]),
          },
          {
            id: "confeitado-quadrado",
            name: "Bolo quadrado",
            groups: [cakeExtras()],
            art: { kind: "tiers", tiers: 1, square: true },
            options: sizes("quadrado", [
              ["Quadrado", "50 fatias", 280],
              ["Quadradão", "90 fatias", 385],
            ]),
          },
          {
            id: "confeitado-2",
            name: "Bolo de 2 andares",
            groups: [cakeExtras()],
            art: { kind: "tiers", tiers: 2 },
            options: sizes("dois-andares", [
              ["P", "50 fatias", 280],
              ["Médio", "70 fatias", 345],
              ["Grande", "100 fatias", 395],
            ]),
          },
          {
            id: "confeitado-3-4",
            name: "Bolo de 3 e 4 andares",
            groups: [cakeExtras(["topo3d", "metal", "frutas", "doces"])],
            fine: "Nos bolos de 3 andares já estão inclusos topo 3D, cores metalizadas, frutas e doces.",
            art: { kind: "tiers", tiers: 3 },
            options: sizes("tres-quatro", [
              ["P de 3 andares", "65 fatias", 390],
              ["G de 3 andares", "120 fatias", 520],
              ["4 andares", "150 fatias", 650],
            ]),
          },
        ],
      },
    ],
  },
  {
    id: "especiais",
    name: "Bolos especiais",
    blurb: "Coberturas cremosas, morangos e bombons.",
    groups: [
      {
        products: [
          {
            id: "trufado",
            name: "Bolo Trufado",
            description: "Cobertura trufada de ninho e chocolate, com morangos e chips.",
            image: img("especial-trufado"),
            optionLabel: "Tamanho",
            options: sizes("trufado", [
              ["8 fatias", undefined, 35],
              ["12 fatias", undefined, 60],
              ["20 fatias", undefined, 100],
            ]),
          },
          {
            id: "vulcao",
            name: "Bolo Vulcão",
            description: "Cobertura de chocolate e ninho escorrendo, com morango e chips.",
            image: img("especial-vulcao"),
            optionLabel: "Tamanho",
            options: sizes("vulcao", [
              ["8 fatias", undefined, 30],
              ["12 fatias", undefined, 50],
              ["20 fatias", undefined, 85],
            ]),
          },
          {
            id: "piscina",
            name: "Bolo Piscina",
            description: "Topo aberto com chocolate e ninho, morango e chips.",
            image: img("especial-piscina"),
            options: single("piscina-1", "12 fatias", 50),
          },
          {
            id: "vulcao-supremo",
            name: "Bolo Vulcão Supremo",
            description: "Vulcão de ninho e chocolate com morangos e bombons de amendoim.",
            image: img("especial-vulcao-supremo"),
            optionLabel: "Massa",
            options: [
              {
                id: "vulcao-supremo-tradicional",
                label: "Tradicional",
                detail: "12 fatias",
                price: 65,
                image: img("especial-vulcao-supremo"),
              },
              {
                id: "vulcao-supremo-chocolate",
                label: "Chocolate",
                detail: "12 fatias",
                price: 70,
                image: img("especial-vulcao-supremo-choc"),
              },
            ],
          },
          {
            id: "paidegua",
            name: "Bolo Paidegua",
            description: "Massa de chocolate, creme de ninho e morangos.",
            image: img("especial-paidegua"),
            options: single("paidegua-1", "12 fatias", 65),
          },
          {
            id: "africano",
            name: "Bolo Africano",
            description: "Massa de chocolate com morangos e bombons de amendoim.",
            image: img("especial-africano"),
            options: single("africano-1", "12 fatias", 70),
          },
          {
            id: "amostrado",
            name: "Bolo Amostrado",
            description: "Listras de ninho e chocolate, morangos e bombons de amendoim.",
            image: img("especial-amostrado"),
            options: single("amostrado-1", "12 fatias", 75),
          },
          {
            id: "arretado",
            name: "Bolo Arretado",
            description: "Massa de chocolate coberta de brigadeiros de granulê e fio de chocolate.",
            image: img("especial-arretado"),
            options: single("arretado-1", "12 fatias", 75),
          },
        ],
      },
    ],
  },
  {
    id: "caseirinhos",
    name: "Bolos caseirinhos",
    blurb: "Do bolo mole ao de chocolate, para o dia a dia.",
    groups: [
      {
        products: [
          { id: "mole", name: "Bolo Mole", image: img("caseiro-mole"), options: single("mole-1", "Bolo inteiro", 30) },
          { id: "milho", name: "Bolo de Milho", image: img("caseiro-milho"), options: single("milho-1", "Bolo inteiro", 30) },
          { id: "fofo", name: "Bolo Fofo", image: img("caseiro-fofo"), options: single("fofo-1", "Bolo inteiro", 20) },
          { id: "chocolate", name: "Bolo de Chocolate", image: img("caseiro-chocolate"), options: single("choc-1", "Bolo inteiro", 25) },
          { id: "formigueiro", name: "Bolo Formigueiro", image: img("caseiro-formigueiro"), options: single("formigueiro-1", "Bolo inteiro", 25) },
          { id: "mesclado", name: "Bolo Mesclado", image: img("caseiro-mesclado"), options: single("mesclado-1", "Bolo inteiro", 25) },
          {
            id: "xiqui",
            name: "Bolo Xiqui",
            description: "Cobertura de ninho e calda de morango.",
            image: img("caseiro-xiqui"),
            options: single("xiqui-1", "12 fatias", 40),
          },
          {
            id: "xodo",
            name: "Bolo Xodó",
            description: "Cobertura de chocolate com granulê.",
            image: img("caseiro-xodo"),
            options: single("xodo-1", "12 fatias", 40),
          },
          {
            id: "fuxico",
            name: "Bolo Fuxico",
            description: "Cobertura de chocolate com amendoim picado.",
            image: img("caseiro-fuxico"),
            options: single("fuxico-1", "12 fatias", 45),
          },
        ],
      },
    ],
  },
  {
    id: "tortas",
    name: "Tortas",
    blurb: "Tortas de 10, 15 ou 20 fatias.",
    notice: {
      title: "As tortas não acompanham topo, tema, cores ou plaquinhas",
      text: "Para bolo decorado, veja os Bolos confeitados.",
    },
    groups: [
      {
        products: [
          tortaProd("torta-ninho", "Torta de Ninho", "torta-ninho", [65, 85, 125]),
          tortaProd("torta-abacaxi", "Torta de Abacaxi", "torta-abacaxi", [65, 95, 130]),
          tortaProd("torta-maracuja", "Torta de Maracujá", "torta-maracuja", [65, 95, 130]),
          tortaProd("torta-ninho-nutella", "Torta de Ninho com Nutella", "torta-ninho-nutella", [80, 100, 140]),
          tortaProd("torta-ferrero", "Torta Ferrero", "torta-ferrero", [70, 90, 130]),
          tortaProd("torta-ninho-morango", "Torta de Ninho com Morango", "torta-ninho-morango", [85, 120, 150]),
          tortaProd("torta-abacaxi-coco", "Torta de Abacaxi com Coco", "torta-abacaxi-coco", [65, 85, 125]),
          tortaProd("torta-chocolate", "Torta de Chocolate", "torta-chocolate", [65, 85, 125]),
          tortaProd("torta-prestigio", "Torta Prestígio", "torta-prestigio", [65, 85, 125]),
        ],
      },
    ],
  },
  {
    id: "tortinhas",
    name: "Tortinhas",
    blurb: "Tortinhas de 10, 15 ou 20 fatias.",
    groups: [
      {
        products: [
          tortinhaProd("tortinha-chocolate", "Tortinha de Chocolate", "tortinha-chocolate", [50, 70, 90]),
          tortinhaProd("tortinha-ninho-nutella", "Tortinha de Ninho com Nutella", "tortinha-ninho-nutella", [50, 70, 90]),
          tortinhaProd("tortinha-ferrero", "Tortinha Ferrero", "tortinha-ferrero", [50, 70, 90]),
          tortinhaProd("tortinha-ninho", "Tortinha de Ninho", "tortinha-ninho", [45, 60, 85]),
        ],
      },
    ],
  },
  {
    id: "doces",
    name: "Doces",
    blurb: "Todos os nossos doces são feitos com produtos de alta qualidade, e um toque muito especial de amor.",
    groups: [
      {
        title: "Doces tradicionais",
        note: "Prestígio, brigadeiro, beijinho, ninho e casadinho. Escolha os sabores ao adicionar.",
        products: [
          {
            id: "doces-tradicionais",
            name: "Doces tradicionais",
            groups: [
              pick("sabores", "Sabores", ["Prestígio", "Brigadeiro", "Beijinho", "Ninho", "Casadinho"], {
                multiple: true,
                hint: "Marque os sabores. Dividimos a quantidade entre eles, ou diga como prefere no recado.",
              }),
            ],
            description: "Prestígio, brigadeiro, beijinho, ninho e casadinho.",
            image: img("doces-tradicionais"),
            optionLabel: "Quantidade",
            notePlaceholder: "Quantos de cada sabor, se quiser",
            options: qty("tradicional", [
              [25, 35],
              [50, 65],
              [100, 120],
            ]),
          },
        ],
      },
      {
        title: "Doces gourmet",
        note: "Mesmo preço para todos os sabores: 25 por R$ 50, 50 por R$ 100, 100 por R$ 200.",
        products: [
          gourmet("g-brigadeiro-choc", "Brigadeiro de chocolate com granulê", "gourmet-brigadeiro-chocolate"),
          gourmet("g-brigadeiro-ninho", "Brigadeiro de ninho com granulê branco", "gourmet-brigadeiro-ninho"),
          gourmet("g-ninho-nutella", "Ninho com Nutella", "gourmet-ninho-nutella"),
          gourmet("g-ferrero", "Ferrero Rocher", "gourmet-ferrero"),
          gourmet("g-flores", "Doces flores de leite ninho", "gourmet-flores"),
          gourmet("g-morango-nutella", "Morango com Nutella", "gourmet-morango-nutella"),
          gourmet("g-oreo", "Oreo", "gourmet-oreo"),
          gourmet("g-cappuccino", "Cappuccino", "gourmet-cappuccino"),
          gourmet("g-churros", "Churros com doce de leite", "gourmet-churros"),
          gourmet("g-brownie", "Brownie com Nutella ou ninho", "gourmet-brownie", undefined, [
            pick("cobertura", "Cobertura", ["Nutella", "Ninho"]),
          ]),
          gourmet("g-casadinho", "Casadinho de ninho com morango", "gourmet-casadinho-morango"),
          gourmet("g-coco-queimado", "Coco queimado", "gourmet-coco-queimado"),
        ],
      },
    ],
  },
  {
    id: "salgados",
    name: "Salgados",
    blurb: "Coxinha, risole, bolinha de queijo, canudinho e pastel.",
    groups: [
      {
        products: [
          {
            id: "salgados-fritos",
            name: "Salgados",
            groups: [
              pick("sabores", "Sabores", ["Coxinha de frango", "Risole de calabresa", "Bolinha de queijo"], {
                multiple: true,
                hint: "Marque os sabores. Dividimos a quantidade entre eles, ou diga como prefere no recado.",
              }),
            ],
            description: "Coxinha de frango, risole de calabresa e bolinha de queijo.",
            image: img("salgados-fritos"),
            optionLabel: "Quantidade",
            notePlaceholder: "Quantos de cada sabor, se quiser",
            options: qty("salgados", [
              [25, 18],
              [50, 27],
              [100, 50],
            ]),
          },
          {
            id: "canudinho",
            name: "Canudinho de frango",
            image: img("salgado-canudinho"),
            options: single("canudinho-100", "100 unidades", 75),
          },
          {
            id: "pastel",
            name: "Pastéis de carne",
            image: img("salgado-pastel"),
            options: single("pastel-100", "100 unidades", 60),
          },
        ],
      },
    ],
  },
  {
    id: "sobremesas",
    name: "Sobremesas",
    blurb: "Individuais, em pote, em fatia ou inteiras.",
    groups: [
      {
        products: [
          { id: "dois-amores", name: "Dois Amores", image: img("sobremesa-dois-amores"), options: single("dois-amores-1", "Unidade", 10) },
          { id: "brownie", name: "Brownie", image: img("sobremesa-brownie"), options: single("brownie-1", "Unidade", 7) },
          {
            id: "bolo-pote",
            name: "Bolo de pote",
            image: img("sobremesa-bolo-pote"),
            optionLabel: "Sabor",
            options: ["Ninho", "Chocolate", "Red velvet", "Floresta negra"].map((s) => ({
              id: `pote-${s.toLowerCase().replace(/\s/g, "-")}`,
              label: s,
              price: 12,
            })),
          },
          {
            id: "cone-trufado",
            name: "Cone trufado",
            groups: [pick("sabor", "Sabor", ["Amendoim", "Ninho", "Chocolate"], { hint: "Sujeito às opções do dia." })],
            image: img("sobremesa-cone-trufado"),
            badge: "Ver opções do dia",
            notePlaceholder: "Sabor (confirmamos as opções do dia)",
            options: single("cone-1", "Unidade", 10),
          },
          { id: "fatia-ninho-nutella", name: "Fatia ninho com Nutella", image: img("sobremesa-fatia-ninho-nutella"), options: single("fatia-nn-1", "Fatia", 17) },
          { id: "fatia-prestigio", name: "Fatia prestígio", image: img("sobremesa-fatia-prestigio"), options: single("fatia-p-1", "Fatia", 15) },
          { id: "fatia-ferrero", name: "Fatia Ferrero", image: img("sobremesa-fatia-ferrero"), options: single("fatia-f-1", "Fatia", 15) },
          { id: "pudim-medio", name: "Pudim médio", image: img("sobremesa-pudim-medio"), options: single("pudim-m-1", "8 fatias", 35) },
          { id: "pudim-grande", name: "Pudim grande", image: img("sobremesa-pudim-grande"), options: single("pudim-g-1", "12 a 15 fatias", 70) },
          {
            id: "bandeja-doces",
            name: "Bandeja de doces",
            image: img("sobremesa-bandeja-doces"),
            badge: "Ver opções do dia",
            notePlaceholder: "Preferências (confirmamos as opções do dia)",
            options: single("bandeja-1", "Bandeja", 25),
          },
          {
            id: "caixa-mocinha",
            name: "Caixa mocinha com doces",
            image: img("sobremesa-caixa-mocinha"),
            badge: "Ver opções do dia",
            notePlaceholder: "Preferências (confirmamos as opções do dia)",
            options: single("mocinha-1", "Unidade", 2),
          },
        ],
      },
    ],
  },
];

export const seedCategories: Category[] = baseCategories.map((c) => ({
  ...c,
  leadDays: LEAD_DAYS[c.id] ?? 0,
  visible: true,
  groups: c.groups.map((g, i) => ({ ...g, id: g.id ?? `${c.id}-gr${i}` })),
}));

/** Catálogo inicial: usado até o dono publicar o primeiro do painel. */
export const seedData: CatalogData = {
  version: 1,
  updatedAt: "2026-10-12T00:00:00.000Z",
  settings: SEED_SETTINGS,
  categories: seedCategories,
};
