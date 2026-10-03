import { Char } from "./Char";
import type { WordData } from "../../types";

interface Props {
  data: WordData;
  activeChar: number | null;
  isPast: boolean;
  setActiveRef: (el: HTMLElement | null) => void;
}

export function Word({ data, activeChar, isPast, setActiveRef }: Props) {
  return (
    <span className={`inline-block ${isPast ? "opacity-50" : ""}`}>
      {data.chars.map((c, i) => (
        <span
          key={i}
          ref={activeChar === i ? setActiveRef : undefined}
        >
          <Char data={c} />
        </span>
      ))}
    </span>
  );
}