import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { listPinnedPhrases, pinPhrase, unpinPhrase } from '../db/pinnedPhrases';

/**
 * The pinbook for one language: which phrase ids are saved, and a toggle. The
 * pinbook is global per language, so every phrase surface reads it the same way.
 * Reloads on focus so a change made on another tab shows up on return.
 */
export function usePinnedPhrases(languageCode: string | null) {
  const [pinnedIds, setPinnedIds] = useState<ReadonlySet<string>>(new Set());

  const reload = useCallback(() => {
    if (!languageCode) return setPinnedIds(new Set());
    listPinnedPhrases(languageCode).then((rows) => setPinnedIds(new Set(rows.map((r) => r.phrase_id))));
  }, [languageCode]);

  useFocusEffect(reload);

  const toggle = useCallback(
    async (phraseId: string) => {
      if (!languageCode) return;
      if (pinnedIds.has(phraseId)) await unpinPhrase(languageCode, phraseId);
      else await pinPhrase(languageCode, phraseId);
      reload();
    },
    [languageCode, pinnedIds, reload]
  );

  return { pinnedIds, toggle };
}
