import { useEffect, useId, useRef, useState } from "react";
import { ArrowDown, ArrowUp, ImagePlus, Loader2, Plus, Trash2, X } from "lucide-react";
import { TierCake } from "../../components/Art";
import { newId } from "../../shared/sanitize";
import type { Category, Choice, ChoiceGroup, Option, Product } from "../../types";
import { api, shrinkImage } from "../api";
import { NumField, TextField, Toggle, move, useToast } from "../ui";

export interface Where {
  catId: string;
  groupId: string;
}

interface Props {
  initial: Product;
  where: Where;
  categories: Category[];
  isNew: boolean;
  onSave: (p: Product, where: Where) => void;
  onClose: () => void;
}

const blankOption = (): Option => ({ id: newId("o"), label: "", price: 0 });
const blankChoice = (): Choice => ({ id: newId("c"), label: "" });

const TEMPLATES: { label: string; make: () => ChoiceGroup }[] = [
  {
    label: "Extras opcionais (com valor)",
    make: () => ({ id: newId("g"), title: "Extras", hint: "Valor adicional. Marque o que quiser.", required: false, multiple: true, choices: [{ id: newId("c"), label: "Extra 1", price: 5 }] }),
  },
  {
    label: "Sabores (escolha obrigatória)",
    make: () => ({ id: newId("g"), title: "Sabores", required: true, multiple: true, choices: [{ id: newId("c"), label: "Sabor 1" }, { id: newId("c"), label: "Sabor 2" }] }),
  },
  {
    label: "Uma opção obrigatória (recheio, cobertura…)",
    make: () => ({ id: newId("g"), title: "Recheio", required: true, multiple: false, choices: [{ id: newId("c"), label: "Opção 1" }, { id: newId("c"), label: "Opção 2" }] }),
  },
];

export function ProductEditor({ initial, where, categories, isNew, onSave, onClose }: Props) {
  const toast = useToast();
  const ref = useRef<HTMLDialogElement>(null);
  const uid = useId();
  const [p, setP] = useState<Product>(() => structuredClone(initial));
  const [loc, setLoc] = useState<Where>(where);
  const [uploading, setUploading] = useState(false);
  const [tried, setTried] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (ref.current && !ref.current.open) ref.current.showModal();
  }, []);

  const set = (patch: Partial<Product>) => setP((x) => ({ ...x, ...patch }));
  const setOption = (i: number, patch: Partial<Option>) => setP((x) => ({ ...x, options: x.options.map((o, k) => (k === i ? { ...o, ...patch } : o)) }));
  const groups = p.groups ?? [];
  const setGroup = (i: number, patch: Partial<ChoiceGroup>) => set({ groups: groups.map((g, k) => (k === i ? { ...g, ...patch } : g)) });

  const category = categories.find((c) => c.id === loc.catId) ?? categories[0]!;

  const problems: string[] = [];
  if (!p.name.trim()) problems.push("Informe o nome do produto.");
  if (p.options.length === 0) problems.push("Adicione pelo menos uma opção de preço.");
  if (p.options.some((o) => !o.label.trim())) problems.push("Toda opção de preço precisa de um nome.");
  if (groups.some((g) => !g.title.trim())) problems.push("Todo grupo de escolhas precisa de um título.");
  if (groups.some((g) => g.choices.length === 0 || g.choices.some((c) => !c.label.trim()))) problems.push("Preencha o nome de todas as escolhas (ou remova as vazias).");

  const upload = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    try {
      const blob = await shrinkImage(file);
      const r = await api.uploadImage(blob);
      set({ image: r.url });
      toast("Foto enviada.");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Não foi possível enviar a foto.", "error");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const save = () => {
    if (problems.length > 0) {
      setTried(true);
      return;
    }
    const clean: Product = {
      ...p,
      name: p.name.trim(),
      options: p.options.map((o) => ({ ...o, label: o.label.trim() })),
      groups: groups.map((g) => ({ ...g, title: g.title.trim(), choices: g.choices.map((c) => ({ ...c, label: c.label.trim() })) })),
    };
    onSave(clean, loc);
  };

  return (
    <dialog ref={ref} className="adialog" aria-labelledby={`${uid}-t`} onClose={onClose}>
      <div className="adialog__panel">
        <header className="adialog__head">
          <h2 id={`${uid}-t`} className="adisplay">
            {isNew ? "Novo produto" : "Editar produto"}
          </h2>
          <button type="button" className="aicon" aria-label="Fechar sem salvar" onClick={() => ref.current?.close()}>
            <X size={22} />
          </button>
        </header>

        <div className="adialog__body">
          <div className="acard acard--flat">
            <h3 className="acard__title">Básico</h3>
            <TextField label="Nome" value={p.name} max={80} onChange={(name) => set({ name })} />
            <TextField label="Descrição" hint="Aparece embaixo do nome. Descreva só o que o cliente vai receber." value={p.description ?? ""} max={300} multiline onChange={(description) => set({ description })} />
            <div className="agrid">
              <TextField label="Selo (opcional)" hint="Ex.: Ver opções do dia" value={p.badge ?? ""} max={40} onChange={(badge) => set({ badge })} />
              <TextField label="Observação curta (opcional)" value={p.fine ?? ""} max={200} onChange={(fine) => set({ fine })} />
            </div>
            <Toggle label="Disponível" hint="Desligue quando acabar: o produto continua aparecendo como “Esgotado” e não dá para pedir." checked={p.available !== false} onChange={(available) => set({ available })} />
            <Toggle label="Visível no site" hint="Desligue para esconder o produto sem apagar." checked={p.visible !== false} onChange={(visible) => set({ visible })} />
          </div>

          <div className="acard acard--flat">
            <h3 className="acard__title">Foto</h3>
            <div className="aphoto">
              <div className="aphoto__preview">
                {p.image ? <img src={p.image} alt="" /> : p.art ? <TierCake tiers={p.art.tiers} square={p.art.square} /> : <span className="amuted">Sem foto</span>}
              </div>
              <div className="aphoto__acts">
                <input ref={fileRef} id={`${uid}-file`} className="sr-only" type="file" accept="image/*" onChange={(e) => void upload(e.target.files?.[0])} />
                <label htmlFor={`${uid}-file`} className={`abtn abtn--primary${uploading ? " is-busy" : ""}`}>
                  {uploading ? <Loader2 size={18} className="spin" aria-hidden="true" /> : <ImagePlus size={18} aria-hidden="true" />} {p.image ? "Trocar foto" : "Enviar foto"}
                </label>
                {p.image && (
                  <button type="button" className="abtn abtn--ghost" onClick={() => set({ image: undefined })}>
                    Tirar foto
                  </button>
                )}
                <p className="afield__hint">A foto é reduzida automaticamente. Fotos na horizontal ou quadradas ficam melhores.</p>
              </div>
            </div>
            {!p.image && (
              <div className="afield">
                <label className="afield__label" htmlFor={`${uid}-art`}>
                  Ilustração (quando não há foto)
                </label>
                <select
                  id={`${uid}-art`}
                  className="ainput"
                  value={p.art ? `${p.art.tiers}${p.art.square ? "q" : ""}` : ""}
                  onChange={(e) => {
                    const v = e.target.value;
                    set({ art: v ? { kind: "tiers", tiers: Number.parseInt(v, 10), ...(v.endsWith("q") ? { square: true } : {}) } : undefined });
                  }}
                >
                  <option value="">Nenhuma</option>
                  <option value="1">Bolo de 1 andar</option>
                  <option value="1q">Bolo quadrado</option>
                  <option value="2">Bolo de 2 andares</option>
                  <option value="3">Bolo de 3 andares</option>
                  <option value="4">Bolo de 4 andares</option>
                </select>
                <p className="afield__hint">Produtos só com ilustração aparecem como lista de tamanhos, sem foto.</p>
              </div>
            )}
          </div>

          <div className="acard acard--flat">
            <h3 className="acard__title">Kit (opcional)</h3>
            <TextField
              label="Itens que vêm no kit, um por linha"
              hint="Se preencher, o produto aparece como um bloco de kit."
              value={(p.includes ?? []).join("\n")}
              multiline
              onChange={(v) => set({ includes: v.split("\n").slice(0, 20) })}
            />
          </div>

          <div className="acard acard--flat">
            <h3 className="acard__title">Preços</h3>
            <p className="amuted">Cada linha é uma opção que o cliente escolhe (tamanho, quantidade, sabor…). Com uma só linha, o produto tem preço único.</p>
            <TextField label="Nome do campo (opcional)" hint="Ex.: Tamanho, Quantidade, Sabor" value={p.optionLabel ?? ""} max={30} onChange={(optionLabel) => set({ optionLabel })} />
            <ul className="aopts">
              {p.options.map((o, i) => (
                <li key={o.id} className="aopt">
                  <div className="aopt__fields">
                    <TextField label={`Opção ${i + 1}: nome`} value={o.label} max={40} placeholder="Ex.: P, 12 fatias, 25 un." onChange={(label) => setOption(i, { label })} />
                    <TextField label="Detalhe (opcional)" value={o.detail ?? ""} max={40} placeholder="Ex.: 30 fatias" onChange={(detail) => setOption(i, { detail })} />
                    <NumField label="Preço" prefix="R$" value={o.price} onChange={(price) => setOption(i, { price })} />
                  </div>
                  <div className="aopt__acts">
                    <button type="button" className="aicon" aria-label="Subir opção" disabled={i === 0} onClick={() => set({ options: move(p.options, i, -1) })}>
                      <ArrowUp size={18} />
                    </button>
                    <button type="button" className="aicon" aria-label="Descer opção" disabled={i === p.options.length - 1} onClick={() => set({ options: move(p.options, i, 1) })}>
                      <ArrowDown size={18} />
                    </button>
                    <button
                      type="button"
                      className="aicon aicon--danger"
                      aria-label="Remover opção"
                      disabled={p.options.length === 1}
                      onClick={() =>
                        set({
                          options: p.options.filter((_, k) => k !== i),
                          groups: groups.map((g) => (g.appliesTo ? { ...g, appliesTo: g.appliesTo.filter((x) => x !== o.id) } : g)),
                        })
                      }
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
            <button type="button" className="abtn abtn--ghost" onClick={() => set({ options: [...p.options, blankOption()] })}>
              <Plus size={18} aria-hidden="true" /> Adicionar opção de preço
            </button>
          </div>

          <div className="acard acard--flat">
            <h3 className="acard__title">Escolhas do cliente (sabores, recheios, extras)</h3>
            <p className="amuted">Aparecem numa janela ao tocar em “Escolher”. Cada escolha pode ter um valor adicional.</p>
            {groups.map((g, gi) => (
              <div key={g.id} className="agroup">
                <div className="agroup__head">
                  <TextField label="Título do grupo" value={g.title} max={60} onChange={(title) => setGroup(gi, { title })} />
                  <div className="aopt__acts">
                    <button type="button" className="aicon" aria-label="Subir grupo" disabled={gi === 0} onClick={() => set({ groups: move(groups, gi, -1) })}>
                      <ArrowUp size={18} />
                    </button>
                    <button type="button" className="aicon" aria-label="Descer grupo" disabled={gi === groups.length - 1} onClick={() => set({ groups: move(groups, gi, 1) })}>
                      <ArrowDown size={18} />
                    </button>
                    <button type="button" className="aicon aicon--danger" aria-label="Remover grupo" onClick={() => set({ groups: groups.filter((_, k) => k !== gi) })}>
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
                <TextField label="Dica (opcional)" value={g.hint ?? ""} max={160} onChange={(hint) => setGroup(gi, { hint })} />
                <div className="arow arow--wrap">
                  <Toggle label="Obrigatório" checked={g.required} onChange={(required) => setGroup(gi, { required })} />
                  <Toggle label="Pode marcar várias" checked={g.multiple} onChange={(multiple) => setGroup(gi, { multiple })} />
                </div>
                {p.options.length > 1 && (
                  <fieldset className="aapplies">
                    <legend className="afield__label">Vale para quais opções de preço?</legend>
                    {p.options.map((o) => {
                      const all = !g.appliesTo || g.appliesTo.length === 0;
                      const on = all || g.appliesTo!.includes(o.id);
                      return (
                        <label key={o.id} className="acheck">
                          <input
                            type="checkbox"
                            checked={on}
                            onChange={(e) => {
                              const base = all ? p.options.map((x) => x.id) : g.appliesTo!;
                              const next = e.target.checked ? [...new Set([...base, o.id])] : base.filter((x) => x !== o.id);
                              setGroup(gi, { appliesTo: next.length === p.options.length || next.length === 0 ? undefined : next });
                            }}
                          />
                          {o.label || "(sem nome)"}
                        </label>
                      );
                    })}
                  </fieldset>
                )}
                <ul className="achoices">
                  {g.choices.map((c, ci) => (
                    <li key={c.id} className="achoice">
                      <TextField label={`Escolha ${ci + 1}`} value={c.label} max={60} onChange={(label) => setGroup(gi, { choices: g.choices.map((x, k) => (k === ci ? { ...x, label } : x)) })} />
                      <NumField label="Valor adicional (0 = incluso)" prefix="+ R$" value={c.price ?? 0} onChange={(price) => setGroup(gi, { choices: g.choices.map((x, k) => (k === ci ? { ...x, price: price || undefined } : x)) })} />
                      <button type="button" className="aicon aicon--danger" aria-label="Remover escolha" disabled={g.choices.length === 1} onClick={() => setGroup(gi, { choices: g.choices.filter((_, k) => k !== ci) })}>
                        <Trash2 size={18} />
                      </button>
                    </li>
                  ))}
                </ul>
                <button type="button" className="abtn abtn--ghost abtn--sm" onClick={() => setGroup(gi, { choices: [...g.choices, blankChoice()] })}>
                  <Plus size={16} aria-hidden="true" /> Adicionar escolha
                </button>
              </div>
            ))}
            <div className="atemplates">
              <p className="afield__label">Adicionar grupo:</p>
              {TEMPLATES.map((t) => (
                <button key={t.label} type="button" className="abtn abtn--ghost abtn--sm" onClick={() => set({ groups: [...groups, t.make()] })}>
                  <Plus size={16} aria-hidden="true" /> {t.label}
                </button>
              ))}
            </div>
            <TextField label="Texto do campo de recado (opcional)" hint="Aparece no campo de observação do item." value={p.notePlaceholder ?? ""} max={80} onChange={(notePlaceholder) => set({ notePlaceholder })} />
          </div>

          <div className="acard acard--flat">
            <h3 className="acard__title">Onde aparece</h3>
            <div className="agrid">
              <div className="afield">
                <label className="afield__label" htmlFor={`${uid}-cat`}>
                  Categoria
                </label>
                <select
                  id={`${uid}-cat`}
                  className="ainput"
                  value={loc.catId}
                  onChange={(e) => {
                    const c = categories.find((x) => x.id === e.target.value)!;
                    setLoc({ catId: c.id, groupId: c.groups[0]?.id ?? "" });
                  }}
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="afield">
                <label className="afield__label" htmlFor={`${uid}-grp`}>
                  Grupo dentro da categoria
                </label>
                <select id={`${uid}-grp`} className="ainput" value={loc.groupId} onChange={(e) => setLoc({ ...loc, groupId: e.target.value })}>
                  {category.groups.map((g, i) => (
                    <option key={g.id} value={g.id}>
                      {g.title || `Grupo ${i + 1}`}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        <footer className="adialog__foot">
          {tried && problems.length > 0 && (
            <ul className="aerror aerror--list" role="alert">
              {problems.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          )}
          <div className="adialog__btns">
            <button type="button" className="abtn abtn--ghost" onClick={() => ref.current?.close()}>
              Cancelar
            </button>
            <button type="button" className="abtn abtn--primary" onClick={save} disabled={uploading}>
              {isNew ? "Adicionar produto" : "Salvar produto"}
            </button>
          </div>
          <p className="afield__hint">Isto só vai para o site depois de tocar em Publicar.</p>
        </footer>
      </div>
    </dialog>
  );
}
