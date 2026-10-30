import type { PhrasePack } from './types';
import zhCN from './packs/zh-CN.json';
import vi from './packs/vi.json';

const PACKS: Record<string, PhrasePack> = {
  'zh-CN': zhCN as PhrasePack,
  vi: vi as PhrasePack,
};

export function getPhrasePack(languageCode: string): PhrasePack | null {
  return PACKS[languageCode] ?? null;
}
