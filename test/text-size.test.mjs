import test from 'node:test'
import assert from 'node:assert/strict'
// Doug 2026-11-14: pages opened from Facebook Messenger (and other in-app browsers) looked zoomed in.
// Every page must load the text-size-adjust opt-out (from its own CSS or an inline <style>) and the
// standard viewport tag, so the phone shows the page at its real size.
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs'
import { join, dirname } from 'node:path'

const ROOT = 'public'
const pages = (dir) => readdirSync(dir).flatMap((f) => {
  const p = join(dir, f)
  if (statSync(p).isDirectory()) return f === 'node_modules' ? [] : pages(p)
  return p.endsWith('.html') ? [p] : []
})
const withCss = (page) => {
  const html = readFileSync(page, 'utf8')
  let all = html
  for (const [, href] of html.matchAll(/href="([^"]+\.css)[^"]*"/g)) {
    if (/^https?:/.test(href)) continue
    const file = href.startsWith('/') ? join(ROOT, href) : join(dirname(page), href)
    if (existsSync(file)) all += readFileSync(file, 'utf8')
  }
  return { html, all: all.replace(/\s+/g, '') }
}

test('every page opts out of in-app browser text zoom', () => {
  const bad = []
  for (const page of pages(ROOT)) {
    const { html, all } = withCss(page)
    if (!/<head/i.test(html)) continue
    const ok = all.includes('-webkit-text-size-adjust:100%') && all.includes('-moz-text-size-adjust:100%') && /[;{]text-size-adjust:100%/.test(all)
    const vp = (html.match(/<meta name="viewport" content="([^"]*)"/) || [])[1] || ''
    if (!ok || !/width=device-width/.test(vp) || !/initial-scale=1/.test(vp)) bad.push(page)
  }
  assert.deepEqual(bad, [])
})
