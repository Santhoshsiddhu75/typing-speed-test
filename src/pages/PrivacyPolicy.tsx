import { Link } from 'react-router-dom'
import DocPage, { DocSection, Rows } from '@/components/legal/DocPage'

/**
 * Fixed, not `new Date()`. A policy that claims to have been revised today,
 * every day, tells a reader nothing — update this by hand when the terms
 * actually change.
 */
const LAST_UPDATED = '12 September 2026'

const sections: DocSection[] = [
  {
    id: 'collect',
    title: 'What we collect',
    body: (
      <>
        <p>
          Only what the service needs to work. You can take a typing test without an account, and
          without giving us anything at all.
        </p>
        <Rows
          items={[
            ['Account', 'Your username and an encrypted password, or your Google account if you sign in that way.'],
            [
              'Test results',
              'Words per minute, characters per minute, accuracy, how many characters you got right and wrong, the duration, the difficulty and the time of each test.',
            ],
            ['Usage', 'Which pages you visit and how you interact with them, in aggregate.'],
            ['Feedback', 'Your message, the page you sent it from, and basic browser information.'],
          ]}
        />
      </>
    ),
  },
  {
    id: 'cookies',
    title: 'Cookies and storage',
    body: (
      <>
        <p>
          Cookies and local storage keep you signed in and remember whether you prefer the light or
          dark theme. Your session is held in a JWT token in your browser, which expires on its own.
        </p>
        <p className="tt-quiet">
          Google AdSense serves the advertising and may set its own cookies to personalise what you
          see. Google explains that at{' '}
          <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">
            policies.google.com/privacy
          </a>
          , and you can turn personalisation off at{' '}
          <a href="https://adssettings.google.com" target="_blank" rel="noopener noreferrer">
            adssettings.google.com
          </a>
          .
        </p>
      </>
    ),
  },
  {
    id: 'use',
    title: 'How we use it',
    body: (
      <>
        <p>
          To run your account, save your results so you can see them improve, answer your feedback,
          understand which parts of TapTest people actually use, and serve the advertising that keeps
          it free.
        </p>
        <p className="tt-quiet">
          That is the complete list. We do not build profiles of you for any other purpose.
        </p>
      </>
    ),
  },
  {
    id: 'sharing',
    title: 'Who else sees it',
    body: (
      <>
        <div className="tt-callout">
          We have never sold, rented or traded your personal information, and we do not intend to.
        </div>
        <p>Four services process data on our behalf:</p>
        <Rows
          items={[
            ['Google OAuth', 'Signing in with Google, if you choose to.'],
            ['Google AdSense', 'Advertising, including the cookies described above.'],
            ['Microsoft Clarity', 'Anonymised analytics, including heatmaps and session recordings of how pages are used.'],
            ['EmailJS', 'Delivering your feedback messages to us.'],
          ]}
        />
        <p className="tt-quiet">
          We may also disclose information where the law requires it, or to protect the safety of
          TapTest and the people using it.
        </p>
      </>
    ),
  },
  {
    id: 'choices',
    title: 'Your choices',
    body: (
      <Rows
        items={[
          ['See and edit', 'Your profile page holds everything we have about you.'],
          ['Export', 'Download your full test history as a CSV from your profile.'],
          ['Delete', 'Remove tests from your profile, or email us to delete the account entirely.'],
          [
            'Advertising',
            <>
              Control personalised ads at{' '}
              <a href="https://adssettings.google.com" target="_blank" rel="noopener noreferrer">
                adssettings.google.com
              </a>
              .
            </>,
          ],
        ]}
      />
    ),
  },
  {
    id: 'security',
    title: 'How it is kept',
    body: (
      <>
        <p>
          Passwords are hashed with bcrypt and never stored in a form anyone can read. Everything
          travels over HTTPS, and access to personal data is limited to what running the service
          requires.
        </p>
        <p className="tt-quiet">
          No transmission over the internet is completely secure, so use a strong password and keep
          it to yourself. If you sign in with Google, we never see your Google password at all.
        </p>
      </>
    ),
  },
  {
    id: 'changes',
    title: 'Changes and contact',
    body: (
      <>
        <p>
          When this policy changes, the updated version appears here and the date at the top changes
          with it. Continuing to use TapTest after that means accepting the new version.
        </p>
        <div className="tt-contact">
          <b>Email</b> taptest321@gmail.com
          <br />
          <b>Feedback</b> the feedback button in the navigation
          <br />
          <b>Reply</b> usually within 24–48 hours
        </div>
        <p className="tt-quiet">
          See also the <Link to="/terms">Terms of Service</Link>.
        </p>
      </>
    ),
  },
]

const PrivacyPolicy = () => (
  <DocPage
    title="Privacy Policy"
    standfirst="What TapTest collects, why it collects it, and what you can do about it."
    meta={[`Last updated ${LAST_UPDATED}`, 'taptest321@gmail.com']}
    sections={sections}
  />
)

export default PrivacyPolicy
