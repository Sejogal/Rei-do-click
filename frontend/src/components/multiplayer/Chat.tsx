import { useEffect, useRef, useState, type FormEvent } from "react";
import { useMultiplayer } from "../../store/multiplayer";

export function Chat() {
  const { messages, sendChat, myId } = useMultiplayer();
  const [text, setText] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  // Auto-scroll para o fim
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    sendChat(trimmed);
    setText("");
  };

  return (
    <div className="bg-surface/50 rounded-lg p-4">
      <p className="text-sub text-xs font-mono mb-2">chat</p>

      <div
        ref={listRef}
        className="h-32 overflow-y-auto space-y-1 mb-3 pr-2"
      >
        {messages.length === 0 && (
          <p className="text-sub/50 text-xs font-mono">sem mensagens</p>
        )}
        {messages.map((m) => (
          <div key={m.id} className="font-mono text-xs">
            <span
              className={m.player_id === myId ? "text-accent" : "text-text"}
            >
              {m.username}
            </span>
            <span className="text-sub/50"> {"\u00b7"} </span>
            <span className="text-text/80">{m.text}</span>
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="diz algo..."
          maxLength={200}
          className="flex-1 bg-bg text-text font-mono text-xs p-2 rounded border border-sub/20 focus:border-accent outline-none"
        />
        <button
          type="submit"
          disabled={!text.trim()}
          className="px-3 py-2 bg-accent text-bg font-mono text-xs rounded disabled:opacity-30"
        >
          enviar
        </button>
      </form>
    </div>
  );
}
