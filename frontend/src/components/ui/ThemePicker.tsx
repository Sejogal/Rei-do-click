import { useTheme, type Theme } from "../../store/theme";

const themes: { id: Theme; label: string; colors: string[] }[] = [
  { id: "default", label: "MonkeyType", colors: ["#0f0f10", "#1a1a1c", "#e2b714"] },
  { id: "dracula", label: "Dracula", colors: ["#282a36", "#44475a", "#bd93f9"] },
  { id: "nord", label: "Nord", colors: ["#2e3440", "#3b4252", "#88c0d0"] },
  { id: "light", label: "Claro", colors: ["#f5f5f5", "#ffffff", "#c89600"] },
  { id: "cyberpunk", label: "Cyberpunk", colors: ["#0a0a1e", "#141432", "#ff00c8"] },
];

export function ThemePicker() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3" role="group" aria-label="Temas da interface">
      {themes.map((item) => (
        <button
          key={item.id}
          type="button"
          aria-pressed={theme === item.id}
          onClick={() => setTheme(item.id)}
          className={`flex items-center justify-between rounded-lg border px-3 py-3 text-left transition-colors ${theme === item.id ? "border-accent bg-accent/5 text-accent" : "border-sub/20 bg-bg/40 text-text hover:border-accent/40"}`}
        >
          <span className="font-mono text-xs">{item.label}{theme === item.id ? " · ativo" : ""}</span>
          <span className="flex gap-1" aria-hidden="true">
            {item.colors.map((color) => <i key={color} className="size-4 rounded-full border border-black/20" style={{ backgroundColor: color }} />)}
          </span>
        </button>
      ))}
    </div>
  );
}
