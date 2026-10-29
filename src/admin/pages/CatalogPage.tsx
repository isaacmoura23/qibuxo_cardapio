import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, Copy, Pencil, Plus, Trash2 } from "lucide-react";
import { TierCake } from "../../components/Art";
import { newId } from "../../shared/sanitize";
import type { CatalogData, Category, Group, Product } from "../../types";
import { useDraft } from "../draft";
import { TextField, NumField, Toggle, money, move } from "../ui";
import { ProductEditor, type Where } from "./ProductEditor";

const blankProduct = (): Product => ({
  id: newId("p"),
  name: "",
  options: [{ id: newId("o"), label: "Unidade", price: 0 }],
  available: true,
  visible: true,
});

const priceText = (p: Product) => {
  const prices = p.options.map((o) => o.price);
  const lo = Math.min(...prices);
  const hi = Math.max(...prices);
  return lo === hi ? money(lo) : `${money(lo)} a ${money(hi)}`;
};

type Editing = { product: Product; where: Where; isNew: boolean } | null;

export function CatalogPage() {
  const { draft, setDraft } = useDraft();
  const [catId, setCatId] = useState(draft.categories[0]?.id ?? "");
  const [editing, setEditing] = useState<Editing>(null);
  const cat = draft.categories.find((c) => c.id === catId) ?? draft.categories[0];

  useEffect(() => {
    if (!draft.categories.some((c) => c.id === catId) && draft.categories[0]) setCatId(draft.categories[0].id);
  }, [draft.categories, catId]);

  const updateData = (fn: (cats: Category[]) => Category[]) => setDraft((d): CatalogData => ({ ...d, categories: fn(d.categories) }));
  const updateCat = (id: string, patch: Partial<Category>) => updateData((cs) => cs.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  const updateGroup = (cId: string, gId: string, fn: (g: Group) => Group) =>
    updateData((cs) => cs.map((c) => (c.id === cId ? { ...c, groups: c.groups.map((g) => (g.id === gId ? fn(g) : g)) } : c)));

  const addCategory = () => {
    const id = newId("cat");
    updateData((cs) => [...cs, { id, name: "Nova categoria", blurb: "", leadDays: 0, visible: true, groups: [{ id: newId("gr"), products: [] }] }]);
    setCatId(id);
  };

  const removeCategory = (c: Category) => {
    const n = c.groups.reduce((s, g) => s + g.products.length, 0);
    if (!window.confirm(`Apagar a categoria “${c.name}”${n ? ` e os ${n} produtos dela` : ""}? Isso só vale depois de publicar.`)) return;
    updateData((cs) => cs.filter((x) => x.id !== c.id));
  };

  const saveProduct = (p: Product, where: Where, prev: Where, isNew: boolean) => {
    updateData((cs) => {
      const moved = prev.catId !== where.catId || prev.groupId !== where.groupId;
      let next = cs;
      if (!isNew && moved) {
        next = next.map((c) => ({ ...c, groups: c.groups.map((g) => ({ ...g, products: g.products.filter((x) => x.id !== p.id) })) }));
      }
      return next.map((c) =>
        c.id !== where.catId
          ? c
          : {
              ...c,
              groups: c.groups.map((g) => {
                if (g.id !== where.groupId) return g;
                if (isNew || moved) return { ...g, products: [...g.products, p] };
                return { ...g, products: g.products.map((x) => (x.id === p.id ? p : x)) };
              }),
            },
      );
    });
    setCatId(where.catId);
    setEditing(null);
  };

  const removeProduct = (g: Group, p: Product) => {
    if (!window.confirm(`Apagar “${p.name}”? Isso só vale depois de publicar.`)) return;
    updateGroup(cat!.id, g.id!, (gg) => ({ ...gg, products: gg.products.filter((x) => x.id !== p.id) }));
  };

  const duplicate = (g: Group, p: Product) => {
    const copy: Product = { ...structuredClone(p), id: newId("p"), name: `${p.name} (cópia)` };
    updateGroup(cat!.id, g.id!, (gg) => ({ ...gg, products: [...gg.products, copy] }));
  };

  if (!cat) {
    return (
      <section className="apage">
        <p className="aempty">Nenhuma categoria.</p>
        <button type="button" className="abtn abtn--primary" onClick={addCategory}>
          <Plus size={18} aria-hidden="true" /> Nova categoria
        </button>
      </section>
    );
  }
  const ci = draft.categories.findIndex((c) => c.id === cat.id);

  return (
    <section aria-labelledby="cat-h" className="apage">
      <div className="apagehead">
        <h1 id="cat-h" className="adisplay apagehead__title">
          Catálogo
        </h1>
        <div className="apagehead__acts">
          <button type="button" className="abtn abtn--ghost abtn--sm" onClick={addCategory}>
            <Plus size={16} aria-hidden="true" /> Nova categoria
          </button>
        </div>
      </div>
      <p className="amuted apage__lead">Edite à vontade. O site só muda depois de tocar em Publicar.</p>

      <div className="acats" role="tablist" aria-label="Categorias">
        {draft.categories.map((c) => (
          <button key={c.id} type="button" role="tab" aria-selected={c.id === cat.id} className={`achip${c.id === cat.id ? " is-on" : ""}${c.visible === false ? " is-off" : ""}`} onClick={() => setCatId(c.id)}>
            {c.name || "Sem nome"}
          </button>
        ))}
      </div>

      <div className="acard">
        <div className="acard__head">
          <h2 className="acard__title">Categoria</h2>
          <div className="aopt__acts">
            <button type="button" className="aicon" aria-label="Mover categoria para trás" disabled={ci === 0} onClick={() => updateData((cs) => move(cs, ci, -1))}>
              <ArrowUp size={18} />
            </button>
            <button type="button" className="aicon" aria-label="Mover categoria para frente" disabled={ci === draft.categories.length - 1} onClick={() => updateData((cs) => move(cs, ci, 1))}>
              <ArrowDown size={18} />
            </button>
            <button type="button" className="aicon aicon--danger" aria-label="Apagar categoria" onClick={() => removeCategory(cat)}>
              <Trash2 size={18} />
            </button>
          </div>
        </div>
        <div className="agrid">
          <TextField label="Nome" value={cat.name} max={60} onChange={(name) => updateCat(cat.id, { name })} />
          <NumField label="Antecedência mínima (dias)" hint="Quantos dias antes o cliente precisa encomendar. 0 = no mesmo dia." prefix="dias" step={1} max={60} value={cat.leadDays ?? 0} onChange={(leadDays) => updateCat(cat.id, { leadDays })} />
        </div>
        <TextField label="Descrição curta" value={cat.blurb} max={240} onChange={(blurb) => updateCat(cat.id, { blurb })} />
        <Toggle label="Mostrar no site" checked={cat.visible !== false} onChange={(visible) => updateCat(cat.id, { visible })} />

        <details className="adetails">
          <summary>Aviso da categoria {cat.notice ? "(ativo)" : "(nenhum)"}</summary>
          <p className="amuted">Uma caixa tracejada no começo da categoria. Ex.: “Esses extras têm valor adicional”.</p>
          <TextField label="Título" value={cat.notice?.title ?? ""} max={120} onChange={(title) => updateCat(cat.id, { notice: { title, text: cat.notice?.text ?? "", items: cat.notice?.items } })} />
          <TextField label="Texto" value={cat.notice?.text ?? ""} max={300} multiline onChange={(text) => updateCat(cat.id, { notice: { title: cat.notice?.title ?? "", text, items: cat.notice?.items } })} />
          <TextField
            label="Itens (um por linha)"
            value={(cat.notice?.items ?? []).join("\n")}
            multiline
            onChange={(v) => updateCat(cat.id, { notice: { title: cat.notice?.title ?? "", text: cat.notice?.text ?? "", items: v.split("\n").slice(0, 20) } })}
          />
          {cat.notice && (
            <button type="button" className="abtn abtn--ghost abtn--sm" onClick={() => updateCat(cat.id, { notice: undefined })}>
              Remover aviso
            </button>
          )}
        </details>
      </div>

      {cat.groups.map((g, gi) => (
        <div key={g.id} className="acard">
          <div className="acard__head">
            <h2 className="acard__title">{g.title || (cat.groups.length > 1 ? `Grupo ${gi + 1}` : "Produtos")}</h2>
            <div className="aopt__acts">
              <button type="button" className="aicon" aria-label="Subir grupo" disabled={gi === 0} onClick={() => updateCat(cat.id, { groups: move(cat.groups, gi, -1) })}>
                <ArrowUp size={18} />
              </button>
              <button type="button" className="aicon" aria-label="Descer grupo" disabled={gi === cat.groups.length - 1} onClick={() => updateCat(cat.id, { groups: move(cat.groups, gi, 1) })}>
                <ArrowDown size={18} />
              </button>
              <button
                type="button"
                className="aicon aicon--danger"
                aria-label="Apagar grupo"
                disabled={cat.groups.length === 1}
                onClick={() => {
                  if (g.products.length > 0 && !window.confirm(`Apagar este grupo e os ${g.products.length} produtos dele?`)) return;
                  updateCat(cat.id, { groups: cat.groups.filter((x) => x.id !== g.id) });
                }}
              >
                <Trash2 size={18} />
              </button>
            </div>
          </div>

          {(cat.groups.length > 1 || g.title || g.note) && (
            <div className="agrid">
              <TextField label="Título do grupo (opcional)" value={g.title ?? ""} max={60} onChange={(title) => updateGroup(cat.id, g.id!, (x) => ({ ...x, title }))} />
              <TextField label="Observação do grupo (opcional)" value={g.note ?? ""} max={240} onChange={(note) => updateGroup(cat.id, g.id!, (x) => ({ ...x, note }))} />
            </div>
          )}

          {g.products.length === 0 && <p className="aempty aempty--sm">Nenhum produto neste grupo.</p>}
          <ul className="aprods">
            {g.products.map((p, pi) => (
              <li key={p.id} className={`aprod${p.visible === false ? " is-hidden" : ""}`}>
                <div className="aprod__thumb" aria-hidden="true">
                  {p.image ? <img src={p.image} alt="" loading="lazy" /> : p.art ? <TierCake tiers={p.art.tiers} square={p.art.square} /> : <span>—</span>}
                </div>
                <div className="aprod__info">
                  <p className="aprod__name">{p.name || "(sem nome)"}</p>
                  <p className="aprod__meta">
                    {priceText(p)}
                    {p.options.length > 1 ? ` · ${p.options.length} opções` : ""}
                    {p.groups?.length ? ` · ${p.groups.length} ${p.groups.length === 1 ? "grupo de escolhas" : "grupos de escolhas"}` : ""}
                  </p>
                  <p className="aprod__flags">
                    {p.available === false && <span className="aflag aflag--off">Esgotado</span>}
                    {p.visible === false && <span className="aflag">Oculto</span>}
                  </p>
                </div>
                <div className="aprod__acts">
                  <Toggle label="Disponível" checked={p.available !== false} onChange={(available) => updateGroup(cat.id, g.id!, (x) => ({ ...x, products: x.products.map((y) => (y.id === p.id ? { ...y, available } : y)) }))} />
                  <div className="aopt__acts">
                    <button type="button" className="abtn abtn--ghost abtn--sm" onClick={() => setEditing({ product: p, where: { catId: cat.id, groupId: g.id! }, isNew: false })}>
                      <Pencil size={16} aria-hidden="true" /> Editar
                    </button>
                    <button type="button" className="aicon" aria-label={`Subir ${p.name}`} disabled={pi === 0} onClick={() => updateGroup(cat.id, g.id!, (x) => ({ ...x, products: move(x.products, pi, -1) }))}>
                      <ArrowUp size={18} />
                    </button>
                    <button type="button" className="aicon" aria-label={`Descer ${p.name}`} disabled={pi === g.products.length - 1} onClick={() => updateGroup(cat.id, g.id!, (x) => ({ ...x, products: move(x.products, pi, 1) }))}>
                      <ArrowDown size={18} />
                    </button>
                    <button type="button" className="aicon" aria-label={`Duplicar ${p.name}`} onClick={() => duplicate(g, p)}>
                      <Copy size={18} />
                    </button>
                    <button type="button" className="aicon aicon--danger" aria-label={`Apagar ${p.name}`} onClick={() => removeProduct(g, p)}>
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <button type="button" className="abtn abtn--primary" onClick={() => setEditing({ product: blankProduct(), where: { catId: cat.id, groupId: g.id! }, isNew: true })}>
            <Plus size={18} aria-hidden="true" /> Adicionar produto
          </button>
        </div>
      ))}

      <button type="button" className="abtn abtn--ghost" onClick={() => updateCat(cat.id, { groups: [...cat.groups, { id: newId("gr"), title: "", products: [] }] })}>
        <Plus size={18} aria-hidden="true" /> Adicionar grupo nesta categoria
      </button>

      {editing && (
        <ProductEditor
          key={editing.product.id}
          initial={editing.product}
          where={editing.where}
          categories={draft.categories}
          isNew={editing.isNew}
          onSave={(p, w) => saveProduct(p, w, editing.where, editing.isNew)}
          onClose={() => setEditing(null)}
        />
      )}
    </section>
  );
}
