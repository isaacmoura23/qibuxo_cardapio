import { useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { api, ApiError } from "../api";
import { useToast } from "../ui";

export function AccountPage({ onLogout }: { onLogout: () => void }) {
  const toast = useToast();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [again, setAgain] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setErr("");
    if (next.length < 8) return setErr("A nova senha precisa ter pelo menos 8 caracteres.");
    if (next !== again) return setErr("A confirmação não é igual à nova senha.");
    setBusy(true);
    try {
      await api.changePassword(current, next);
      setCurrent("");
      setNext("");
      setAgain("");
      toast("Senha alterada.");
    } catch (x) {
      if (x instanceof ApiError && x.status === 401 && !/atual/i.test(x.message)) onLogout();
      else setErr(x instanceof Error ? x.message : "Não foi possível alterar a senha.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section aria-labelledby="conta-h" className="apage">
      <div className="apagehead">
        <h1 id="conta-h" className="adisplay apagehead__title">
          Conta
        </h1>
      </div>

      <form className="acard" onSubmit={submit}>
        <h2 className="acard__title">Trocar a senha</h2>
        <p className="amuted">Use pelo menos 8 caracteres. Depois de trocar, a senha antiga deixa de valer.</p>
        <div className="afield">
          <label className="afield__label" htmlFor="pw-cur">
            Senha atual
          </label>
          <input id="pw-cur" className="ainput" type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} />
        </div>
        <div className="afield">
          <label className="afield__label" htmlFor="pw-new">
            Nova senha
          </label>
          <input id="pw-new" className="ainput" type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} />
        </div>
        <div className="afield">
          <label className="afield__label" htmlFor="pw-again">
            Repita a nova senha
          </label>
          <input id="pw-again" className="ainput" type="password" autoComplete="new-password" value={again} onChange={(e) => setAgain(e.target.value)} />
        </div>
        {err && (
          <p className="aerror" role="alert">
            {err}
          </p>
        )}
        <button type="submit" className="abtn abtn--primary" disabled={busy || !current || !next || !again}>
          {busy && <Loader2 size={18} className="spin" aria-hidden="true" />} Trocar senha
        </button>
      </form>

      <div className="acard">
        <h2 className="acard__title">Segurança</h2>
        <ul className="alist">
          <li>O acesso expira sozinho depois de 7 dias.</li>
          <li>Depois de 5 senhas erradas, o painel trava por 15 minutos.</li>
          <li>Os pedidos (nome, telefone e endereço dos clientes) ficam guardados em armazenamento privado.</li>
        </ul>
      </div>
    </section>
  );
}
