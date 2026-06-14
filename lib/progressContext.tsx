// lib/progressContext.tsx
// Shared in-memory mastery state between Vocabulary and Flashcard pages.
// Wrap this around the dashboard layout (or just LanguageProvider works too).
//
// How it works:
// - Initializes mastery from vocabularyData on mount
// - Flashcard "Got It!" calls markKnown(lang, word)  → mastery += 15, capped at 100
// - Flashcard "Still Learning" calls markUnknown(lang, word) → mastery -= 10, min 0
// - Vocabulary page reads mastery from this context instead of static data

"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { vocabularyData } from "@/lib/vocabularyData";
import { type LangCode } from "@/lib/languages";

type MasteryMap = Record<LangCode, Record<string, number>>; // lang → word → mastery
type KnownMap   = Record<LangCode, Record<string, boolean>>;

function buildInitial() {
  const mastery: Partial<MasteryMap> = {};
  const known:   Partial<KnownMap>   = {};
  for (const [lang, words] of Object.entries(vocabularyData)) {
    mastery[lang as LangCode] = {};
    known[lang as LangCode]   = {};
    for (const w of words) {
      mastery[lang as LangCode]![w.word] = w.mastery;
      known[lang as LangCode]![w.word]   = w.known;
    }
  }
  return { mastery: mastery as MasteryMap, known: known as KnownMap };
}

type ProgressCtx = {
  mastery: MasteryMap;
  known:   KnownMap;
  markKnown:   (lang: LangCode, word: string) => void;
  markUnknown: (lang: LangCode, word: string) => void;
};

const Ctx = createContext<ProgressCtx | null>(null);

export function ProgressProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState(buildInitial);

  const markKnown = useCallback((lang: LangCode, word: string) => {
    setState(prev => {
      const cur = prev.mastery[lang]?.[word] ?? 0;
      const next = Math.min(100, cur + 15);
      return {
        mastery: { ...prev.mastery, [lang]: { ...prev.mastery[lang], [word]: next } },
        known:   { ...prev.known,   [lang]: { ...prev.known[lang],   [word]: next >= 80 } },
      };
    });
  }, []);

  const markUnknown = useCallback((lang: LangCode, word: string) => {
    setState(prev => {
      const cur = prev.mastery[lang]?.[word] ?? 0;
      const next = Math.max(0, cur - 10);
      return {
        mastery: { ...prev.mastery, [lang]: { ...prev.mastery[lang], [word]: next } },
        known:   { ...prev.known,   [lang]: { ...prev.known[lang],   [word]: next >= 80 } },
      };
    });
  }, []);

  return <Ctx.Provider value={{ ...state, markKnown, markUnknown }}>{children}</Ctx.Provider>;
}

export function useProgress() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useProgress must be used inside ProgressProvider");
  return ctx;
}
