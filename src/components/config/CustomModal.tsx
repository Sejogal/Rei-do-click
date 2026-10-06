import { useState } from "react";
import { useConfig } from "../../store/config";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function CustomModal({ open, onClose }: Props) {
  const { config, update } = useConfig();
  const [text, setText] = useState(config.customText ?? "");

  if (!open) return null;

  const handleSave = () => {
    if (!text.trim()) return;
    update({ customText: text.trim(), source: "custom" });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-bg/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-surface rounded-lg p-6 w-full max-w-2xl">
        <h2 className="text-accent font-mono text-lg mb-4">Texto custom</h2>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Cola ou escreve o teu texto aqui..."
          className="w-full h-48 bg-bg text-text font-mono text-sm p-3 rounded border border-sub/20 focus:border-accent outline-none resize-none"
          autoFocus
        />
        <div className="flex justify-end gap-3 mt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sub hover:text-text font-mono text-sm"
          >
            cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={!text.trim()}
            className="px-4 py-2 bg-accent text-bg rounded font-mono text-sm disabled:opacity-40"
          >
            guardar
          </button>
        </div>
      </div>
    </div>
  );
}