import random


WORDS_PT = [
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
]

WORDS_EN = [
    "the", "be", "to", "of", "and", "a", "in", "that", "have", "i",
    "it", "for", "not", "on", "with", "he", "as", "you", "do", "at",
    "this", "but", "his", "by", "from", "they", "we", "say", "her", "she",
    "or", "an", "will", "my", "one", "all", "would", "there", "their", "what",
    "so", "up", "out", "if", "about", "who", "get", "which", "go", "me",
]

PUNCT = [",", ".", ";", ":", "!", "?", "-", "'"]
SURVIVAL_WORDS = ["extraordinario", "responsabilidade", "desenvolvimento", "computadores", "possibilidade", "conhecimento", "transformacao", "inacreditavel", "velocidade", "competicao", "estrategia", "concentracao", "persistencia", "programacao", "criatividade"]


def generate_race_text(
    word_count: int = 30,
    language: str = "pt",
    punctuation: bool = False,
    numbers: bool = False,
) -> str:
    base = WORDS_EN if language == "en" else WORDS_PT
    words: list[str] = []

    for _ in range(word_count):
        word = random.choice(base)

        if numbers and random.random() < 0.15:
            word = str(random.randint(0, 9999))
        elif punctuation and random.random() < 0.2:
            word += random.choice(PUNCT)

        words.append(word)

    if punctuation and words:
        words[0] = words[0][0].upper() + words[0][1:]

    return " ".join(words)


def generate_survival_text(words_per_level: int = 10, levels: int = 5) -> str:
    """Gera blocos progressivamente mais exigentes para o modo sobrevivência."""
    output: list[str] = []
    for level in range(levels):
        for _ in range(words_per_level):
            word = random.choice(SURVIVAL_WORDS if level >= 2 else WORDS_PT)
            if level >= 1 and random.random() < min(0.75, level * 0.18):
                word += random.choice(PUNCT)
            if level >= 3 and random.random() < 0.18:
                word = str(random.randint(100, 99999))
            output.append(word)
    if output:
        output[0] = output[0][0].upper() + output[0][1:]
    return " ".join(output)
