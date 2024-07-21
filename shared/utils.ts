import zhCN from '@arco-design/web-react/es/locale/zh-CN';
import enUS from '@arco-design/web-react/es/locale/en-US';
import jaJP from '@arco-design/web-react/es/locale/ja-JP';
import koKR from '@arco-design/web-react/es/locale/ko-KR';
import idID from '@arco-design/web-react/es/locale/id-ID';
import thTH from '@arco-design/web-react/es/locale/th-TH';
import zhHK from '@arco-design/web-react/es/locale/zh-HK';
import frFR from '@arco-design/web-react/es/locale/fr-FR';
import esES from '@arco-design/web-react/es/locale/es-ES';
import deDE from '@arco-design/web-react/es/locale/de-DE';
import itIT from '@arco-design/web-react/es/locale/it-IT';
import viVN from '@arco-design/web-react/es/locale/vi-VN';

export function base64ToFile(
  base64Data: string,
  fileName: string,
  mimeType: string,
) {
  const byteCharacters = atob(base64Data);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  const file = new File([byteArray], fileName, { type: mimeType });
  return file;
}

/** 替换掉文件中不可作为文件名的字符 */
export function replaceInvalidCharsInUrl(url: string) {
  // 匹配非字母数字、点、下划线、破折号的字符
  const invalidCharRegex = /[^a-zA-Z0-9.\-_]/g;
  // 将匹配到的字符替换为下划线
  return url.replace(invalidCharRegex, '_');
}

export function getLocale(locale: string) {
  switch (locale) {
    case 'zh-CN':
      return zhCN;
    case 'en-US':
      return enUS;
    case 'ja-JP':
      return jaJP;
    case 'ko-KR':
      return koKR;
    case 'id-ID':
      return idID;
    case 'th-TH':
      return thTH;
    case 'zh-HK':
      return zhHK;
    case 'fr-FR':
      return frFR;
    case 'es-ES':
      return esES;
    case 'de-DE':
      return deDE;
    case 'it-IT':
      return itIT;
    case 'vi-VN':
      return viVN;
    default:
      return enUS;
  }
}
