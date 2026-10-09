import { useNotifications } from "../../store/notifications";

export function ToastViewport() {
  const { toasts, dismissToast } = useNotifications();
  const tone: Record<string, string> = { info: "border-accent/40 text-accent", success: "border-green-400/40 text-green-300", warning: "border-yellow-400/40 text-yellow-200", error: "border-error/40 text-error" };
  return <div className="fixed bottom-4 right-4 z-[100] grid w-[min(24rem,calc(100vw-2rem))] gap-2">{toasts.map((item) => <div key={item.id} role="status" className={`flex items-start justify-between gap-3 rounded-lg border bg-bg p-4 font-mono text-xs shadow-xl animate-[slideIn_0.25s_ease-out] ${tone[item.kind]}`}><span>{item.message}</span><button aria-label="Fechar notificação" onClick={() => dismissToast(item.id)} className="text-sub hover:text-text">×</button></div>)}</div>;
}
