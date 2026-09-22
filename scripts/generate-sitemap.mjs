/**
 * Writes dist/sitemap.xml after `vite build`.
 *
 * There used to be a hand-written public/sitemap.xml. It listed five URLs on
 * the wrong host, three of them private, with lastmod frozen at the day it was
 * typed, and it never learned about the pages added since. Generating it means
 * it cannot go stale and cannot disagree with the app's own route table —
 * src/lib/site-routes.json is read by both this script and components/Seo.tsx.
 *
 * lastmod comes from the last commit that touched the files behind each page,
 * so it says something true. Vercel's build has the git history; if it ever
 * doesn't, each date falls back to the build date rather than failing.
 */
import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const { siteUrl, routes } = JSON.parse(
  readFileSync(resolve(root, 'src/lib/site-routes.json'), 'utf8')
)

const today = new Date().toISOString().slice(0, 10)

/** The date of the last commit touching any of `paths`, as YYYY-MM-DD. */
function lastModified(paths) {
  try {
    const out = execFileSync('git', ['log', '-1', '--format=%cs', '--', ...paths], {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim()
    return /^\d{4}-\d{2}-\d{2}$/.test(out) ? out : today
  } catch {
    return today
  }
}

const included = routes.filter((route) => route.sitemap)

// A route that is kept out of the index has no business being advertised.
const contradiction = included.find((route) => !route.index)
if (contradiction) {
  throw new Error(
    `${contradiction.path} is in the sitemap but marked noindex — fix site-routes.json`
  )
}

const urls = included
  .map((route) => {
    const loc = route.path === '/' ? `${siteUrl}/` : `${siteUrl}${route.path}`
    return [
      '  <url>',
      `    <loc>${loc}</loc>`,
      `    <lastmod>${lastModified(route.sources)}</lastmod>`,
      route.changefreq ? `    <changefreq>${route.changefreq}</changefreq>` : null,
      route.priority ? `    <priority>${route.priority}</priority>` : null,
      '  </url>',
    ]
      .filter(Boolean)
      .join('\n')
  })
  .join('\n')

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`

const out = resolve(root, 'dist/sitemap.xml')
mkdirSync(dirname(out), { recursive: true })
writeFileSync(out, xml, 'utf8')

console.log(`sitemap.xml: ${included.length} URLs on ${siteUrl}`)
