import { HashRouter as Router, Routes, Route, useLocation } from 'react-router-dom'
import { Suspense, lazy } from 'react'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { ThemeToggle } from '@/components/ThemeToggle'
import ErrorBoundary from '@/components/ErrorBoundary'
const SetupScreen = lazy(() => import('@/pages/SetupScreen'))
const TypingTestScreen = lazy(() => import('@/pages/TypingTestScreen'))
const LoginPage = lazy(() => import('@/pages/LoginPage'))
const RegisterPage = lazy(() => import('@/pages/RegisterPage'))
const ProfilePage = lazy(() => import('@/pages/ProfilePage'))
const PrivacyPolicy = lazy(() => import('@/pages/PrivacyPolicy'))
const TermsOfService = lazy(() => import('@/pages/TermsOfService'))
const AboutPage = lazy(() => import('@/pages/AboutPage'))
import './index.css'

// Loading component for route transitions - critical for Indian mobile users
function RouteLoadingSpinner() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        <p className="text-muted-foreground text-sm">Preparing your typing test...</p>
      </div>
    </div>
  );
}

function AppContent() {
  const location = useLocation();
  const isAuthPage = location.pathname === '/login' || location.pathname === '/register';
  const isTestPage = location.pathname === '/test';
  const isProfilePage = location.pathname === '/profile';
  const isSetupPage = location.pathname === '/';
  const isLegalPage = location.pathname === '/privacy' || location.pathname === '/terms' || location.pathname === '/about';

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
      {!isAuthPage && !isTestPage && !isProfilePage && !isSetupPage && !isLegalPage && <ThemeToggle />}
      <Suspense fallback={<RouteLoadingSpinner />}>
        <Routes>
          <Route path="/" element={<SetupScreen />} />
          <Route path="/test" element={<TypingTestScreen />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<TermsOfService />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <ErrorBoundary>
        <Router>
          <AppContent />
        </Router>
      </ErrorBoundary>
    </ThemeProvider>
  )
}

// 404 Page Component
function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold">404</h1>
        <p className="text-muted-foreground">Page not found</p>
        <a href="/" className="inline-block px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors">
          Go Home
        </a>
      </div>
    </div>
  )
}

export default App