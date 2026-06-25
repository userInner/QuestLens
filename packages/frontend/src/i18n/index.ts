import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import en from './en.json'
import zh from './zh.json'

export type Locale = 'en' | 'zh'

const messages: Record<Locale, Record<string, string>> = { en, zh }

interface I18nState {
  locale: Locale
  setLocale: (locale: Locale) => void
}

export const useI18nStore = create<I18nState>()(
  persist(
    (set) => ({
      locale: 'en',
      setLocale: (locale) => set({ locale }),
    }),
    { name: 'novaidol-locale' }
  )
)

/**
 * Translation hook.
 * Usage: const t = useT(); t('hero.title')
 */
export function useT() {
  const { locale } = useI18nStore()
  return (key: string): string => {
    return messages[locale]?.[key] || messages['en'][key] || key
  }
}
