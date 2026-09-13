import { ReactNode, useCallback, useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import DocHeader from './DocHeader'

export interface DocSection {
  id: string
  title: string
  body: ReactNode
}

interface DocPageProps {
  title: string
  standfirst: string
  meta: string[]
  sections: DocSection[]
}

/**
 * A legal document, set as one editorial column rather than a stack of cards.
 *
 * Sections are numbered because these are clauses people cite — "section 4" —
 * not because numbered markers look tidy. The contents list is real navigation
 * for a long page: it scrolls to a section and tracks which one you are in.
 */
export const DocPage: React.FC<DocPageProps> = ({ title, standfirst, meta, sections }) => {
  const [active, setActive] = useState(sections[0]?.id ?? '')
  const bodyRef = useRef<HTMLDivElement>(null)

  const goTo = useCallback((id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  // index.css makes #root the scroll container, not the window, so the
  // observer has to be told that or it never fires.
  useEffect(() => {
    const scroller = document.getElementById('root')

    const observer = new IntersectionObserver(
      (entries) => {
        const inView = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)

        if (inView[0]) setActive(inView[0].target.id)
      },
      { root: scroller, rootMargin: '-12% 0px -72% 0px', threshold: 0 }
    )

    sections.forEach(({ id }) => {
      const el = document.getElementById(id)
      if (el) observer.observe(el)
    })

    return () => observer.disconnect()
  }, [sections])

  return (
    <div className="tt-doc">
      <DocHeader />

      <div className="tt-doc-masthead">
        <h1>{title}</h1>
        <p className="tt-doc-standfirst">{standfirst}</p>
        <div className="tt-doc-meta">
          {meta.map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>
      </div>
      <div className="tt-doc-rule">
        <span />
      </div>

      <div className="tt-doc-wrap">
        <nav className="tt-toc" aria-label="Contents">
          <div className="tt-toc-title">CONTENTS</div>
          <ol>
            {sections.map((section) => (
              <li key={section.id}>
                <button
                  type="button"
                  onClick={() => goTo(section.id)}
                  className={cn(active === section.id && 'is-here')}
                  aria-current={active === section.id ? 'true' : undefined}
                >
                  {section.title}
                </button>
              </li>
            ))}
          </ol>
        </nav>

        <div className="tt-doc-body" ref={bodyRef}>
          {sections.map((section, index) => (
            <section key={section.id} id={section.id}>
              <div className="tt-sec-head">
                <div className="tt-sec-num">{String(index + 1).padStart(2, '0')}</div>
                <h2>{section.title}</h2>
              </div>
              {section.body}
            </section>
          ))}
        </div>
      </div>
    </div>
  )
}

/** The term, then what it means. Used instead of a grid of little cards. */
export const Rows: React.FC<{ items: Array<[string, ReactNode]> }> = ({ items }) => (
  <dl className="tt-rows">
    {items.map(([term, meaning]) => (
      <div className="tt-row" key={term}>
        <dt>{term}</dt>
        <dd>{meaning}</dd>
      </div>
    ))}
  </dl>
)

export default DocPage
