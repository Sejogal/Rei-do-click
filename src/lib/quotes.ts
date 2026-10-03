export interface Quote {
  id: string;
  text: string;
  author: string;
  language: "pt" | "en";
}

export const QUOTES: Quote[] = [
  {
    id: "q1",
    text: "A simplicidade é o último grau de sofisticação.",
    author: "Leonardo da Vinci",
    language: "pt",
  },
  {
    id: "q2",
    text: "Não é o mais forte que sobrevive, nem o mais inteligente, mas o que melhor se adapta às mudanças.",
    author: "Leon Megginson",
    language: "pt",
  },
  {
    id: "q3",
    text: "Programs must be written for people to read, and only incidentally for machines to execute.",
    author: "Harold Abelson",
    language: "en",
  },
  {
    id: "q4",
    text: "Talk is cheap. Show me the code.",
    author: "Linus Torvalds",
    language: "en",
  },
];

export function getRandomQuote(language: "pt" | "en" = "pt"): Quote {
  const filtered = QUOTES.filter((q) => q.language === language);
  return filtered[Math.floor(Math.random() * filtered.length)];
}