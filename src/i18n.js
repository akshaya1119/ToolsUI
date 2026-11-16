import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import enStatic from './locales/en.json';
import hiStatic from './locales/hi.json';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export const getCurrentUserId = () => {
  try {
    const token = localStorage.getItem('token');
    if (token) {
      const parts = token.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
        const id = payload['userid'] ?? payload['unique_name'] ?? payload['sub'] ?? null;
        if (id !== null && !isNaN(Number(id))) return Number(id);
      }
    }
  } catch {
    // ignore
  }

  try {
    const raw = localStorage.getItem('auth-storage');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.state?.user?.id) return parsed.state.user.id;
    }
  } catch {
    // ignore
  }
  return null;
};

export const getInitialLanguage = () => {
  const userId = getCurrentUserId();
  if (userId) {
    const userPref = localStorage.getItem(`user_lang_${userId}`);
    if (userPref && ['en', 'hi'].includes(userPref)) {
      return userPref;
    }
  }
  const generalPref = localStorage.getItem('i18nextLng') || localStorage.getItem('app_lang');
  if (generalPref && ['en', 'hi'].includes(generalPref)) {
    return generalPref;
  }
  return 'en';
};

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: enStatic },
      hi: { translation: hiStatic }
    },
    lng: getInitialLanguage(),
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    },
    keySeparator: '.'
  });

export const loadDynamicTranslations = async (lang = i18n.language) => {
  try {
    if (lang === 'hi') {
      const [enRes, hiRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/Translations/bundle?lang=en`).catch(() => ({ data: {} })),
        axios.get(`${API_BASE_URL}/Translations/bundle?lang=hi`).catch(() => ({ data: {} }))
      ]);

      if (enRes.data && Object.keys(enRes.data).length > 0) {
        i18n.addResourceBundle('en', 'translation', enRes.data, true, true);
      }
      if (hiRes.data && Object.keys(hiRes.data).length > 0) {
        i18n.addResourceBundle('hi', 'translation', hiRes.data, true, true);
      }
    } else {
      const enRes = await axios.get(`${API_BASE_URL}/Translations/bundle?lang=en`).catch(() => ({ data: {} }));
      if (enRes.data && Object.keys(enRes.data).length > 0) {
        i18n.addResourceBundle('en', 'translation', enRes.data, true, true);
      }
    }
  } catch (err) {
    console.error('Failed to load dynamic translation bundle:', err);
  }
};

export const changeApplicationLanguage = async (newLang) => {
  if (!['en', 'hi'].includes(newLang)) return;
  const userId = getCurrentUserId();
  if (userId) {
    localStorage.setItem(`user_lang_${userId}`, newLang);
  }
  localStorage.setItem('app_lang', newLang);
  localStorage.setItem('i18nextLng', newLang);

  await i18n.changeLanguage(newLang);
  await loadDynamicTranslations(newLang);
};

export default i18n;
