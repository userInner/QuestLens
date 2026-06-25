import { useI18nStore, type Locale } from '../i18n'

const LocaleSwitcher = () => {
  const { locale, setLocale } = useI18nStore()

  return (
    <div className="flex items-center bg-white/5 rounded-lg p-0.5">
      <button
        onClick={() => setLocale('en')}
        className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
          locale === 'en' ? 'bg-white text-black' : 'text-white/40 hover:text-white/60'
        }`}
      >
        EN
      </button>
      <button
        onClick={() => setLocale('zh')}
        className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
          locale === 'zh' ? 'bg-white text-black' : 'text-white/40 hover:text-white/60'
        }`}
      >
        中文
      </button>
    </div>
  )
}

export default LocaleSwitcher
