// Keyboard check: every typing box at 390x640 with a 300px on-screen keyboard, two ways browsers handle it
// (iPhone: only window.visualViewport shrinks; Android: the page itself shrinks). Each box must be focused and
// in view together with what tells you what to type in it (its visible label, and the button or heading with it).
// usage: node scripts/keyboard-check.mjs [BASE=http://localhost:8788] [OUT=keyboard-shots]
// Needs Playwright (npm i -g playwright, or PLAYWRIGHT=/path/to/playwright/index.mjs; CHROMIUM=/path/to/chrome)
// and a running server: `npm run dev`, or any static server of public/ (python3 -m http.server -d public 8788).
const { chromium } = await import(process.env.PLAYWRIGHT || 'playwright')
const BASE = process.argv[2] || 'http://localhost:8788'
const OUT = process.argv[3] || 'keyboard-shots'
const KB = 300, W = 390, H = 640
const click = sel => page => page.click(sel)

// field, and what must stay in view with it (visible label / heading / button)
const CASES = [
  { name: 'site-search-home', url: '/', setup: [click('.site-search-toggle')], field: '#site-q', ctx: ['label[for=site-q]'] },
  { name: 'site-search-deep', url: '/scenes/endgame-scenes.html', setup: [p => p.evaluate(() => scrollTo(0, 2000)), click('.site-search-toggle')], field: '#site-q', ctx: ['label[for=site-q]'], keepScroll: true },
  { name: 'characters', url: '/characters/', field: '#character-search', ctx: ['label[for=character-search]'] },
  { name: 'character-list', url: '/characters/all/', field: '#dir-q', ctx: ['.dir-search > span'] },
  { name: 'scenes', url: '/scenes/', field: '#scene-search', ctx: ['label[for=scene-search]'] },
  { name: 'callbacks', url: '/callbacks/', field: '#callback-search', ctx: ['label[for=callback-search]'] },
  { name: 'rabbit-holes', url: '/rabbit-holes/', field: '#hole-search', ctx: ['label[for=hole-search]'] },
  { name: 'universe-map', url: '/map/', field: '#search-input', ctx: ['label[for=search-input]', '#search-clear'] },
]

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined })
const { mkdirSync } = await import('node:fs'); mkdirSync(OUT, { recursive: true })
let fails = 0
for (const mode of ['ios', 'android']) {
  for (const c of CASES) {
    const ctx = await browser.newContext({ viewport: { width: W, height: H }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 })
    const page = await ctx.newPage()
    if (mode === 'ios') await page.addInitScript(([KB]) => {
      const real = window.visualViewport
      const fake = new EventTarget()
      window.__kb = 0
      for (const k of ['width', 'offsetLeft', 'pageLeft', 'pageTop', 'scale']) Object.defineProperty(fake, k, { get: () => real[k] })
      Object.defineProperty(fake, 'height', { get: () => innerHeight - window.__kb })
      Object.defineProperty(fake, 'offsetTop', { get: () => 0 })
      Object.defineProperty(window, 'visualViewport', { get: () => fake })
      window.__kbOpen = () => { window.__kb = KB; fake.dispatchEvent(new Event('resize')) }
    }, [KB])
    try {
      await page.goto(BASE + c.url, { waitUntil: 'load' })
      await page.waitForTimeout(700)
      for (const s of c.setup || []) { await s(page); await page.waitForTimeout(300) }
      if (!c.keepScroll) {
        await page.locator(c.field).first().scrollIntoViewIfNeeded()
        await page.evaluate(() => scrollTo(0, 0))
      }
      await page.locator(c.field).first().tap({ force: true })
      if (mode === 'ios') await page.evaluate(() => window.__kbOpen())
      else await page.setViewportSize({ width: W, height: H - KB })
      await page.waitForTimeout(700)
      const res = await page.evaluate(([field, ctxs, KB, mode]) => {
        const top = 0, bottom = mode === 'ios' ? innerHeight - KB : innerHeight
        // In view and big enough to read (a 1px screen-reader-only label does not count).
        const vis = el => { if (!el) return 'missing'; const r = el.getBoundingClientRect(); if (r.width < 4 || r.height < 4) return 'not shown'; if (r.top < top - 1 || r.bottom > bottom + 1) return `off(${Math.round(r.top)}..${Math.round(r.bottom)})`
          // Not hidden under something else (the sticky site header).
          const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)
          return hit && (el.contains(hit) || hit.contains(el) || (!!el.closest('label') && hit.closest('label') === el.closest('label'))) ? 'ok' : `covered by ${hit?.className || hit?.tagName}` }
        const f = document.querySelector(field)
        return { focused: document.activeElement === f, field: vis(f), ctx: ctxs.map(s => [s, vis(document.querySelector(s))]) }
      }, [c.field, c.ctx, KB, mode])
      const bad = !res.focused || res.field !== 'ok' || res.ctx.some(([, v]) => v !== 'ok')
      if (bad) fails++
      console.log(`${bad ? 'FAIL' : 'ok  '} ${mode.padEnd(7)} ${c.name.padEnd(18)} field:${res.field}${res.focused ? '' : ' (not focused)'} ${res.ctx.filter(([, v]) => v !== 'ok').map(([s, v]) => `${s}:${v}`).join(' ')}`)
      await page.screenshot({ path: `${OUT}/${mode}-${c.name}.png`, clip: { x: 0, y: 0, width: W, height: H - KB } })
    } catch (e) { fails++; console.log(`ERR  ${mode} ${c.name} ${e.message.split('\n')[0]}`) }
    await ctx.close()
  }
}
await browser.close()
console.log(`${fails} failing`)
if (fails) process.exitCode = 1
