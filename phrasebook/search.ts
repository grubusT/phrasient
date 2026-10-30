import type { Phrase, PhrasePack } from './types';

export function searchPhrases(pack: PhrasePack, query: string): Phrase[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  return pack.phrases.filter(
    (p) =>
      p.english.toLowerCase().includes(q) ||
      p.target.toLowerCase().includes(q) ||
      p.romanization.toLowerCase().includes(q)
  );
}
