const WORDS_PT = [
  "o", "a", "de", "que", "e", "do", "da", "em", "um", "para",
  "com", "não", "uma", "os", "no", "se", "na", "por", "mais", "as",
  "dos", "como", "mas", "ao", "ele", "das", "à", "seu", "sua", "ou",
  "quando", "muito", "nos", "já", "está", "eu", "também", "só", "pelo", "pela",
  "até", "isso", "ela", "entre", "depois", "sem", "mesmo", "aos", "seus", "quem",
  "nas", "me", "esse", "eles", "você", "essa", "num", "nem", "suas", "meu",
  "às", "minha", "numa", "pelos", "elas", "qual", "nós", "lhe", "deles", "essas",
  "esses", "pelas", "este", "dele", "tu", "te", "vocês", "vos", "lhes", "meus",
  "minhas", "teu", "tua", "teus", "tuas", "nosso", "nossa", "nossos", "nossas",
  "dela", "delas", "esta", "estes", "estas", "aquele", "aquela", "aqueles", "aquelas",
  "isto", "aquilo", "estou", "estamos", "estive", "esteve", "estivemos", "fazer",
  "vai", "vou", "vamos", "ter", "tem", "tinha", "foi", "ser", "são", "era",
];

const WORDS_EN = [
  "the", "be", "to", "of", "and", "a", "in", "that", "have", "i",
  "it", "for", "not", "on", "with", "he", "as", "you", "do", "at",
  "this", "but", "his", "by", "from", "they", "we", "say", "her", "she",
  "or", "an", "will", "my", "one", "all", "would", "there", "their", "what",
  "so", "up", "out", "if", "about", "who", "get", "which", "go", "me",
];

export function generateWords(
  count: number,
  opts: { language?: "pt" | "en"; punctuation?: boolean; numbers?: boolean } = {}
): string[] {
  const { language = "pt", punctuation = false, numbers = false } = opts;
  const base = language === "en" ? WORDS_EN : WORDS_PT;
  const result: string[] = [];

  for (let i = 0; i < count; i++) {
    let word = base[Math.floor(Math.random() * base.length)];

    if (numbers && Math.random() < 0.15) {
      word = String(Math.floor(Math.random() * 10000));
    } else if (punctuation && Math.random() < 0.2) {
      const p = PUNCT[Math.floor(Math.random() * PUNCT.length)];
      word = word + p;
    }

    result.push(word);
  }

  // Capitaliza início de frase (simples)
  if (punctuation && result[0]) {
    result[0] = result[0][0].toUpperCase() + result[0].slice(1);
  }

  return result;
}