export interface CodeSnippet {
  id: string;
  language: "python" | "javascript";
  text: string;
}

export const SNIPPETS: CodeSnippet[] = [
  {
    id: "py1",
    language: "python",
    text: `def fibonacci(n):\n    a, b = 0, 1\n    for _ in range(n):\n        yield a\n        a, b = b, a + b`,
  },
  {
    id: "js1",
    language: "javascript",
    text: `const debounce = (fn, delay) => {\n  let timer;\n  return (...args) => {\n    clearTimeout(timer);\n    timer = setTimeout(() => fn(...args), delay);\n  };\n};`,
  },
  {
    id: "py2",
    language: "python",
    text: `class Stack:\n    def __init__(self):\n        self._items = []\n\n    def push(self, item):\n        self._items.append(item)\n\n    def pop(self):\n        return self._items.pop()`,
  },
];

export function getRandomSnippet(): CodeSnippet {
  return SNIPPETS[Math.floor(Math.random() * SNIPPETS.length)];
}