import { Link } from 'react-router-dom'
import { Rows } from '@/components/legal/DocPage'
import DocHeader from '@/components/legal/DocHeader'
import { CONTACT_EMAIL } from '@/lib/seo'

/**
 * Set like About, Privacy and Terms rather than as its own thing, so the four
 * read as one set of pages. No new CSS: every class here already exists.
 *
 * The address is a real mailto link rather than text you have to retype, and
 * it is the same one the privacy policy gives for account deletion — one
 * address, so neither page can start pointing somewhere the other doesn't.
 */
const ContactPage = () => {

  return (
    <div className="tt-doc">
      <DocHeader />

      <div className="tt-doc-masthead">
        <h1>Get in touch.</h1>
        <p className="tt-doc-standfirst">
          TapTest is made by one person. There is no support desk and no ticket number — just an
          address that is read.
        </p>
      </div>
      <div className="tt-doc-rule">
        <span />
      </div>

      <div className="tt-doc-wrap is-single">
        <div className="tt-doc-body">
          <section>
            <div className="tt-contact">
              <b>Email</b> <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
            </div>
            <p className="tt-quiet">
              Most messages get an answer within a few days. During a test there is also a feedback
              button in the top bar, which sends the same thing without leaving the page.
            </p>
          </section>

          <section>
            <div className="tt-sec-head">
              <div className="tt-sec-num">01</div>
              <h2>What to send</h2>
            </div>
            <Rows
              items={[
                [
                  'Something broke',
                  'Say which page, what you did, and what happened instead. The browser and whether you were on a phone help more than anything else.',
                ],
                [
                  'A passage reads wrong',
                  'Typos, a sentence that does not scan, text that felt mis-graded. Quote the line and it can be fixed or pulled.',
                ],
                [
                  'Your account or your data',
                  'Exports, corrections, or deleting the account outright. Send it from the address you signed up with.',
                ],
                [
                  'Anything else',
                  'A word you want in the passage library, a feature you keep reaching for, or an advertising enquiry.',
                ],
              ]}
            />
          </section>

          <section>
            <div className="tt-sec-head">
              <div className="tt-sec-num">02</div>
              <h2>Before you write</h2>
            </div>
            <p>
              Two answers are already written down. <Link to="/about">About</Link> covers why the
              tests use real sentences and how the difficulty levels are graded. The{' '}
              <Link to="/privacy">privacy policy</Link> covers what is stored when you take a test,
              and how to have it removed.
            </p>
            <p className="tt-quiet">
              Nothing you send is passed on or sold. Feedback is delivered by EmailJS and lands in
              the same inbox as everything else.
            </p>
          </section>

          <section className="tt-closer">
            <h2>Or just take the test.</h2>
            <Link to="/start" className="tt-closer-cta">
              Start a 1-minute test
            </Link>
            <p className="tt-quiet" style={{ marginTop: 12 }}>
              No account needed.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}

export default ContactPage
