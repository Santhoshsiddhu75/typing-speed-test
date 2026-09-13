import { useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import Logo from '@/components/Logo'

/**
 * The bar across the top of Privacy, Terms and About. One component so the
 * three cannot drift apart, and so the real Logo is used rather than a drawn
 * stand-in.
 */
export const DocHeader = () => {
  const navigate = useNavigate()
  const location = useLocation()

  // React Router marks the first entry of a session with key 'default'. If
  // someone landed here straight from a search result there is nothing behind
  // them, so going "back" has to mean the home page rather than off the site.
  const goBack = useCallback(() => {
    if (location.key !== 'default') navigate(-1)
    else navigate('/')
  }, [location.key, navigate])

  return (
    <div className="tt-doc-bar">
      {/* textClassName keeps the wordmark on the brand face; everything else
          on these pages is set in the serif. */}
      <Logo size="small" showTagline={false} clickable textClassName="font-sans" />

      <button type="button" onClick={goBack} className="tt-doc-back">
        Back
      </button>
    </div>
  )
}

export default DocHeader
