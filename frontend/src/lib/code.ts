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
  {
    id: "py3",
    language: "python",
    text: `def is_palindrome(s):\n    s = ''.join(c.lower() for c in s if c.isalnum())\n    return s == s[::-1]`,
  },
  {
    id: "py4",
    language: "python",
    text: `def binary_search(arr, target):\n    lo, hi = 0, len(arr) - 1\n    while lo <= hi:\n        mid = (lo + hi) // 2\n        if arr[mid] == target:\n            return mid\n        if arr[mid] < target:\n            lo = mid + 1\n        else:\n            hi = mid - 1\n    return -1`,
  },
  {
    id: "py5",
    language: "python",
    text: `def quicksort(arr):\n    if len(arr) <= 1:\n        return arr\n    pivot = arr[len(arr) // 2]\n    left = [x for x in arr if x < pivot]\n    mid = [x for x in arr if x == pivot]\n    right = [x for x in arr if x > pivot]\n    return quicksort(left) + mid + quicksort(right)`,
  },
  {
    id: "py6",
    language: "python",
    text: `def gcd(a, b):\n    while b:\n        a, b = b, a % b\n    return a`,
  },
  {
    id: "py7",
    language: "python",
    text: `def is_prime(n):\n    if n < 2:\n        return False\n    for i in range(2, int(n ** 0.5) + 1):\n        if n % i == 0:\n            return False\n    return True`,
  },
  {
    id: "py8",
    language: "python",
    text: `def flatten(items):\n    for item in items:\n        if isinstance(item, list):\n            yield from flatten(item)\n        else:\n            yield item`,
  },
  {
    id: "py9",
    language: "python",
    text: `from collections import Counter\n\ndef word_count(text):\n    return Counter(text.lower().split())`,
  },
  {
    id: "py10",
    language: "python",
    text: `def memoize(fn):\n    cache = {}\n\n    def wrapper(*args):\n        if args not in cache:\n            cache[args] = fn(*args)\n        return cache[args]\n\n    return wrapper`,
  },
  {
    id: "py11",
    language: "python",
    text: `def chunk(lst, size):\n    for i in range(0, len(lst), size):\n        yield lst[i:i + size]`,
  },
  {
    id: "py12",
    language: "python",
    text: `class Queue:\n    def __init__(self):\n        self._items = []\n\n    def enqueue(self, item):\n        self._items.append(item)\n\n    def dequeue(self):\n        return self._items.pop(0)`,
  },
  {
    id: "js2",
    language: "javascript",
    text: `const throttle = (fn, limit) => {\n  let waiting = false;\n  return (...args) => {\n    if (waiting) return;\n    fn(...args);\n    waiting = true;\n    setTimeout(() => (waiting = false), limit);\n  };\n};`,
  },
  {
    id: "js3",
    language: "javascript",
    text: `const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));`,
  },
  {
    id: "js4",
    language: "javascript",
    text: `const groupBy = (arr, key) =>\n  arr.reduce((acc, item) => {\n    (acc[item[key]] ||= []).push(item);\n    return acc;\n  }, {});`,
  },
  {
    id: "js5",
    language: "javascript",
    text: `const unique = (arr) => [...new Set(arr)];`,
  },
  {
    id: "js6",
    language: "javascript",
    text: `const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);`,
  },
  {
    id: "js7",
    language: "javascript",
    text: `const chunk = (arr, size) =>\n  Array.from({ length: Math.ceil(arr.length / size) }, (_, i) =>\n    arr.slice(i * size, i * size + size)\n  );`,
  },
  {
    id: "js8",
    language: "javascript",
    text: `const compose = (...fns) => (x) => fns.reduceRight((acc, fn) => fn(acc), x);`,
  },
  {
    id: "js9",
    language: "javascript",
    text: `const once = (fn) => {\n  let called = false;\n  let result;\n  return (...args) => {\n    if (!called) {\n      called = true;\n      result = fn(...args);\n    }\n    return result;\n  };\n};`,
  },
  {
    id: "js10",
    language: "javascript",
    text: `const retry = async (fn, times = 3) => {\n  for (let i = 0; i < times; i++) {\n    try {\n      return await fn();\n    } catch (err) {\n      if (i === times - 1) throw err;\n    }\n  }\n};`,
  },
  {
    id: "js11",
    language: "javascript",
    text: `const memoize = (fn) => {\n  const cache = new Map();\n  return (n) => {\n    if (!cache.has(n)) cache.set(n, fn(n));\n    return cache.get(n);\n  };\n};`,
  },
  {
    id: "js12",
    language: "javascript",
    text: `for (let i = 1; i <= 100; i++) {\n  console.log(i % 15 === 0 ? "FizzBuzz" : i % 3 === 0 ? "Fizz" : i % 5 === 0 ? "Buzz" : i);\n}`,
  },
];

export function getRandomSnippet(): CodeSnippet {
  return SNIPPETS[Math.floor(Math.random() * SNIPPETS.length)];
}