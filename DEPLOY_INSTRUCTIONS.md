# Marvel Details Phase 1 - Deployment Instructions

## Prerequisites
- Git installed on your laptop
- Wrangler CLI installed (`npm install -g wrangler`)
- Cloudflare account with API token

## Step 1: Create the GitHub Repository

On GitHub (github.com):
1. Go to github.com/new or your personal account dashboard
2. Click "New repository"
3. Name: `marvel-details`
4. Description: `Marvel movie details site built with Cloudflare Workers`
5. Public (uncheck Private)
6. **Do NOT initialize with README** (we already have one)
7. Click "Create repository"

After creation, copy the HTTPS URL shown (looks like: `https://github.com/dugwdn/marvel-details.git`)

## Step 2: Clone the Local Git Repo to Your Laptop

Open Terminal/PowerShell on your laptop and run:

```bash
# Create a working folder
mkdir -p ~/Projects
cd ~/Projects

# Clone the current repo from the scratchpad
git clone /path/to/scratchpad/marvel-details marvel-details-local
cd marvel-details-local
```

(Replace `/path/to/scratchpad/` with the actual path to the session scratchpad)

## Step 3: Add GitHub as Remote and Push

```bash
# Add GitHub as the remote (replace with your actual URL from Step 1)
git remote add origin https://github.com/dugwdn/marvel-details.git

# Switch to phase-1-build branch
git checkout phase-1-build

# Push to GitHub
git push -u origin phase-1-build
```

Verify on GitHub that `phase-1-build` branch now shows the Marvel Details code.

## Step 4: Deploy to Cloudflare Workers (3 Commands)

From the `marvel-details` folder on your laptop:

### Command 1: Install Dependencies
```bash
npm install
```

### Command 2: Preview / Test Locally
```bash
wrangler dev
```
Visit `http://localhost:8787` to verify the site loads. Press Ctrl+C to stop.

### Command 3: Deploy to Production
```bash
wrangler deploy --env production
```

This publishes to Cloudflare Workers. The output will show your live URL.

## Success Indicators

After `wrangler deploy --env production`:
- Console shows: `Uploaded marvel-details (1.2 MB) in X.XX seconds`
- Output displays your live URL: `https://marvel-details.<random>.workers.dev`
- Visit that URL - you should see the Marvel site homepage
- Check `/about` page, `/movies/`, and `/articles/` all load correctly

## Folder Structure Reference

```
marvel-details/
├── public/                 # Built static site (deployed to Workers)
│   ├── index.html         # Homepage
│   ├── about.html         # About page
│   ├── movies/            # Movie detail pages
│   │   ├── index.html     # Movies listing
│   │   ├── iron-man-1.html
│   │   ├── iron-man-2.html
│   │   └── ... (more movies)
│   ├── articles/          # Article pages
│   │   ├── index.html     # Articles listing
│   │   └── ... (article details)
│   ├── sitemap.xml        # SEO sitemap
│   ├── robots.txt         # SEO robots config
│   └── _routes.json       # Cloudflare routing config
├── src/
│   └── index.js           # Cloudflare Workers entry point
├── wrangler.toml          # Cloudflare Workers config
├── package.json           # Node dependencies
└── README.md              # Project readme
```

## Troubleshooting

**"npm install" fails:**
- Make sure Node.js 16+ is installed: `node --version`

**"wrangler dev" won't connect:**
- Verify you're in the correct folder: `pwd` should show `marvel-details`
- Check firewall isn't blocking port 8787

**"wrangler deploy" says "invalid auth token":**
- Run: `wrangler login`
- Follow the browser prompt to authenticate with Cloudflare
- Then retry `wrangler deploy --env production`

**Site shows 404 or blank:**
- Verify the build succeeded: check that `public/` folder has HTML files
- Try `wrangler dev` locally first to debug

## Custom Domain (Optional - Later)

Once live and working, you can add a custom domain like `marvel-details.com`:
1. In Cloudflare dashboard, add your domain
2. Update `wrangler.toml` with your domain
3. Run `wrangler deploy --env production` again

For now, use the `.workers.dev` URL.
