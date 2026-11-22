import test from 'node:test'
import assert from 'node:assert/strict'
// Doug 2026-11-22 (option B): phones show three section tabs plus More instead of all twelve buttons.
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { MENU, PHONE_TABS, menuFor } from '../tools/menu.mjs'

const pages = (dir) => readdirSync(dir).flatMap((f) => {
  const p = join(dir, f)
  return statSync(p).isDirectory() ? pages(p) : p.endsWith('.html') ? [p] : []
})

test('the phone tabs are three real sections', () => {
  assert.equal(PHONE_TABS.length, 3)
  for (const key of PHONE_TABS) assert.ok(MENU.some(([, , k]) => k === key), key)
})

test('the menu marks the phone tabs and ends with a More link that works without JavaScript', () => {
  const nav = menuFor('trivia/iron-fist.html')
  assert.equal((nav.match(/ data-tab[ >]/g) || []).length, 3)
  assert.match(nav, /<nav class="site-nav" id="site-nav"/)
  assert.match(nav, /<a class="site-nav-more" href="#site-nav"[^>]*aria-expanded="false"/)
  for (const [label, href] of MENU) assert.ok(nav.includes(`href="${href}"`), label)
})

test('every page with the menu has the More link and loads js/menu.js', () => {
  const bad = []
  for (const page of pages('public')) {
    const html = readFileSync(page, 'utf8')
    if (!html.includes('<nav class="site-nav"')) continue
    if (!html.includes('class="site-nav-more"') || !html.includes('/js/menu.js')) bad.push(page)
  }
  assert.deepEqual(bad, [])
})

test('phone menu text stays at 17px or more', () => {
  const css = readFileSync('public/css/theme.css', 'utf8')
  const block = css.slice(css.indexOf('/* Phones: four tabs'), css.indexOf('@media (max-width: 420px)'))
  for (const [, rem] of block.matchAll(/font-size:\s*([\d.]+)rem/g)) assert.ok(Number(rem) * 16 >= 17, `${rem}rem`)
})
