export async function onRequest(context) {
  const url = new URL(context.request.url);
  const path = url.pathname;

  // Block any path containing underscore-prefixed files
  const underscorePattern = /\/_[^/]+\.html$/;  // ← Fixed pattern
  if (underscorePattern.test(path)) {
    return new Response('404 Not Found', {
      status: 404,
      headers: { 'Content-Type': 'text/html' }
    });
  }

  return context.next();
}