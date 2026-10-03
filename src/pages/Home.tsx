import { TypingTest } from "../components/typing/TypingTest";
import { ConfigBar } from "../components/config/ConfigBar";

export function Home() {
  return (
    <main className="flex-1 flex flex-col items-center pt-24 pb-10">
      <ConfigBar />
      <TypingTest />
    </main>
  );
}