import { useLanguage } from '@/lib/LanguageContext';
import { LANGUAGES } from '@/lib/i18n';
import type { Language } from '@/lib/i18n';

const LABELS: Record<Language, string> = { pt: 'PT', en: 'EN', es: 'ES' };

interface LanguageSwitcherProps {
  compact?: boolean;
}

export function LanguageSwitcher({ compact = false }: LanguageSwitcherProps) {
  const { language, setLanguage } = useLanguage();

  return (
    <div style={{ display: 'flex', gap: compact ? '2px' : '4px' }}>
      {LANGUAGES.map((lang) => (
        <button
          key={lang}
          onClick={() => setLanguage(lang)}
          style={{
            background: language === lang ? 'rgba(255,255,255,0.12)' : 'transparent',
            border: 'none',
            borderRadius: '4px',
            padding: compact ? '2px 5px' : '5px 9px',
            fontSize: compact ? '7px' : '10px',
            fontWeight: 700,
            letterSpacing: '0.06em',
            color: language === lang ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.3)',
            cursor: 'pointer',
            transition: 'all 150ms ease',
          }}
        >
          {LABELS[lang]}
        </button>
      ))}
    </div>
  );
}
