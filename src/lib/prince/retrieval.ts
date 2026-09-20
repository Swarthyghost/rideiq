import "server-only";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

export interface KnowledgeChunk {
  source: string;
  heading: string;
  text: string;
  tokens: string[];
}

const KNOWLEDGE_DIR = path.join(process.cwd(), "knowledge");
const MIN_BODY_CHARS = 20;

const STOPWORDS = new Set(
  "a an the and or but if of to in on at by for with from is are was were be been am do does did i me my we our you your he his she her it its they them their this that these those what which who how when where why can could should would will shall may might not no yes so as than then there here about into out up down over under again also just very".split(
    " "
  )
);

// People phrase things differently from the contract, so map everyday wording
// onto the terms the documents actually use.
const SYNONYMS: Record<string, string[]> = {
  repossess: ["repossession", "seize", "confiscate", "recover", "retrieve", "takeback"],
  late: ["miss", "missed", "overdue", "delay", "behind", "grace", "strike"],
  miss: ["late", "grace", "strike"],
  grace: ["late", "miss", "strike"],
  strike: ["grace", "late", "miss"],
  repair: ["maintenance", "fix", "service", "servicing", "damage"],
  fix: ["repair", "maintenance"],
  maintenance: ["repair", "service"],
  tyre: ["tire"],
  tire: ["tires"],
  month: ["months", "weeks", "long", "duration"],
  week: ["weekly", "weeks"],
  long: ["month", "months", "weeks", "duration"],
  sick: ["ill", "illness"],
  ill: ["illness", "sick"],
  own: ["ownership", "property", "belong"],
  guarantor: ["guarantee", "family", "surety"],
  id: ["identification", "ghana", "card"],
  pay: ["payment", "installment", "installments"],
  price: ["value", "cost", "total"],
  cost: ["value", "price", "total"],
  police: ["report", "arrest"],
  stolen: ["locate", "produce", "replacement"],
  lost: ["locate", "produce", "replacement"],
};

function stem(word: string): string {
  return word.length > 4 ? word.replace(/(ing|ed|es|s)$/, "") : word;
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOPWORDS.has(w))
    .map(stem);
}

function expand(tokens: string[]): string[] {
  const out = new Set(tokens);
  for (const t of tokens) {
    for (const syn of SYNONYMS[t] ?? []) out.add(stem(syn));
  }
  return [...out];
}

let cache: KnowledgeChunk[] | null = null;

function loadChunks(): KnowledgeChunk[] {
  if (cache && process.env.NODE_ENV === "production") return cache;

  const chunks: KnowledgeChunk[] = [];
  for (const file of readdirSync(KNOWLEDGE_DIR).filter((f) => f.endsWith(".md"))) {
    const raw = readFileSync(path.join(KNOWLEDGE_DIR, file), "utf8");
    let title = file;
    let heading = "";
    let body: string[] = [];

    const flush = () => {
      const text = body.join("\n").trim();
      // Header-only stubs (FAQ sections nobody has written yet) carry no
      // answer, so they must never be retrieved or cited.
      if (text.length >= MIN_BODY_CHARS) {
        chunks.push({
          source: file,
          heading: heading || title,
          text,
          tokens: tokenize(`${title} ${heading} ${text}`),
        });
      }
      body = [];
    };

    for (const line of raw.split("\n")) {
      const h1 = line.match(/^#\s+(.*)/);
      const h2 = line.match(/^##\s+(.*)/);
      if (h1) {
        flush();
        title = h1[1].trim();
        heading = "";
      } else if (h2) {
        flush();
        heading = h2[1].trim();
      } else {
        body.push(line);
      }
    }
    flush();
  }

  cache = chunks;
  return chunks;
}

/** BM25 over heading-level chunks; returns the best matches, or [] when nothing is relevant. */
export function retrieve(query: string, limit = 5): KnowledgeChunk[] {
  const chunks = loadChunks();
  const queryTerms = expand(tokenize(query));
  if (queryTerms.length === 0 || chunks.length === 0) return [];

  const k1 = 1.4;
  const b = 0.75;
  const avgLen = chunks.reduce((s, c) => s + c.tokens.length, 0) / chunks.length;

  const docFreq = new Map<string, number>();
  for (const c of chunks) {
    for (const t of new Set(c.tokens)) docFreq.set(t, (docFreq.get(t) ?? 0) + 1);
  }

  const scored = chunks.map((chunk) => {
    const freq = new Map<string, number>();
    for (const t of chunk.tokens) freq.set(t, (freq.get(t) ?? 0) + 1);

    let score = 0;
    for (const term of queryTerms) {
      const f = freq.get(term);
      if (!f) continue;
      const n = docFreq.get(term) ?? 0;
      const idf = Math.log(1 + (chunks.length - n + 0.5) / (n + 0.5));
      score += idf * ((f * (k1 + 1)) / (f + k1 * (1 - b + (b * chunk.tokens.length) / avgLen)));
    }
    return { chunk, score };
  });

  return scored
    .filter((s) => s.score > 0.5)
    .sort((a, b2) => b2.score - a.score)
    .slice(0, limit)
    .map((s) => s.chunk);
}

export function formatContext(chunks: KnowledgeChunk[]): string {
  return chunks.map((c, i) => `[${i + 1}] (${c.source} — ${c.heading})\n${c.text}`).join("\n\n");
}
