export async function onRequest(context) {
  const url = new URL(context.request.url);
  const path = url.pathname;

  // TEMPORARY: Show what we're seeing
  if (path.includes('template') || path.includes('scaffold')) {
    return new Response(`
      <h1>DEBUG INFO</h1>
      <p>Path: ${path}</p>
      <p>Pattern matches: ${/\/_[^/]+\.html$/.test(path)}</p>
      <p>Contains underscore: ${path.includes('/_')}</p>
    `, {
      status: 200,
      headers: { 'Content-Type': 'text/html' }
    });
  }

  return context.next();
}