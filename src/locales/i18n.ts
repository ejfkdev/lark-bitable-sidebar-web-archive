/* eslint-disable import/no-named-as-default-member */
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { bitable } from '@lark-base-open/js-sdk';
import resources from './resources.json';

i18n
  .use(initReactI18next)
  .use(LanguageDetector)
  .init({
    resources,
    fallbackLng: 'en', // 指定降级文案为英文
    interpolation: {
      escapeValue: false,
    },
  });

bitable.bridge.getLanguage().then(lng => {
  if (i18n.language !== lng) {
    i18n.changeLanguage(lng);
  }
});

export default i18n;
