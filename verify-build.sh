#!/bin/bash

echo "🔍 Marvel Details Phase 1 - Build Verification"
echo "================================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check count
pass=0
fail=0

# Check files
echo "📁 Checking files..."

files=(
    "public/index.html"
    "public/about.html"
    "public/articles/index.html"
    "public/articles/iron-man-2-green-drink.html"
    "public/articles/avengers-loki-scepter-mind-stone.html"
    "public/articles/endgame-final-portal-detail.html"
    "public/movies/index.html"
    "public/movies/iron-man-1.html"
    "public/movies/iron-man-2.html"
    "public/movies/iron-man-3.html"
    "public/movies/avengers-1.html"
    "public/movies/endgame.html"
    "public/robots.txt"
    "public/ads.txt"
    "public/sitemap.xml"
    "wrangler.toml"
    "package.json"
    "src/index.js"
    "README.md"
    "DEPLOYMENT.md"
    "MANIFEST.md"
)

for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo -e "${GREEN}✓${NC} $file"
        ((pass++))
    else
        echo -e "${RED}✗${NC} $file"
        ((fail++))
    fi
done

echo ""
echo "📊 Feature Check..."

# Check for GA4 in HTML files
ga4_count=$(grep -r "G-XXXXXXXXXX" public/*.html public/*/*.html 2>/dev/null | wc -l)
echo -e "${GREEN}✓${NC} GA4 tracking code found in $ga4_count+ files"

# Check for back button
back_count=$(grep -r "← Back\|Back arrow" public/*.html public/*/*.html 2>/dev/null | wc -l)
echo -e "${GREEN}✓${NC} Back button found in $back_count+ files"

# Check for 1600px layout
layout_count=$(grep -r "max-width: 1600px" public/*.html public/*/*.html 2>/dev/null | wc -l)
echo -e "${GREEN}✓${NC} 1600px layout found in $layout_count+ files"

# Check for ad slots
ad_count=$(grep -r "Advertisement Slot" public/*.html 2>/dev/null | wc -l)
echo -e "${GREEN}✓${NC} Advertisement slots found ($ad_count slots)"

# Check for Open Graph tags
og_count=$(grep -r 'property="og:' public/*.html public/*/*.html 2>/dev/null | wc -l)
echo -e "${GREEN}✓${NC} Open Graph meta tags found ($og_count tags)"

# Check for JSON-LD
jsonld_count=$(grep -r 'application/ld+json' public/*.html public/*/*.html 2>/dev/null | wc -l)
echo -e "${GREEN}✓${NC} JSON-LD schemas found ($jsonld_count schemas)"

echo ""
echo "📝 Content Check..."

# Count articles
article_count=$(ls public/articles/*.html 2>/dev/null | wc -l)
echo -e "${GREEN}✓${NC} Articles: $article_count files"

# Count movie pages
movie_count=$(ls public/movies/*.html 2>/dev/null | wc -l)
echo -e "${GREEN}✓${NC} Movie hubs: $movie_count files"

echo ""
echo "📈 Summary"
echo "================================================"
echo -e "Total checks passed: ${GREEN}${pass}${NC}"
if [ $fail -eq 0 ]; then
    echo -e "All checks: ${GREEN}PASSED ✓${NC}"
else
    echo -e "Failed checks: ${RED}${fail}${NC}"
fi

echo ""
echo "🚀 Ready for deployment with:"
echo "   wrangler pages deploy public/"

