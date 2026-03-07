#!/usr/bin/env node
/**
 * Patches Next.js 14.2.35 to fix local `next build` for apps that use
 * `'use client'` pages (no server-side RSC context in build workers).
 *
 * Applied automatically via `npm run postinstall`.
 * Safe to run multiple times (idempotent).
 */

const fs = require('fs')
const path = require('path')

let patchCount = 0

function patch(filePath, oldStr, newStr, description, marker) {
  const abs = path.join(__dirname, '..', filePath)
  if (!fs.existsSync(abs)) {
    console.warn(`  SKIP (not found): ${filePath}`)
    return
  }
  let content = fs.readFileSync(abs, 'utf8')
  const alreadyPatchedStr = marker || newStr
  if (content.includes(alreadyPatchedStr)) {
    console.log(`  already patched: ${description}`)
    return
  }
  if (!content.includes(oldStr)) {
    console.warn(`  SKIP (pattern not found): ${description}`)
    return
  }
  content = content.replace(oldStr, newStr)
  fs.writeFileSync(abs, content, 'utf8')
  console.log(`  patched: ${description}`)
  patchCount++
}

console.log('Applying Next.js 14 local-build patches...')

// ── 1. utils.js: guard patchFetch call for 'use client' pages ─────────────
patch(
  'node_modules/next/dist/build/utils.js',
  'ComponentMod.patchFetch();',
  'typeof ComponentMod.patchFetch === "function" && ComponentMod.patchFetch();',
  'utils.js – patchFetch guard'
)

// ── 2. utils.js: guard staticGenerationAsyncStorage for 'use client' pages ─
patch(
  'node_modules/next/dist/build/utils.js',
  'typeof ComponentMod.patchFetch === "function" && ComponentMod.patchFetch();\n    let CacheHandler;',
  'typeof ComponentMod.patchFetch === "function" && ComponentMod.patchFetch();\n    if (!ComponentMod.staticGenerationAsyncStorage) {\n        return { paths: undefined, fallback: true, encodedPaths: undefined };\n    }\n    let CacheHandler;',
  'utils.js – staticGenerationAsyncStorage guard'
)

// ── 3. app-page.runtime.prod.js: guard staticGenStorage.run (1st wrap) ─────
patch(
  'node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js',
  '};return e.run(l,o,l)}}',
  '};return e?e.run(l,o,l):o(l)}}',
  'app-page.runtime.prod.js – staticGenStorage.run guard'
)

// ── 4. app-page.runtime.prod.js: guard requestStorage.run (2nd wrap) ───────
patch(
  'node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js',
  'return r.store=s,e.run(s,o,s)',
  'return r.store=s,e?e.run(s,o,s):o(s)',
  'app-page.runtime.prod.js – requestStorage.run guard'
)

// ── 5. app-page.runtime.prod.js: guard patchFetch call in render ────────────
patch(
  'node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js',
  ';_.patchFetch();',
  ';typeof _.patchFetch==="function"&&_.patchFetch();',
  'app-page.runtime.prod.js – patchFetch guard'
)

// ── 6. app-page.runtime.prod.js: guard preloadStyle call ────────────────────
patch(
  'node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js',
  'e.componentMod.preloadStyle(n,e.renderOpts.crossOrigin),(0,g.jsx)(',
  'typeof e.componentMod.preloadStyle==="function"&&e.componentMod.preloadStyle(n,e.renderOpts.crossOrigin),(0,g.jsx)(',
  'app-page.runtime.prod.js – preloadStyle guard'
)

// ── 7. exportAppPage: treat TypeError from client pages as dynamic (revalidate:0) ─
patch(
  'node_modules/next/dist/export/routes/app-page.js',
  `    } catch (err) {
        if (!(0, _isdynamicusageerror.isDynamicUsageError)(err)) {
            throw err;
        }`,
  `    } catch (err) {
        // Treat TypeErrors from 'use client' pages (no RSC context) as dynamic.
        if (err instanceof TypeError && (
            err.message.includes('is not a function') ||
            err.message.includes('Cannot read properties of undefined')
        )) {
            return { revalidate: 0 };
        }
        if (!(0, _isdynamicusageerror.isDynamicUsageError)(err)) {
            throw err;
        }`,
  'app-page.js – TypeError catch for client pages',
  'err instanceof TypeError'
)

// ── 8. styled-jsx/style.js: add hoist shim (needed for pages router 404/500) ─
const styledJsxPath = path.join(__dirname, '../node_modules/styled-jsx/style.js')
if (fs.existsSync(styledJsxPath)) {
  const content = fs.readFileSync(styledJsxPath, 'utf8')
  if (!content.includes('hoist')) {
    const newContent = `const style = require('./dist/index').style

// Next.js 14 Pages Router pages expect a \`hoist\` function from styled-jsx/style.
// styled-jsx 5.x removed it; add a no-op shim so \`next build\` works locally.
if (!style.hoist) {
  style.hoist = function(mod, key) {
    if (mod && mod[key]) return mod[key]
    return undefined
  }
}

module.exports = style
`
    fs.writeFileSync(styledJsxPath, newContent, 'utf8')
    console.log('  patched: styled-jsx/style.js – hoist shim')
    patchCount++
  } else {
    console.log('  already patched: styled-jsx/style.js – hoist shim')
  }
}

console.log(`Done. ${patchCount} file(s) patched.`)
