/**
 * Typing boxes stay readable while the on-screen keyboard is out (Doug 2026-10-06: "any time a text input field is
 * needed, the input field itself, and anything else needed to understand what is supposed to go into that field is
 * visible. And keep the keyboard as small as possible"). `node tools/menu.mjs` loads this module on every page and adds
 * `interactive-widget=resizes-content` to every viewport tag (Android Chrome then shrinks the page above the keyboard);
 * `test/keyboard.test.mjs` checks that and each box's keyboard attributes, `scripts/keyboard-check.mjs` checks it on screen.
 *
 * While a box has focus on a touch screen, this finds the box's block: the biggest group around it (its label, the
 * prompt or heading, the button) that still fits in the part of the screen the keyboard leaves (window.visualViewport)
 * below the sticky site header, and moves the page as little as it can so the whole block shows; when no group fits,
 * the box, its label and its button. It scrolls first; a box inside a fixed pop-up, or a page that can't scroll, is
 * nudged up with a CSS translate that goes away when the box loses focus. If even that can't fit, the box's bottom sits
 * just above the keyboard so everything above it (label, prompt) stays in view.
 * A page can name the block itself with `data-kb-block` on the group.
 */
const FIELDS = 'input:not([type]), input[type=text], input[type=search], input[type=email], input[type=tel], input[type=url], input[type=number], input[type=password], textarea'
const GAP = 8
const vv = typeof window === 'undefined' ? null : window.visualViewport
const touch = () => matchMedia('(pointer: coarse)').matches
let moved = null
let frame = 0

const typingBox = el => !!el?.matches?.(FIELDS) && !el.readOnly && !el.disabled
const view = () => vv ? { top: vv.offsetTop, h: vv.height } : { top: 0, h: innerHeight }
const isFixed = el => /fixed|sticky/.test(getComputedStyle(el).position)
const scrolls = el => {
  const s = getComputedStyle(el).overflowY
  return (s === 'auto' || s === 'scroll') && el.scrollHeight > el.clientHeight + 1
}

/** The box, its label and the button that sends it: the least that has to show. */
function core(field) {
  const group = field.closest('form, fieldset, [role=dialog], dialog') || field.parentElement?.parentElement || field.parentElement
  const after = [...(group?.querySelectorAll('button, [type=submit]') || [])].find(b => field.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING)
  const parts = [field, ...(field.labels || []), after].filter(el => el && el.getBoundingClientRect().height > 2)
  const rs = parts.map(el => el.getBoundingClientRect())
  const top = Math.min(...rs.map(r => r.top)), bottom = Math.max(...rs.map(r => r.bottom))
  return { el: field, top, bottom, height: bottom - top }
}

/**
 * What to keep in view, as { el, top, bottom, height }: the biggest group around the box that fits the space above
 * the keyboard (a page can name it with data-kb-block), else the box with its label and button.
 */
export function blockFor(field, room) {
  const box = el => { const r = el.getBoundingClientRect(); return { el, top: r.top, bottom: r.bottom, height: r.height } }
  const named = field.closest('[data-kb-block]')
  if (named && named.getBoundingClientRect().height <= room) return box(named)
  let best = null
  for (let a = field.parentElement; a && a !== document.body && a !== document.documentElement; a = a.parentElement) {
    if (scrolls(a) || a.getBoundingClientRect().height > room) break
    best = a
    if (isFixed(a)) break
  }
  const c = core(field)
  return best && box(best).height >= c.height ? box(best) : c
}

/** Bottom edge of a sticky or fixed bar (the site header) covering the top of the visible area, unless the box is in it. */
function coveredTo(field, top) {
  let edge = top
  for (const el of document.elementsFromPoint(innerWidth / 2, top + 1)) {
    for (let a = el; a && a !== document.body; a = a.parentElement) {
      if (isFixed(a)) { if (!a.contains(field)) edge = Math.max(edge, a.getBoundingClientRect().bottom); break }
    }
  }
  return edge
}

function unmove() {
  if (moved) { moved.style.translate = ''; moved = null }
}

/**
 * Scroll the scrollable boxes around the block b (then the page) by up to d pixels; returns what's left. A scrolling
 * panel only scrolls until the block reaches its own edge (past that the panel would hide it), and the rest moves
 * what holds it.
 */
function scrollBy(b, d) {
  let done = 0
  for (let a = b.el.parentElement; a && Math.abs(d) > 1; a = a.parentElement) {
    if (a === document.body || a === document.documentElement) break
    if (!scrolls(a)) continue
    const edge = a.getBoundingClientRect(), top = b.top - done, bottom = b.bottom - done
    const step = d > 0 ? Math.min(d, Math.max(0, top - edge.top)) : Math.max(d, -Math.max(0, edge.bottom - bottom))
    const before = a.scrollTop
    a.scrollTop = before + step
    d -= a.scrollTop - before
    done += a.scrollTop - before
  }
  if (Math.abs(d) > 1) {
    const before = scrollY
    scrollTo(scrollX, before + d)
    d -= scrollY - before
  }
  return d
}

function fit() {
  frame = 0
  unmove()
  const field = document.activeElement
  if (!typingBox(field) || !touch()) return
  const { top, h } = view()
  const lo = Math.max(top, coveredTo(field, top)) + GAP, hi = top + h - GAP
  const b = blockFor(field, hi - lo)
  if (b.top >= lo && b.bottom <= hi) return
  let d
  if (b.height <= hi - lo) d = b.top < lo ? b.top - lo : b.bottom - hi
  else d = field.getBoundingClientRect().bottom - hi
  const block = b.el
  const left = scrollBy(b, d)
  if (Math.abs(left) <= 1) return
  // Nothing left to scroll (a fixed pop-up, or a page that never scrolls): slide the pop-up or the page's own box.
  let mover = null
  for (let a = block; a && a !== document.body; a = a.parentElement) {
    if (isFixed(a)) { mover = a; break }
    if (a.parentElement === document.body) mover = a
  }
  if (!mover) return
  mover.style.translate = `0 ${Math.round(-left)}px`
  moved = mover
}

const soon = () => { if (!frame) frame = requestAnimationFrame(fit) }

if (typeof document !== 'undefined') {
  document.addEventListener('focusin', e => {
    if (!typingBox(e.target)) return
    soon()
    // The keyboard slides in over about a third of a second; check again once it has settled.
    setTimeout(soon, 350)
  })
  // Leaving the box: wait a moment, so a tap on the button next to it lands before anything moves back.
  document.addEventListener('focusout', () => setTimeout(() => { if (!typingBox(document.activeElement)) unmove() }, 250))
  vv?.addEventListener('resize', soon)
  addEventListener('resize', soon)
}
