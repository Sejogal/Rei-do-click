import { useEffect, useState } from "react";

interface Props {
  targetRef: HTMLElement | null;
}

export function Caret({ targetRef }: Props) {
  const [pos, setPos] = useState({ left: 0, top: 0, height: 0 });

  useEffect(() => {
    if (!targetRef) return;
    const rect = targetRef.getBoundingClientRect();
    const parentRect = targetRef.offsetParent?.getBoundingClientRect();
    if (!parentRect) return;

    setPos({
      left: rect.left - parentRect.left,
      top: rect.top - parentRect.top,
      height: rect.height,
    });
  }, [targetRef]);

  return (
    <div
      className="pointer-events-none absolute w-[2px] bg-accent rounded-full transition-all duration-100 ease-out"
      style={{
        left: pos.left,
        top: pos.top,
        height: pos.height,
      }}
    />
  );
}
