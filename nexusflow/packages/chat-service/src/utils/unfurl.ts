// URL unfurl helper — fetch Open Graph / oEmbed metadata

import type { UnfurlPreview } from '@nexusflow/shared';

export async function unfurlUrl(url: string): Promise<UnfurlPreview> {
  try {
    const response = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(5000) });
    const html = await response.text();

    // Extract Open Graph tags (simple regex-based extraction)
    const ogTitle = html.match(/<meta[^>]+property="og:title"[^>]+content="([^"]+)"/i)?.[1]
      ?? html.match(/<title>([^<]+)<\/title>/i)?.[1];
    const ogDescription = html.match(/<meta[^>]+property="og:description"[^>]+content="([^"]+)"/i)?.[1];
    const ogImage = html.match(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/i)?.[1];
    const favicon = html.match(/<link[^>]+rel="[^"]*icon[^"]*"[^>]+href="([^"]+)"/i)?.[1]
      ?? `${new URL(url).origin}/favicon.ico`;

    return {
      url,
      type: 'link',
      title: ogTitle?.slice(0, 300),
      description: ogDescription?.slice(0, 500),
      imageUrl: ogImage,
      faviconUrl: favicon,
    };
  } catch {
    return { url, type: 'link' };
  }
}
