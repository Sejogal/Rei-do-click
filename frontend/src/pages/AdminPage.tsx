import { type FormEvent, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { adminApi, type AdminUserResponse } from "../lib/api";
import { useAuth } from "../store/auth";

const dateLabel = (value: string | null) => value
  ? new Date(value).toLocaleDateString("pt-PT", { dateStyle: "medium" })
  : "—";

export function AdminPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState<AdminUserResponse[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [create, setCreate] = useState({ email: "", username: "", password: "", is_admin: false });
  const [drafts, setDrafts] = useState<Record<string, { email: string; username: string; new_password: string; is_active: boolean; is_admin: boolean }>>({});

  const loadUsers = async () => {
    setLoading(true);
    setError("");
    try {
      const rows = await adminApi.listUsers();
      setUsers(rows);
      setDrafts(Object.fromEntries(rows.map((row) => [row.id, {
        email: row.email, username: row.username, new_password: "", is_active: row.is_active, is_admin: row.is_admin,
      }])));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadUsers(); }, []);

  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    return users.filter((item) => !needle || `${item.username} ${item.email}`.toLocaleLowerCase().includes(needle));
  }, [users, query]);

  const updateDraft = (id: string, field: keyof (typeof drafts)[string], value: string | boolean) => {
    setDrafts((current) => ({ ...current, [id]: { ...current[id], [field]: value } }));
  };

  const run = async (id: string, action: () => Promise<unknown>, success: string) => {
    setBusyId(id); setError(""); setNotice("");
    try { await action(); await loadUsers(); setNotice(success); }
    catch (e) { setError((e as Error).message); }
    finally { setBusyId(null); }
  };

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setBusyId("create"); setError(""); setNotice("");
    try {
      await adminApi.createUser(create);
      setCreate({ email: "", username: "", password: "", is_admin: false });
      await loadUsers(); setNotice("Conta criada.");
    } catch (e) { setError((e as Error).message); }
    finally { setBusyId(null); }
  };

  if (!user?.is_admin) return <main className="mx-auto max-w-2xl flex-1 px-4 py-16 text-center">
    <h1 className="font-mono text-2xl text-accent">Acesso reservado</h1>
    <p className="mt-3 text-sub">Esta área está disponível apenas para administradores.</p>
    <Link className="mt-5 inline-block text-accent hover:underline" to="/">Voltar ao jogo</Link>
  </main>;

  return <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-10">
    <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div><p className="font-mono text-xs uppercase tracking-[0.2em] text-sub">Plataforma</p>
        <h1 className="mt-2 font-mono text-3xl text-accent">Administração</h1>
        <p className="mt-2 text-sm text-sub">Contas, acessos e subscrições mensais do plano Pro.</p></div>
      <button onClick={() => void loadUsers()} className="rounded-lg border border-sub/20 px-4 py-2 font-mono text-xs text-text hover:border-accent">Atualizar lista</button>
    </header>
    {error && <p role="alert" className="mb-4 rounded-lg border border-error/30 px-4 py-3 text-sm text-error">{error}</p>}
    {notice && <p role="status" className="mb-4 rounded-lg border border-accent/30 px-4 py-3 text-sm text-accent">{notice}</p>}

    <section className="mb-8 rounded-xl border border-sub/20 bg-surface/50 p-5">
      <h2 className="mb-4 font-mono text-lg text-text">Criar utilizador</h2>
      <form onSubmit={handleCreate} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <input aria-label="Nome de utilizador" placeholder="Nome de utilizador" minLength={3} maxLength={50} required value={create.username} onChange={(e) => setCreate({ ...create, username: e.target.value })} className="rounded-lg border border-sub/20 bg-bg px-3 py-2 text-sm text-text" />
        <input aria-label="E-mail" type="email" placeholder="E-mail" required value={create.email} onChange={(e) => setCreate({ ...create, email: e.target.value })} className="rounded-lg border border-sub/20 bg-bg px-3 py-2 text-sm text-text" />
        <input aria-label="Palavra-passe inicial" type="password" placeholder="Palavra-passe inicial (8+ caracteres)" minLength={8} maxLength={128} required value={create.password} onChange={(e) => setCreate({ ...create, password: e.target.value })} className="rounded-lg border border-sub/20 bg-bg px-3 py-2 text-sm text-text" />
        <div className="flex items-center justify-between gap-3"><label className="flex items-center gap-2 text-xs text-sub"><input type="checkbox" checked={create.is_admin} onChange={(e) => setCreate({ ...create, is_admin: e.target.checked })} /> Administrador</label>
          <button disabled={busyId === "create"} className="rounded-lg bg-accent px-4 py-2 font-mono text-xs text-bg disabled:opacity-50">Criar conta</button></div>
      </form>
    </section>

    <section className="rounded-xl border border-sub/20 bg-surface/50 p-5">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><h2 className="font-mono text-lg text-text">Utilizadores <span className="text-sm text-sub">({users.length})</span></h2>
        <input aria-label="Pesquisar utilizadores" placeholder="Pesquisar nome ou e-mail" value={query} onChange={(e) => setQuery(e.target.value)} className="w-full max-w-sm rounded-lg border border-sub/20 bg-bg px-3 py-2 text-sm text-text" /></div>
      {loading ? <p className="py-8 text-center text-sm text-sub">A carregar utilizadores…</p> : filtered.length === 0 ? <p className="py-8 text-center text-sm text-sub">Nenhum utilizador encontrado.</p> :
        <div className="grid gap-4">{filtered.map((item) => {
          const draft = drafts[item.id];
          const paid = item.plan === "pro" || item.plan === "team";
          const isBusy = busyId === item.id;
          return <article key={item.id} className="rounded-lg border border-sub/15 bg-bg/40 p-4">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div><h3 className="font-mono text-base text-text">{item.username}</h3><p className="text-xs text-sub">Criado em {dateLabel(item.created_at)}</p></div>
              <div className="flex gap-2"><span className={`rounded-full px-3 py-1 text-xs ${item.is_active ? "bg-accent/10 text-accent" : "bg-error/10 text-error"}`}>{item.is_active ? "Ativo" : "Desativado"}</span><span className="rounded-full bg-sub/10 px-3 py-1 text-xs text-sub">{item.is_admin ? "Admin" : "Utilizador"}</span></div>
            </div>
            {draft && <>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <label className="text-xs text-sub">Nome<input value={draft.username} onChange={(e) => updateDraft(item.id, "username", e.target.value)} className="mt-1 w-full rounded border border-sub/20 bg-bg px-2 py-2 text-sm text-text" /></label>
                <label className="text-xs text-sub">E-mail<input type="email" value={draft.email} onChange={(e) => updateDraft(item.id, "email", e.target.value)} className="mt-1 w-full rounded border border-sub/20 bg-bg px-2 py-2 text-sm text-text" /></label>
                <label className="text-xs text-sub">Nova palavra-passe<input type="password" minLength={8} placeholder="Opcional" value={draft.new_password} onChange={(e) => updateDraft(item.id, "new_password", e.target.value)} className="mt-1 w-full rounded border border-sub/20 bg-bg px-2 py-2 text-sm text-text" /></label>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-sub"><label className="flex items-center gap-2"><input type="checkbox" checked={draft.is_active} onChange={(e) => updateDraft(item.id, "is_active", e.target.checked)} /> Ativo</label><label className="flex items-center gap-2"><input type="checkbox" checked={draft.is_admin} onChange={(e) => updateDraft(item.id, "is_admin", e.target.checked)} /> Admin</label></div>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button disabled={isBusy || draft.username.length < 3 || (draft.new_password !== "" && draft.new_password.length < 8)} onClick={() => void run(item.id, () => adminApi.updateUser(item.id, draft), "Dados do utilizador atualizados.")} className="rounded border border-accent/40 px-3 py-2 font-mono text-xs text-accent disabled:opacity-40">Guardar conta</button>
                <span className="text-xs text-sub">Plano: <strong className="uppercase text-text">{paid ? "Pro" : "Free"}</strong>{paid && <> · válido até {dateLabel(item.plan_expires_at)}{item.plan_cancel_at_period_end ? " · termina no fim do período" : ""}</>}</span>
                {!paid ? <button disabled={isBusy} onClick={() => void run(item.id, () => adminApi.manageSubscription(item.id, { action: "activate", plan: "pro" }), "Plano Pro ativado por um mês.")} className="rounded border border-accent/40 px-3 py-2 font-mono text-xs text-accent disabled:opacity-40">Ativar Pro · 1 mês</button> : <>
                  <button disabled={isBusy} onClick={() => void run(item.id, () => adminApi.manageSubscription(item.id, { action: "renew" }), "Plano renovado por mais um mês.")} className="rounded border border-accent/40 px-3 py-2 font-mono text-xs text-accent disabled:opacity-40">Renovar · 1 mês</button>
                  {item.plan_cancel_at_period_end ? <button disabled={isBusy} onClick={() => void run(item.id, () => adminApi.manageSubscription(item.id, { action: "resume" }), "Renovação retomada.")} className="rounded border border-sub/30 px-3 py-2 font-mono text-xs text-text disabled:opacity-40">Retomar renovação</button> : <button disabled={isBusy} onClick={() => void run(item.id, () => adminApi.manageSubscription(item.id, { action: "cancel" }), "Cancelamento agendado para o fim do período.")} className="rounded border border-sub/30 px-3 py-2 font-mono text-xs text-sub disabled:opacity-40">Cancelar no fim do período</button>}
                  <button disabled={isBusy} onClick={() => { if (window.confirm(`Terminar imediatamente o plano Pro de ${item.username}?`)) void run(item.id, () => adminApi.manageSubscription(item.id, { action: "revoke" }), "Plano Pro terminado imediatamente."); }} className="rounded border border-error/30 px-3 py-2 font-mono text-xs text-error disabled:opacity-40">Terminar agora</button>
                </>}
                <button disabled={isBusy || item.id === user.id} onClick={() => { if (window.confirm(`Apagar a conta de ${item.username}?`)) void run(item.id, () => adminApi.deleteUser(item.id), "Conta apagada."); }} className="ml-auto rounded border border-error/30 px-3 py-2 font-mono text-xs text-error disabled:opacity-30">Apagar</button>
              </div>
            </>}
          </article>;
        })}</div>}
    </section>
  </main>;
}
