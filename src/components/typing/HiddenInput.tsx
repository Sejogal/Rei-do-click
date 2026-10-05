import { forwardRef } from "react";

interface Props {
  onInput: (value: string) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

export const HiddenInput = forwardRef<HTMLInputElement, Props>(
  ({ onInput, onKeyDown }, ref) => {
    return (
      <input
        ref={ref}
        type="text"
        inputMode="text"
        autoCapitalize="off"
        autoCorrect="off"
        autoComplete="off"
        spellCheck={false}
        onInput={(e) => {
          const target = e.target as HTMLInputElement;
          const value = target.value;
          if (value) {
            onInput(value);
            target.value = "";
          }
        }}
        onKeyDown={onKeyDown}
        className="absolute opacity-0 pointer-events-none w-0 h-0"
        style={{ caretColor: "transparent" }}
        aria-label="Digitação"
      />
    );
  }
);

HiddenInput.displayName = "HiddenInput";