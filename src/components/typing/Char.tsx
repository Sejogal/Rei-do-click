import clsx from "clsx";
import type { CharData } from "../../types";

export function Char({ data, active }: { data: CharData; active: boolean }) {
  return (
    <span
      className={clsx(
        "relative",
        data.state === "pending" && "text-sub",
        data.state === "correct" && "text-text",
        data.state === "incorrect" && "text-error",
        data.state === "extra" && "text-error opacity-70"
      )}
    >
      {active && (
        <span className="absolute -left-[1px] top-0 h-full w-[2px] bg-accent animate-pulse" />
      )}
      {data.char}
    </span>
  );
}