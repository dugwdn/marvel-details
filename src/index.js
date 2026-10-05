/**
 * Details You Missed - Marvel Analysis Website on Cloudflare Workers
 * Phase 1 - Static site with GA4, SEO, ads.txt, robots.txt, sitemap
 */

// Inline route handler for static files
export default {
  async fetch(request) {
    const url = new URL(request.url);
    let pathname = url.pathname;

    // Normalize path (remove trailing slashes except root, add .html if needed)
    if (pathname !== '/' && pathname.endsWith('/')) {
      pathname = pathname.slice(0, -1);
    }

    // Try to fetch the static file from the public directory
    let filePath = pathname;

    // If it doesn't have an extension, try .html
    if (!filePath.includes('.') || (!filePath.endsWith('.html') && !filePath.endsWith('.xml') && !filePath.endsWith('.txt'))) {
      if (filePath === '') filePath = '/index.html';
      else if (filePath === '/') filePath = '/index.html';
      else filePath = filePath + '.html';
    }

    // Attempt to load the file
    try {
      const response = await fetch(`https://marvel-details.workers.dev${filePath}`, {
        method: 'GET'
      });

      if (response.status === 200) {
        // Determine content type
        let contentType = 'text/html; charset=utf-8';
        if (filePath.endsWith('.xml')) contentType = 'application/xml; charset=utf-8';
        else if (filePath.endsWith('.txt')) contentType = 'text/plain; charset=utf-8';

        // Create response with proper headers
        const headers = new Headers(response.headers);
        headers.set('Content-Type', contentType);
        headers.set('X-Content-Type-Options', 'nosniff');
        headers.set('X-Frame-Options', 'SAMEORIGIN');
        headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
        headers.set('Cache-Control', 'public, max-age=3600');

        return new Response(response.body, {
          status: 200,
          headers: headers
        });
      }
    } catch (err) {
      // Continue to 404 handling
    }

    // Return 404
    return new Response('Page not found', { status: 404, headers: { 'Content-Type': 'text/plain' } });
  }
};
