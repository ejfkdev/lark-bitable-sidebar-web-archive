import { Buffer } from 'buffer';
import { URL } from 'node:url';
import axios from 'axios';
import { getLinkPreview } from 'link-preview-js';
import sanitize from 'sanitize-filename';
import { sleep } from 'radash';
// import { useContext } from '@modern-js/runtime/express';

export default async ({ query }: any) => {
  let url: string = query?.url ?? '';
  url = decodeURIComponent(url);
  console.log(url);
  const none = { ok: 0, base64: '', filename: '' };
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return none;
  }
  try {
    const data = {
      url,
      renameAssets: false,
      saveStructure: false,
      alternativeAlgorithm: false,
      mobileVersion: false,
    };
    let response = await axios.post(
      `https://copier.saveweb2zip.com/api/copySite`,
      data,
      {
        timeout: 5000,
        validateStatus: () => true,
        headers: {
          Accept: '*/*',
          'content-type': 'application/json',
          'Accept-Encoding': `gzip, deflate, br`,
          // Connection: `keep-alive`,
          referer: `https://copier.saveweb2zip.com/`,
          // Host: host,
          'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
        },
        maxRedirects: 0,
      },
    );
    const md5 = response.data?.md5;
    if (!md5) {
      return none;
    }
    let success = false;
    for (let index = 0; index < 15; index++) {
      response = await axios.get(
        `https://copier.saveweb2zip.com/api/getStatus/${md5}`,
      );
      success = response.data.success as boolean;
      if (success) {
        break;
      }
      await sleep(2000);
    }
    const res = await fetch(
      `https://copier.saveweb2zip.com/api/downloadArchive/${md5}`,
    );
    const buff = await res.arrayBuffer();
    const base64 = Buffer.from(buff).toString('base64');
    let title = url;

    try {
      const meta = await getLinkPreview(url, {
        timeout: 2000,
        followRedirects: 'follow',
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
        },
      });
      const u = new URL(url);
      // @ts-expect-error
      if (meta?.title) {
        // @ts-expect-error
        title = `${meta?.title ?? ''} ${u?.host}`.replaceAll(/\s+/gim, '_');
      }
    } catch (error: any) {
      console.log(`getLinkPreview error`, error?.name, error?.message);
    }
    const filename = `${sanitize(title, { replacement: '_' })
      .replaceAll(/[_]{2,}/gim, '_')
      .replace(/^_/, '')
      .slice(0, 200)}.zip`;
    return { ok: 1, filename, base64 };
  } catch (e: any) {
    console.log(e?.name, e?.message);
  }
  return none;
};
