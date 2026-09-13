import { Link, useNavigate } from 'react-router-dom'
import { Rows } from '@/components/legal/DocPage'

/**
 * Measured, not claimed. These are the figures `npm run check:passages`
 * enforces against the library, and each sample is a verbatim opening line
 * from the matching file in src/data/passages.
 */
const LEVELS = [
  {
    name: 'Easy',
    chars: '3.8',
    sample: 'The rain started just after lunch. We sat by the window and watched it fall on the garden.',
  },
  {
    name: 'Medium',
    chars: '5.9',
    sample: 'The bicycle changed ordinary life faster than almost any invention before it.',
  },
  {
    name: 'Hard',
    chars: '8.0',
    sample:
      'Distributed systems must reconcile consistency against availability whenever network partitions interrupt communication.',
  },
]

const AboutPage = () => {
  const navigate = useNavigate()

  return (
    <div className="tt-doc">
      <div className="tt-doc-bar">
        <Link to="/" className="tt-doc-brand" aria-label="TapTest home">
          <svg width="30" height="30" viewBox="0 0 64 64" aria-hidden="true">
            <rect x="8" y="14" width="48" height="40" rx="9" fill="var(--primary-deep)" />
            <rect x="8" y="9" width="48" height="40" rx="9" fill="var(--primary)" />
            <rect x="17" y="17" width="30" height="23" rx="5" fill="var(--background)" />
          </svg>
          <span className="tt-doc-brand-name">TapTest</span>
        </Link>
        <Link to="/start" className="tt-doc-back">
          Back to the test
        </Link>
      </div>

      <div className="tt-doc-masthead tt-about-masthead">
        <h1>
          Most typing tests
          <br />
          measure the wrong thing.
        </h1>
        <p className="tt-doc-standfirst">
          They feed you scrambled word lists. You get very good at hitting keys in an order nobody
          writes in. TapTest uses real sentences instead.
        </p>
      </div>
      <div className="tt-doc-rule">
        <span />
      </div>

      <div className="tt-doc-wrap is-single">
        <div className="tt-doc-body">
          <section>
            <p>
              A word list tells you how fast your fingers move. Prose tells you how fast you can
              actually write — because real writing has commas, capital letters, long words you have
              to think about, and the rhythm of a sentence carrying you into the next one.
            </p>
            <p>
              So every test here is drawn from a library of passages written for the purpose. Three
              difficulty levels, and what separates them is measurable: average word length.
            </p>
          </section>

          <section style={{ borderBottom: 'none' }}>
            <div className="tt-levels">
              {LEVELS.map((level) => (
                <div className="tt-level" key={level.name}>
                  <div className="tt-level-top">
                    <span className="tt-level-name">{level.name}</span>
                    <span className="tt-level-num">{level.chars}</span>
                  </div>
                  <div className="tt-level-unit">characters per word</div>
                  <p className="tt-level-sample">{level.sample}</p>
                </div>
              ))}
            </div>
            <p className="tt-quiet" style={{ marginTop: 16 }}>
              Roughly two characters apart at each step, and every passage is checked against its
              band before it ships. The words genuinely get longer; the sentences stay readable.
            </p>
          </section>

          <section>
            <div className="tt-sec-head">
              <div className="tt-sec-num">01</div>
              <h2>What you get</h2>
            </div>
            <Rows
              items={[
                ['Three lengths', 'One, two or five minutes. Long enough to be honest, short enough to do again.'],
                [
                  'Live feedback',
                  'Words per minute and accuracy as you type, with mistakes marked where you made them.',
                ],
                [
                  'A history',
                  'Sign in and every result is kept, charted over time, and exportable as a CSV whenever you want it.',
                ],
                ['No paywall', 'Free, and no account needed to take a test. Advertising covers the hosting.'],
              ]}
            />
          </section>

          <section>
            <div className="tt-sec-head">
              <div className="tt-sec-num">02</div>
              <h2>How it is built</h2>
            </div>
            <p>
              Your results belong to you. They are yours to export and yours to delete, passwords are
              hashed with bcrypt, and everything moves over HTTPS. The{' '}
              <Link to="/privacy">privacy policy</Link> spells out exactly what is collected, in
              about two minutes of reading.
            </p>
            <p className="tt-quiet">
              It works on a phone as well as a desktop, and follows your system's dark mode.
            </p>
          </section>

          <section className="tt-closer">
            <h2>Find out what you actually type at.</h2>
            <button type="button" className="tt-closer-cta" onClick={() => navigate('/start')}>
              Start a 1-minute test
            </button>
            <p className="tt-quiet" style={{ marginTop: 12 }}>
              No account needed.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}

export default AboutPage
