const WORDS = [
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

export function generateWords(count: number): string[] {
  const result: string[] = [];
  for (let i = 0; i < count; i++) {
    result.push(WORDS[Math.floor(Math.random() * WORDS.length)]);
  }
  return result;
}