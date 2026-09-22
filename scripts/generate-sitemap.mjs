/**
 * Writes dist/sitemap.xml after `vite build`.
 *
 * There used to be a hand-written public/sitemap.xml. It listed five URLs on
 * the wrong host, three of them private, with lastmod frozen at the day it was
 * typed, and it never learned about the pages added since. Generating it means
 * it cannot go stale and cannot disagree with the app's own route table —
 * src/lib/site-routes.json is read by both this script and components/Seo.tsx.
 *
 * Two rules this script lives by:
 *
 * 1. `lastmod` is the last commit that touched a page's files, or it is left
 *    out. Vercel builds from a shallow clone, and a shallow clone cannot
 *    answer the question: `git log -1 -- <path>` there does not come back
 *    empty, it comes back with the boundary commit, which appears to have
 *    introduced every file in the tree. So every page would be dated the day
 *    of the deploy, every deploy — a change Google would be told about and
 *    find nothing behind. The depth is therefore checked up front, and when
 *    the history is truncated no dates are written at all. Omitting the
 *    element is valid: Google reads a missing lastmod as "no information",
 *    which is the truth, rather than as "never".
 *
 * 2. It never fails the build. A sitemap is worth a lot less than a deploy, so
 *    every step degrades instead of throwing: dates first, then URLs without
 *    dates, then a warning and nothing. The exit code is always 0.
 */
import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const out = resolve(root, 'dist/sitemap.xml')

function git(args) {
  return execFileSync('git', args, {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  }).trim()
}

/**
 * Whether this checkout can be trusted to say when a file last changed. False
 * for a shallow clone (Vercel's default) and for no git at all.
 */
function hasUsableHistory() {
  try {
    if (git(['rev-parse', '--is-shallow-repository']) !== 'false') return false
    // A grafted history looks deep but is not; the boundary lies the same way.
    return git(['rev-parse', '--is-inside-work-tree']) === 'true'
  } catch {
    return false
  }
}

/** The date of the last commit touching any of `paths`, as YYYY-MM-DD, or null. */
function lastModified(paths) {
  try {
    const date = git(['log', '-1', '--format=%cs', '--', ...paths])
    return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null
  } catch {
    return null
  }
}

function buildXml(routes, withDates) {
  const urls = routes.map((route) => {
    const date = withDates ? lastModified(route.sources ?? []) : null
    return [
      '  <url>',
      `    <loc>${route.loc}</loc>`,
      date ? `    <lastmod>${date}</lastmod>` : null,
      route.changefreq ? `    <changefreq>${route.changefreq}</changefreq>` : null,
      route.priority ? `    <priority>${route.priority}</priority>` : null,
      '  </url>',
    ]
      .filter(Boolean)
      .join('\n')
  })

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>
`
}

try {
  const { siteUrl, routes } = JSON.parse(
    readFileSync(resolve(root, 'src/lib/site-routes.json'), 'utf8')
  )

  const included = routes
    .filter((route) => {
      if (!route.sitemap) return false
      // Advertising a page we also tell Google not to index is a contradiction.
      // Worth shouting about, not worth failing a deploy over: drop it and
      // carry on, so the sitemap that ships is at least coherent.
      if (!route.index) {
        console.warn(`sitemap.xml: skipping ${route.path} — in the sitemap but marked noindex`)
        return false
      }
      return true
    })
    .map((route) => ({
      ...route,
      loc: route.path === '/' ? `${siteUrl}/` : `${siteUrl}${route.path}`,
    }))

  const dateable = hasUsableHistory()

  mkdirSync(dirname(out), { recursive: true })
  writeFileSync(out, buildXml(included, dateable), 'utf8')

  const dated = (readFileSync(out, 'utf8').match(/<lastmod>/g) ?? []).length
  console.log(
    `sitemap.xml: ${included.length} URLs on ${siteUrl}, ${dated} with lastmod` +
      (dateable ? '' : ' (shallow or absent git history — no dates claimed)')
  )
} catch (error) {
  console.warn(`sitemap.xml: ${error.message}`)
  try {
    const { siteUrl, routes } = JSON.parse(
      readFileSync(resolve(root, 'src/lib/site-routes.json'), 'utf8')
    )
    const included = routes
      .filter((route) => route.sitemap && route.index)
      .map((route) => ({
        ...route,
        loc: route.path === '/' ? `${siteUrl}/` : `${siteUrl}${route.path}`,
      }))
    mkdirSync(dirname(out), { recursive: true })
    writeFileSync(out, buildXml(included, false), 'utf8')
    console.warn(`sitemap.xml: wrote ${included.length} URLs without lastmod`)
  } catch (fallbackError) {
    // Nothing left to try. Say so loudly and let the deploy go ahead; the
    // sitemap can be fixed and redeployed, a failed build cannot be used.
    console.warn(`sitemap.xml: NOT WRITTEN (${fallbackError.message})`)
  }
}
