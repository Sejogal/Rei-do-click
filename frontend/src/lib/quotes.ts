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
  { id: "q5", text: "Premature optimization is the root of all evil.", author: "Donald Knuth", language: "en" },
  { id: "q6", text: "Simplicity is prerequisite for reliability.", author: "Edsger W. Dijkstra", language: "en" },
  { id: "q7", text: "Any fool can write code that a computer can understand. Good programmers write code that humans can understand.", author: "Martin Fowler", language: "en" },
  { id: "q8", text: "Make it work, make it right, make it fast.", author: "Kent Beck", language: "en" },
  { id: "q9", text: "Everyone knows that debugging is twice as hard as writing a program in the first place.", author: "Brian Kernighan", language: "en" },
  { id: "q10", text: "The best way to predict the future is to invent it.", author: "Alan Kay", language: "en" },
  { id: "q11", text: "Controlling complexity is the essence of computer programming.", author: "Brian Kernighan", language: "en" },
  { id: "q12", text: "Software is eating the world.", author: "Marc Andreessen", language: "en" },
  { id: "q13", text: "The only way to do great work is to love what you do.", author: "Steve Jobs", language: "en" },
  { id: "q14", text: "Imagination is more important than knowledge.", author: "Albert Einstein", language: "en" },
  { id: "q15", text: "There are only two hard things in Computer Science: cache invalidation and naming things.", author: "Phil Karlton", language: "en" },
  { id: "q16", text: "Code is like humor. When you have to explain it, it's bad.", author: "Cory House", language: "en" },
  { id: "q17", text: "Before software can be reusable it first has to be usable.", author: "Ralph Johnson", language: "en" },
  { id: "q18", text: "The function of good software is to make the complex appear to be simple.", author: "Grady Booch", language: "en" },
  { id: "q19", text: "Simplicity is the soul of efficiency.", author: "Austin Freeman", language: "en" },
  { id: "q20", text: "Always code as if the guy who ends up maintaining your code will be a violent psychopath who knows where you live.", author: "John Woods", language: "en" },
  { id: "q21", text: "Education is the most powerful weapon which you can use to change the world.", author: "Nelson Mandela", language: "en" },
  { id: "q22", text: "Perfection is achieved, not when there is nothing more to add, but when there is nothing left to take away.", author: "Antoine de Saint-Exupéry", language: "en" },
  { id: "q23", text: "Penso, logo existo.", author: "René Descartes", language: "pt" },
  { id: "q24", text: "Tudo vale a pena se a alma não é pequena.", author: "Fernando Pessoa", language: "pt" },
  { id: "q25", text: "Navegar é preciso; viver não é preciso.", author: "Fernando Pessoa", language: "pt" },
  { id: "q26", text: "Sê todo em cada coisa. Põe quanto és no mínimo que fazes.", author: "Ricardo Reis", language: "pt" },
  { id: "q27", text: "Há mais coisas no céu e na terra do que sonha a nossa filosofia.", author: "William Shakespeare", language: "pt" },
  { id: "q28", text: "Se queres ir rápido, vai sozinho. Se queres ir longe, vai acompanhado.", author: "Provérbio africano", language: "pt" },
  { id: "q29", text: "É preciso uma aldeia inteira para educar uma criança.", author: "Provérbio africano", language: "pt" },
  { id: "q30", text: "Um povo sem conhecimento do seu passado, origem e cultura é como uma árvore sem raízes.", author: "Marcus Garvey", language: "pt" },
  { id: "q31", text: "A educação é a arma mais poderosa que podes usar para mudar o mundo.", author: "Nelson Mandela", language: "pt" },
  { id: "q32", text: "Água mole em pedra dura, tanto bate até que fura.", author: "Provérbio popular", language: "pt" },
  { id: "q33", text: "Devagar se vai ao longe.", author: "Provérbio popular", language: "pt" },
  { id: "q34", text: "Quem não arrisca não petisca.", author: "Provérbio popular", language: "pt" },
  { id: "q35", text: "A perfeição alcança-se, não quando não há mais nada a acrescentar, mas quando não há mais nada a retirar.", author: "Antoine de Saint-Exupéry", language: "pt" },
  { id: "q36", text: "A imaginação é mais importante que o conhecimento.", author: "Albert Einstein", language: "pt" },
  { id: "q37", text: "Antes de o software poder ser reutilizável, tem de ser utilizável.", author: "Ralph Johnson", language: "pt" },
  { id: "q38", text: "Controlar a complexidade é a essência da programação.", author: "Brian Kernighan", language: "pt" },
  { id: "q39", text: "O código é como o humor: quando tens de o explicar, é mau.", author: "Cory House", language: "pt" },
  { id: "q40", text: "A melhor forma de prever o futuro é inventá-lo.", author: "Alan Kay", language: "pt" },
];

export function getRandomQuote(language: "pt" | "en" = "pt"): Quote {
  const filtered = QUOTES.filter((q) => q.language === language);
  return filtered[Math.floor(Math.random() * filtered.length)];
}