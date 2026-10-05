# Marvel Details Phase 1 - Deployment Guide

## Quick Start: Deploy to Cloudflare Workers / Pages

This site is ready to deploy to Cloudflare's free tier with a `workers.dev` subdomain.

### Prerequisites

1. A Cloudflare account (free tier works)
2. Node.js and npm installed
3. Wrangler CLI

### Installation

```bash
# Install wrangler globally
npm install -g wrangler

# Or install locally in the project
npm install
```

### Deploy with Wrangler (Recommended)

#### Option 1: Cloudflare Pages (Recommended for Static Sites)

Cloudflare Pages is built on Workers and is the best choice for static sites like this.

```bash
# Authenticate with Cloudflare
wrangler login

# Deploy using Pages
wrangler pages deploy public/

# The site will be deployed to:
# https://marvel-details.[random-subdomain].pages.dev
# With a workers.dev subdomain also available
```

#### Option 2: Cloudflare Workers

If you prefer Workers directly:

```bash
# Authenticate
wrangler login

# Deploy
wrangler deploy

# Will be available at:
# https://marvel-details.[random].workers.dev
```

### Configuration

The `wrangler.toml` file is pre-configured with:

- **name**: `marvel-details`
- **type**: `javascript`
- **workers_dev**: `true` (enables free workers.dev domain)
- **compatibility_date**: `2024-10-05`

### What Gets Deployed

```
marvel-details/
├── public/                 # All static files
│   ├── index.html         # Home page
│   ├── about.html         # About page
│   ├── articles/          # 10 articles
│   ├── movies/            # 5 movie hubs
│   ├── robots.txt         # SEO - search engine guidance
│   ├── sitemap.xml        # SEO - all URLs indexed
│   ├── ads.txt            # Ad compliance
│   ├── _redirects         # Route all paths to pages
│   └── _routes.json       # Cloudflare Pages routing
└── src/
    └── index.js           # Worker entry point (if using Workers)
```

### Features Deployed

✓ **GA4 Tracking** - Analytics configured in all HTML headers
✓ **SEO Optimization** 
  - JSON-LD NewsArticle schema
  - JSON-LD CollectionPage schema
  - Open Graph meta tags
  - robots.txt with sitemap reference
  - sitemap.xml with 23 URLs

✓ **Security Headers**
  - X-Content-Type-Options: nosniff
  - X-Frame-Options: SAMEORIGIN
  - Referrer-Policy: strict-origin-when-cross-origin
  - Cache-Control headers for performance

✓ **Layout & Design**
  - Full 1600px width responsive layout
  - Back button navigation on every page
  - 3 ad slot placeholders
  - Professional typography and colors
  - Dark theme with gold accents (#ffc107)

✓ **Content**
  - 10 high-quality articles
  - 5 comprehensive movie hub pages
  - 5 writer profile pages (house personas)
  - About page with transparency about AI assistance

### Post-Deployment Steps

1. **Get Your Live URL**
   After deployment, wrangler will output your live URL. It will look like:
   ```
   https://marvel-details-xxxx.workers.dev
   or
   https://marvel-details-xxxx.pages.dev
   ```

2. **Set Up GA4**
   Replace `G-XXXXXXXXXX` in all HTML files with your actual GA4 measurement ID:
   ```javascript
   gtag('config', 'YOUR-GA4-ID');
   ```

3. **Update sitemap.xml**
   Change all `https://marvel-details.workers.dev/` to your actual live URL

4. **Submit to Search Engines**
   - Google Search Console: Submit sitemap.xml
   - Bing Webmaster Tools: Submit site
   - Verify robots.txt is accessible at `/robots.txt`

### Updating Content

To update articles or add new content:

1. Edit the HTML files in `public/`
2. Update `public/sitemap.xml` with new URLs
3. Update `public/articles/index.html` or `public/movies/index.html` with links
4. Redeploy with `wrangler pages deploy public/`

### Environment Variables

The site doesn't use environment variables in Phase 1, but you can add them to `wrangler.toml` for Phase 2:

```toml
[env.production]
vars = { API_URL = "https://api.example.com" }
```

### Troubleshooting

**Issue**: "Not authenticated" error
- **Solution**: Run `wrangler login` first

**Issue**: 404 errors on static pages
- **Solution**: Ensure all files exist in `public/` directory
- **Check**: Run `find public -type f` to list all files

**Issue**: CSS/styling not loading
- **Solution**: Styles are inline in HTML files (no external files)
- **Check**: View page source to confirm styles are present

**Issue**: GA4 not tracking
- **Solution**: Replace placeholder `G-XXXXXXXXXX` with real GA4 ID
- **Check**: View Network tab in browser DevTools

### Monitoring Deployment

After deployment, monitor:

1. **Search Console** - Check if pages are indexed
2. **GA4** - Verify tracking is working
3. **Performance** - Use Cloudflare Analytics to check:
   - Page load times
   - Errors
   - Cache hit ratio

### Phase 2 & 3 Preparation

This Phase 1 deployment is set up to easily scale:

- **Phase 2**: Add comment system (Giscus), more movie hubs, "lines that come back" tracker
- **Phase 3**: Upgrade to custom domain, add Google AdSense, publish weekly articles

### Support & Questions

For deployment issues:
1. Check Cloudflare docs: https://developers.cloudflare.com/workers/
2. Check Pages docs: https://developers.cloudflare.com/pages/
3. Review wrangler docs: https://developers.cloudflare.com/workers/wrangler/

### License

Details You Missed © 2026
Not affiliated with Marvel Studios or Disney.
