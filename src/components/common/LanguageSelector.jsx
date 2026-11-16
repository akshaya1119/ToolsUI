import React from 'react';
import { useTranslation } from 'react-i18next';
import { changeApplicationLanguage } from '../../i18n';

const LanguageSelector = ({ onLanguageChanged }) => {
  const { i18n } = useTranslation();
  const isHindi = i18n.language?.startsWith('hi');
  const targetLang = isHindi ? 'en' : 'hi';
  const label = isHindi ? 'English' : 'हिन्दी';

  const handleToggle = async (e) => {
    e.stopPropagation();
    await changeApplicationLanguage(targetLang);
    if (onLanguageChanged) {
      onLanguageChanged();
    }
  };

  return (
    <li
      className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
      onClick={handleToggle}
    >
      {label}
    </li>
  );
};

export default LanguageSelector;
