export type PhraseCategory =
  | 'essentials'
  | 'ordering'
  | 'dietary'
  | 'paying'
  | 'transport'
  | 'directions'
  | 'accommodation'
  | 'shopping'
  | 'nightlife';

export interface Phrase {
  id: string;
  english: string;
  target: string;
  romanization: string;
  category: PhraseCategory;
  audio: string | null;
}

export interface PhrasePack {
  language: string; // e.g. 'zh-CN', 'vi'
  ttsLocale: string; // locale passed to expo-speech
  reviewed: boolean; // false = not yet checked by a native speaker
  phrases: Phrase[];
}
