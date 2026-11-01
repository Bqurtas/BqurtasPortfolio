/* Archive and work pages carry no third-party script by design (their CSP
   allows only their own page guard: a nonce on work pages, the local archive
   bundle on archive pages). Cloudflare still injected its Web Analytics
   beacon and its bot JavaScript-detection snippet into every HTML response,
   and the CSP blocked both: two console errors on each of these pages, for
   nothing.

   `Cache-Control: no-transform` tells Cloudflare not to rewrite the body, so
   neither snippet is injected. It also switches off Cloudflare's compression,
   so the document is gzipped here instead and stays as small as before. */

const appendDirective = (value, directive) => {
  if (!value) return directive;
  return new RegExp(`(?:^|,)\\s*${directive}\\s*(?:,|$)`, 'i').test(value) ? value : `${value}, ${directive}`;
};

const acceptsGzip = (value) => String(value || '').split(',').some((part) => {
  const [coding, ...params] = part.split(';').map((token) => token.trim().toLowerCase());
  const q = params.find((param) => param.startsWith('q='));
  return coding === 'gzip' && !(q && Number(q.slice(2)) === 0);
});

export function untransformedDocument(request, response) {
  if (response.status !== 200) return response;
  const headers = new Headers(response.headers);
  headers.set('Cache-Control', appendDirective(headers.get('Cache-Control'), 'no-transform'));
  headers.set('Vary', appendDirective(headers.get('Vary'), 'Accept-Encoding'));
  const head = request.method === 'HEAD';
  const gzip = acceptsGzip(request.headers.get('Accept-Encoding'));
  if (!gzip || headers.has('Content-Encoding') || (!head && !response.body)) {
    return new Response(head ? null : response.body, { status: 200, statusText: response.statusText, headers });
  }
  headers.set('Content-Encoding', 'gzip');
  headers.delete('Content-Length');
  // The bytes differ per encoding, so a validator from the identity body is weak.
  const etag = headers.get('ETag');
  if (etag && !etag.startsWith('W/')) headers.set('ETag', `W/${etag}`);
  const body = head ? null : response.body.pipeThrough(new CompressionStream('gzip'));
  // encodeBody "manual": the Workers runtime sends these bytes as they are.
  return new Response(body, { status: 200, statusText: response.statusText, headers, encodeBody: 'manual' });
}
