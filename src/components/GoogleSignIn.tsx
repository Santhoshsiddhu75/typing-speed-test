import type { ReactNode } from 'react'
import { GoogleOAuthProvider } from '@react-oauth/google'

const GOOGLE_CLIENT_ID = '1087194439568-iago6f9biafj9f0e0glgo7pfuga0mg0k.apps.googleusercontent.com'

/**
 * Google's sign-in script is about 100 KB, and the provider loads it the moment
 * it mounts. It used to wrap the whole app, so every visitor to the homepage
 * paid for it. Only the login and register pages sign anyone in with Google,
 * so only they sit inside it.
 */
export const WithGoogleSignIn = ({ children }: { children: ReactNode }) => (
  <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>{children}</GoogleOAuthProvider>
)

export default WithGoogleSignIn
