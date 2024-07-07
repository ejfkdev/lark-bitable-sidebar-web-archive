// import { setGlobalDispatcher, ProxyAgent } from 'undici';

// import { RequestOption } from '@modern-js/runtime/server';

// const proxyUrl = 'http://127.0.0.1:7890';
// const agent = new ProxyAgent(proxyUrl);
// setGlobalDispatcher(agent);

export default async ({ query }: any) => {
  let url = query?.url ?? '';
  url = decodeURIComponent(url);
  console.log(url);
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return { ok: 0, url: '' };
  }
  try {
    const response = await fetch(`https://web.archive.org/save/${url}`, {
      headers: {
        Accept: `*/*`,
        'Accept-Encoding': `gzip, deflate`,
        Connection: `keep-alive`,
        Host: `web.archive.org`,
        'User-Agent': `HTTPie/3.2.2`,
      },
      redirect: 'manual',
    });
    const locationHeader = response.headers.get('location');
    if (locationHeader) {
      return { ok: 1, url: locationHeader };
    }
  } catch (e: any) {
    console.log(e?.name, e);
  }
  return { ok: 0, url: '' };
};
