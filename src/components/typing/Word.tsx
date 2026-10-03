import { Char } from "./Char";
import type { WordData } from "../../types";

interface Props {
  data: WordData;
  activeChar: number | null;
  isPast: boolean;
}

export function Word({ data, activeChar, isPast }: Props) {
  return (
    <span className={isPast ? "opacity-50" : ""}>
      {data.chars.map((c, i) => (
        <Char key={i} data={c} active={activeChar === i} />
      ))}
    </span>
  );
}