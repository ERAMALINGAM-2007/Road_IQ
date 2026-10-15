import { create } from 'zustand';

type Theme = 'light' | 'dark';
type Language = 'en' | 'ta';
type Role = 'inspector' | 'engineer' | 'admin' | null;

interface AppState {
  theme: Theme;
  language: Language;
  role: Role;
  demoMode: boolean;
  demoDetector: boolean;
  // Actions
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  setLanguage: (lang: Language) => void;
  setRole: (role: Role) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  theme: 'light',
  language: 'en',
  role: 'engineer',   // default for demo
  demoMode: true,
  demoDetector: true,

  setTheme: (theme) => {
    document.documentElement.setAttribute('data-theme', theme);
    set({ theme });
  },

  toggleTheme: () => {
    const next: Theme = get().theme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', next);
    set({ theme: next });
  },

  setLanguage: (language) => set({ language }),
  setRole: (role) => set({ role }),
}));
