import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { CatalogData } from "../types";
import { api, ApiError } from "./api";
import { useToast } from "./ui";

interface DraftApi {
  draft: CatalogData;
  setDraft: (fn: (d: CatalogData) => CatalogData) => void;
  dirty: boolean;
  saving: boolean;
  seeded: boolean;
  save: () => Promise<void>;
  discard: () => void;
}

const Ctx = createContext<DraftApi | null>(null);

export function DraftProvider({ children, onExpired }: { children: ReactNode; onExpired: () => void }) {
  const toast = useToast();
  const [base, setBase] = useState<CatalogData | null>(null);
  const [draft, setDraftState] = useState<CatalogData | null>(null);
  const [etag, setEtag] = useState<string | null>(null);
  const [seeded, setSeeded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const r = await api.getCatalog();
      setBase(r.data);
      setDraftState(r.data);
      setEtag(r.etag);
      setSeeded(r.seeded);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) onExpired();
      else setLoadError(e instanceof Error ? e.message : "Erro ao carregar");
    }
  }, [onExpired]);

  useEffect(() => {
    void load();
  }, [load]);

  const dirty = useMemo(() => !!base && !!draft && (seeded || JSON.stringify(base) !== JSON.stringify(draft)), [base, draft, seeded]);

  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [dirty]);

  const save = useCallback(async () => {
    if (!draft || saving) return;
    setSaving(true);
    try {
      const r = await api.saveCatalog(draft, etag);
      setBase(r.data);
      setDraftState(r.data);
      setEtag(r.etag);
      setSeeded(false);
      toast("Publicado! O site já mostra as mudanças.");
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) onExpired();
      else toast(e instanceof Error ? e.message : "Não foi possível publicar.", "error");
    } finally {
      setSaving(false);
    }
  }, [draft, etag, saving, toast, onExpired]);

  const api2 = useMemo<DraftApi | null>(
    () =>
      draft && base
        ? {
            draft,
            setDraft: (fn) => setDraftState((d) => (d ? fn(d) : d)),
            dirty,
            saving,
            seeded,
            save,
            discard: () => setDraftState(base),
          }
        : null,
    [draft, base, dirty, saving, seeded, save],
  );

  if (loadError) {
    return (
      <div className="acenter">
        <p className="aerror">{loadError}</p>
        <button type="button" className="abtn" onClick={() => void load()}>
          Tentar de novo
        </button>
      </div>
    );
  }
  if (!api2) return <div className="acenter">Carregando…</div>;
  return <Ctx.Provider value={api2}>{children}</Ctx.Provider>;
}

export function useDraft(): DraftApi {
  const v = useContext(Ctx);
  if (!v) throw new Error("useDraft fora do DraftProvider");
  return v;
}
