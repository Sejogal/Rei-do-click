import { type FormEvent, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ThemePicker } from "../components/ui/ThemePicker";
import { usersApi } from "../lib/api";
import { useAuth } from "../store/auth";

const upgradeWhatsAppNumber = "244941606790";

export function Settings() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState(user?.username ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [deletePassword, setDeletePassword] = useState("");
  const [showDeleteForm, setShowDeleteForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    setUsername(user?.username ?? "");
    setEmail(user?.email ?? "");
  }, [user?.email, user?.username]);

  const handleUpdateAccount = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const payload: { email?: string; username?: string; current_password?: string; new_password?: string } = {};
      if (email.trim() !== user.email) payload.email = email.trim();
      if (username.trim() !== user.username) payload.username = username.trim();
      if (newPassword) {
        payload.current_password = currentPassword;
        payload.new_password = newPassword;
      }
      const updated = await usersApi.updateMe(payload);
      useAuth.setState({ user: updated });
      setCurrentPassword("");
      setNewPassword("");
      setNotice("Dados da conta atualizados.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await usersApi.deleteMe(deletePassword);
      logout();
      navigate("/auth", { replace: true });
    } catch (e) {
      setError((e as Error).message);
      setSaving(false);
    }
  };

  if (!user) {
    return (
      <main className="mx-auto flex w-full max-w-3xl flex-1 items-center justify-center px-4 py-12">
        <section className="rounded-xl border border-sub/20 bg-surface/50 p-8 text-center">
          <h1 className="font-mono text-2xl text-accent">Definições</h1>
          <p className="mt-3 text-sm text-sub">Inicia sessão para gerir os dados da tua conta. Os temas continuam disponíveis nesta página.</p>
          <div className="mt-6"><ThemePicker /></div>
          <Link to="/auth" className="mt-6 inline-block font-mono text-sm text-accent hover:underline">Entrar</Link>
        </section>
      </main>
    );
  }

  const isPro = ["pro", "team"].includes(user.plan.trim().toLowerCase());
  const planName = isPro ? "Pro" : "Free";
  const upgradeMessage = `Olá! Gostaria de ${isPro ? "gerir o meu plano" : "atualizar para o plano Pro"} no Rei do Clique. Utilizador: ${user.username}`;

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-10">
      <header className="mb-8">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-sub">Conta</p>
        <h1 className="mt-2 font-mono text-3xl text-accent">Definições</h1>
        <p className="mt-2 text-sm text-sub">Personaliza o jogo e gere a tua conta e o teu plano.</p>
      </header>

      {error && <p role="alert" className="mb-5 rounded-lg border border-error/30 bg-error/5 px-4 py-3 font-mono text-sm text-error">{error}</p>}

      <section className="mb-6 rounded-xl border border-sub/20 bg-surface/50 p-6">
        <h2 className="font-mono text-lg text-text">Tema</h2>
        <p className="mt-1 text-sm text-sub">Escolhe as cores da interface. A preferência fica guardada neste dispositivo.</p>
        <div className="mt-4"><ThemePicker /></div>
      </section>

      <section className="mb-6 rounded-xl border border-sub/20 bg-surface/50 p-6">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <p className="font-mono text-xs uppercase tracking-wider text-sub">Plano atual</p>
            <h2 className="mt-1 font-mono text-2xl text-accent">{planName}</h2>
            <p className="mt-2 max-w-xl text-sm text-sub">Free permite criar salas até 4 jogadores. Pro é uma subscrição mensal e permite configurar salas até 20 jogadores.</p>
            {isPro && <p className="mt-2 text-sm text-sub">{user.plan_cancel_at_period_end ? "A subscrição termina em " : "Plano válido até "}{user.plan_expires_at ? new Date(user.plan_expires_at).toLocaleDateString("pt-PT", { dateStyle: "long" }) : "data não definida"}</p>}
          </div>
          <div className="flex flex-wrap gap-2 font-mono text-xs">
            <span className={`rounded-lg border px-3 py-2 ${!isPro ? "border-accent text-accent" : "border-sub/20 text-sub"}`}>Free · até 4</span>
            <span className={`rounded-lg border px-3 py-2 ${isPro ? "border-accent text-accent" : "border-sub/20 text-sub"}`}>Pro · até 20</span>
          </div>
        </div>
        <ul className="mt-5 grid gap-2 text-sm text-sub sm:grid-cols-2">
          <li className="rounded-lg bg-bg/50 px-3 py-2">Salas multiplayer para até 20 jogadores</li>
          <li className="rounded-lg bg-bg/50 px-3 py-2">Escolha do limite entre 2 e 20 jogadores</li>
        </ul>
        <a
          href={`https://wa.me/${upgradeWhatsAppNumber}?text=${encodeURIComponent(upgradeMessage)}`}
          target="_blank"
          rel="noreferrer"
          className="mt-5 inline-flex rounded-lg bg-accent px-4 py-2.5 font-mono text-xs text-bg transition-opacity hover:opacity-90"
        >
          {isPro ? "Solicitar renovação do meu plano" : "Atualizar o meu plano para Pro"}
        </a>
        <p className="mt-2 text-xs text-sub">Pagamento e ativação do plano são tratados pelo WhatsApp.</p>
      </section>

      <section className="mb-6 rounded-xl border border-sub/20 bg-surface/50 p-6">
        <h2 className="mb-5 font-mono text-lg text-text">Dados da conta</h2>
        <form onSubmit={handleUpdateAccount} className="grid gap-4 md:grid-cols-2">
          <label className="block font-mono text-xs text-sub">
            Nome de utilizador
            <input value={username} onChange={(event) => setUsername(event.target.value)} minLength={3} maxLength={50} required
              className="mt-2 w-full rounded-lg border border-sub/20 bg-bg px-3 py-2.5 text-sm text-text outline-none focus:border-accent" />
          </label>
          <label className="block font-mono text-xs text-sub">
            E-mail
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required
              className="mt-2 w-full rounded-lg border border-sub/20 bg-bg px-3 py-2.5 text-sm text-text outline-none focus:border-accent" />
          </label>
          <label className="block font-mono text-xs text-sub">
            Palavra-passe atual <span className="text-sub/70">(necessária para alterar a palavra-passe)</span>
            <input type="password" autoComplete="current-password" required={Boolean(newPassword)} value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)}
              className="mt-2 w-full rounded-lg border border-sub/20 bg-bg px-3 py-2.5 text-sm text-text outline-none focus:border-accent" />
          </label>
          <label className="block font-mono text-xs text-sub">
            Nova palavra-passe
            <input type="password" autoComplete="new-password" minLength={8} required={Boolean(currentPassword)} value={newPassword} onChange={(event) => setNewPassword(event.target.value)}
              className="mt-2 w-full rounded-lg border border-sub/20 bg-bg px-3 py-2.5 text-sm text-text outline-none focus:border-accent" />
          </label>
          <div className="flex flex-wrap items-center gap-3 md:col-span-2">
            <button type="submit" disabled={saving || (!newPassword && username.trim() === user.username && email.trim() === user.email)}
              className="rounded-lg bg-accent px-4 py-2.5 font-mono text-xs text-bg disabled:cursor-not-allowed disabled:opacity-40">
              {saving ? "a guardar..." : "Guardar alterações"}
            </button>
            {notice && <span role="status" className="font-mono text-xs text-accent">{notice}</span>}
          </div>
        </form>
        <div className="mt-6 border-t border-sub/15 pt-4">
          {!showDeleteForm ? (
            <button type="button" onClick={() => setShowDeleteForm(true)} className="font-mono text-xs text-error hover:underline">Apagar a minha conta</button>
          ) : (
            <form onSubmit={handleDeleteAccount} className="flex flex-wrap items-end gap-3">
              <p className="w-full text-xs text-error">A conta e os resultados associados serão apagados. O histórico de partidas será anonimizado.</p>
              <label className="min-w-56 flex-1 font-mono text-xs text-sub">
                Confirma com a tua palavra-passe
                <input type="password" autoComplete="current-password" required value={deletePassword} onChange={(event) => setDeletePassword(event.target.value)}
                  className="mt-2 w-full rounded-lg border border-sub/20 bg-bg px-3 py-2.5 text-sm text-text outline-none focus:border-error" />
              </label>
              <button type="submit" disabled={saving} className="rounded-lg border border-error/50 px-4 py-2.5 font-mono text-xs text-error disabled:opacity-40">Apagar conta definitivamente</button>
              <button type="button" onClick={() => { setShowDeleteForm(false); setDeletePassword(""); }} className="px-3 py-2.5 font-mono text-xs text-sub hover:text-text">Cancelar</button>
            </form>
          )}
        </div>
      </section>
    </main>
  );
}
