import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'

// Global error monitoring for production stability
window.addEventListener('error', (event) => {
  console.error('Global error:', event.message, event.filename, event.lineno);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
});

// Google sign-in is provided around the login and register routes only (see
// components/GoogleSignIn.tsx), so its script stays off every other page.
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
