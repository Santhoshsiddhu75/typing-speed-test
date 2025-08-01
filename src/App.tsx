import { HashRouter as Router, Routes, Route } from 'react-router-dom'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { ThemeToggle } from '@/components/ThemeToggle'
import ErrorBoundary from '@/components/ErrorBoundary'
import SetupScreen from '@/pages/SetupScreen'
import TypingTestScreen from '@/pages/TypingTestScreen'
import './index.css'

function App() {
  return (
    <ThemeProvider>
      <ErrorBoundary>
        <Router>
          <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
            <ThemeToggle />
            <Routes>
              <Route path="/" element={<SetupScreen />} />
              <Route path="/test" element={<TypingTestScreen />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </div>
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