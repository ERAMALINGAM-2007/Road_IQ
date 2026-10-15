import { useTranslation } from 'react-i18next';
import { Moon, Sun, Globe } from 'phosphor-react';
import { useAppStore } from '@/lib/store';

export function TopStrip() {
  const { t, i18n } = useTranslation();
  const { theme, toggleTheme, language, setLanguage, role, demoMode, demoDetector } = useAppStore();

  const toggleLang = () => {
    const next = language === 'en' ? 'ta' : 'en';
    i18n.changeLanguage(next);
    setLanguage(next);
  };

  return (
    <header className="top-strip" role="banner">
      {/* Wordmark */}
      <div className="flex items-center gap-2 mr-6">
        <span className="font-display text-[var(--marking)] text-md font-semibold tracking-tight select-none">
          Marga
        </span>
        {/* Dashed road centreline underline motif */}
        <span
          aria-hidden="true"
          className="w-8 h-[2px] opacity-60"
          style={{
            backgroundImage: 'repeating-linear-gradient(90deg, var(--marking) 0, var(--marking) 5px, transparent 5px, transparent 9px)',
          }}
        />
      </div>

      {/* Region + survey picker */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <span className="survey-plate text-[rgba(236,232,221,0.6)]">
          {t('region')}
        </span>
        <span className="text-[rgba(236,232,221,0.2)]">·</span>
        <select
          className="bg-transparent text-[rgba(236,232,221,0.6)] text-xs font-mono border border-[rgba(255,255,255,0.12)] rounded px-2 py-0.5 outline-none cursor-pointer focus-visible:outline-none focus-visible:border-[var(--marking)]"
          defaultValue="demo-survey-1"
          aria-label="Select survey"
        >
          <option value="demo-survey-1">Survey · 12 Oct 2026</option>
          <option value="demo-survey-2">Survey · 5 Oct 2026</option>
          <option value="demo-survey-3">Survey · 28 Sep 2026</option>
        </select>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-3 ml-auto">
        {/* Demo badges */}
        {demoMode && (
          <span className="badge-demo badge-demo-data" title="All data on screen is seeded for demonstration purposes">
            {t('badges.demoData')}
          </span>
        )}
        {demoDetector && (
          <span className="badge-demo badge-demo-detector" title="Running in demo-detector mode — no model weights installed">
            {t('badges.demoDetector')}
          </span>
        )}

        {/* Language toggle */}
        <button
          onClick={toggleLang}
          className="flex items-center gap-1 text-[rgba(236,232,221,0.6)] hover:text-[var(--marking)] transition-colors text-xs font-mono"
          aria-label={`Switch language, currently ${language.toUpperCase()}`}
          title="Toggle language"
          id="lang-toggle"
        >
          <Globe size={14} />
          <span>{language === 'en' ? 'EN' : 'தமிழ்'}</span>
        </button>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="flex items-center justify-center w-7 h-7 rounded text-[rgba(236,232,221,0.6)] hover:text-[var(--marking)] transition-colors"
          aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          title={theme === 'light' ? 'Switch to Night Patrol' : 'Switch to Daylight Survey'}
          id="theme-toggle"
        >
          {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
        </button>

        {/* Role badge */}
        {role && (
          <span className="text-[10px] font-mono font-medium uppercase tracking-widest text-[rgba(236,232,221,0.4)] border border-[rgba(255,255,255,0.08)] px-2 py-0.5 rounded">
            {role}
          </span>
        )}
      </div>
    </header>
  );
}
