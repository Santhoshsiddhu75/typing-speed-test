import { HashRouter as Router, Routes, Route, useLocation } from 'react-router-dom'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { ThemeToggle } from '@/components/ThemeToggle'
import ErrorBoundary from '@/components/ErrorBoundary'
import SetupScreen from '@/pages/SetupScreen'
import TypingTestScreen from '@/pages/TypingTestScreen'
import LoginPage from '@/pages/LoginPage'
import RegisterPage from '@/pages/RegisterPage'
import ProfilePage from '@/pages/ProfilePage'
import PrivacyPolicy from '@/pages/PrivacyPolicy'
import TermsOfService from '@/pages/TermsOfService'
import AboutPage from '@/pages/AboutPage'
import './index.css'

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