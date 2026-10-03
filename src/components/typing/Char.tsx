import clsx from "clsx";
import type { CharData } from "../../types";

export function Char({ data }: { data: CharData }) {
  return (
    <span
      className={clsx(
        data.state === "pending" && "text-sub",
        data.state === "correct" && "text-text",
        data.state === "incorrect" && "text-error",
        data.state === "extra" && "text-error opacity-70"
      )}
    >
      {data.char}
    </span>
  );
}