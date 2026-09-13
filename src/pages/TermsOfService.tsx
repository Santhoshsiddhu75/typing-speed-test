import { Link } from 'react-router-dom'
import DocPage, { DocSection, Rows } from '@/components/legal/DocPage'

/** Fixed, not `new Date()`. See the note in PrivacyPolicy.tsx. */
const LAST_UPDATED = '12 September 2026'

/**
 * The previous version shipped the literal string "[Your Jurisdiction]" to
 * production. This keeps it visible as a placeholder rather than guessing a
 * legal fact — replace it and delete this comment.
 */
const JURISDICTION = '[JURISDICTION]'

const sections: DocSection[] = [
  {
    id: 'using',
    title: 'Using TapTest',
    body: (
      <>
        <p>
          Using the site means accepting these terms. If you would rather not, that is entirely
          reasonable, but please do not use the service.
        </p>
        <div className="tt-split">
          <div className="tt-yes">
            <div className="tt-split-head">PERMITTED</div>
            <ul>
              <li>Practise as much as you like</li>
              <li>Keep an account and track your progress</li>
              <li>Export your own results</li>
              <li>Share your scores anywhere you want</li>
              <li>Send us feedback, including the unflattering kind</li>
            </ul>
          </div>
          <div className="tt-no">
            <div className="tt-split-head">NOT PERMITTED</div>
            <ul>
              <li>Scripts or bots to inflate a score</li>
              <li>Hacking, reverse engineering or exploiting the service</li>
              <li>Sharing your account with other people</li>
              <li>Anything illegal</li>
              <li>Disrupting the service or its servers</li>
              <li>Copying or redistributing our content</li>
            </ul>
          </div>
        </div>
      </>
    ),
  },
  {
    id: 'account',
    title: 'Your account',
    body: (
      <>
        <p>
          Sign up with a username and password, or with Google. Keep your credentials to yourself,
          because anything done under your account is treated as done by you. Tell us straight away
          if you think someone else has got in.
        </p>
        <p className="tt-quiet">
          We may suspend or close accounts that break these terms. You can close yours whenever you
          like by emailing us.
        </p>
      </>
    ),
  },
  {
    id: 'ownership',
    title: 'Who owns what',
    body: (
      <Rows
        items={[
          [
            'Ours',
            'TapTest itself — the site, its features and its design — along with the passages written for the typing tests.',
          ],
          [
            'Yours',
            'Your results and your personal data. You grant us only the licence needed to store and process them so the service can work.',
          ],
          [
            'Disputed',
            'Test passages are original writing or public domain. If you believe something here infringes your rights, email us and we will take it down while we look.',
          ],
        ]}
      />
    ),
  },
  {
    id: 'availability',
    title: 'Availability',
    body: (
      <>
        <p>
          TapTest is free, and free services go down sometimes. We do not promise any particular
          uptime, and we may change, pause or retire parts of it — with reasonable notice where that
          is possible.
        </p>
        <div className="tt-callout">
          We take backups, but do not rely on them as your only copy. Export your results from your
          profile now and then.
        </div>
      </>
    ),
  },
  {
    id: 'liability',
    title: 'Liability',
    body: (
      <>
        <p>
          TapTest is provided as is and as available, without warranties of any kind, express or
          implied — including merchantability, fitness for a particular purpose and non-infringement.
        </p>
        <p className="tt-quiet">
          We are not liable for indirect, incidental, special or consequential losses, including lost
          profits, data or goodwill. Where liability cannot be excluded, it is capped at whatever you
          have paid us in the past twelve months, or one hundred dollars, whichever is greater. You
          have almost certainly paid us nothing.
        </p>
      </>
    ),
  },
  {
    id: 'advertising',
    title: 'Advertising and other sites',
    body: (
      <>
        <p>
          Advertising is served by Google AdSense and its partners. We do not choose the individual
          adverts and are not responsible for their content or for what advertisers do.
        </p>
        <p className="tt-quiet">
          Links out of TapTest lead to sites we do not control. Their content and their privacy
          practices are their own.
        </p>
      </>
    ),
  },
  {
    id: 'law',
    title: 'Law, changes and contact',
    body: (
      <>
        <p>
          These terms are governed by the laws of {JURISDICTION}. Disputes should first be raised
          with us directly and settled in good faith; failing that, through binding arbitration.
        </p>
        <p className="tt-quiet">
          We may revise these terms. The current version always lives on this page, and the date at
          the top changes when it does.
        </p>
        <div className="tt-contact">
          <b>Email</b> taptest321@gmail.com
          <br />
          <b>Feedback</b> the feedback button in the navigation
        </div>
        <p className="tt-quiet">
          See also the <Link to="/privacy">Privacy Policy</Link>.
        </p>
      </>
    ),
  },
]

const TermsOfService = () => (
  <DocPage
    title="Terms of Service"
    standfirst="The short version: practise as much as you like, do not cheat the scores, and we make no promises about uptime."
    meta={[`Last updated ${LAST_UPDATED}`, `Governed by ${JURISDICTION}`, 'taptest321@gmail.com']}
    sections={sections}
  />
)

export default TermsOfService
