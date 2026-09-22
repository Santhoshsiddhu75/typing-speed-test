import { Helmet } from 'react-helmet-async'
import { useLocation } from 'react-router-dom'
import {
  OG_IMAGE,
  OG_IMAGE_HEIGHT,
  OG_IMAGE_WIDTH,
  SITE_NAME,
  absoluteUrl,
  findRoute,
  structuredDataFor,
} from '@/lib/seo'

interface SeoProps {
  /** Only for pages with no entry in the route table, i.e. the 404. */
  title?: string
  description?: string
  index?: boolean
}

/**
 * The head of every page.
 *
 * One component rather than per-page tags, so a route cannot quietly ship
 * without a canonical or with the homepage's description. Anything it renders
 * replaces the matching tag in index.html, which is marked `data-rh="true"`
 * for exactly that purpose.
 *
 * The canonical ignores the query string on purpose: /test?timer=1 and
 * /test?timer=5 are the same page configured differently, not two pages.
 */
export const Seo = ({ title, description, index }: SeoProps) => {
  const { pathname } = useLocation()
  const route = findRoute(pathname)

  const pageTitle = route?.title ?? title ?? `Page Not Found — ${SITE_NAME}`
  const pageDescription =
    route?.description ??
    description ??
    "That page doesn't exist. Head back to TapTest and take a typing speed test instead."
  const indexable = route?.index ?? index ?? false
  const canonical = absoluteUrl(route?.path ?? pathname)

  return (
    <Helmet prioritizeSeoTags>
      <html lang="en" />
      <title>{pageTitle}</title>
      <meta name="description" content={pageDescription} />
      <link rel="canonical" href={canonical} />
      <meta
        name="robots"
        content={indexable ? 'index, follow, max-image-preview:large' : 'noindex, follow'}
      />

      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:type" content="website" />
      <meta property="og:title" content={pageTitle} />
      <meta property="og:description" content={pageDescription} />
      <meta property="og:url" content={canonical} />
      <meta property="og:locale" content="en_IN" />
      <meta property="og:image" content={OG_IMAGE} />
      <meta property="og:image:width" content={String(OG_IMAGE_WIDTH)} />
      <meta property="og:image:height" content={String(OG_IMAGE_HEIGHT)} />
      <meta property="og:image:alt" content="TapTest — a typing speed test" />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={pageTitle} />
      <meta name="twitter:description" content={pageDescription} />
      <meta name="twitter:image" content={OG_IMAGE} />

      {indexable && (
        <script type="application/ld+json">{structuredDataFor(route?.path ?? pathname)}</script>
      )}
    </Helmet>
  )
}

export default Seo
