import * as React from "react"
import LoginForm, { LoginFormData } from "./LoginForm"

/**
 * Demo component showing how to use the LoginForm component
 * This component demonstrates proper usage with loading states and error handling
 */
const LoginFormDemo: React.FC = () => {
  const [isLoading, setIsLoading] = React.useState(false)

  const handleLogin = async (data: LoginFormData) => {
    setIsLoading(true)
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    console.log("Login attempt:", {
      username: data.username,
      password: "***hidden***", // Don't log actual passwords
      rememberMe: data.rememberMe,
    })
    
    // Simulate success/failure
    if (data.username === "testuser" && data.password === "password123") {
      console.log("Login successful!")
      // Handle successful login (redirect, set auth state, etc.)
    } else {
      // Simulate error
      throw new Error("Invalid email or password")
    }
    
    setIsLoading(false)
  }

  const handleForgotPassword = () => {
    console.log("Forgot password clicked")
    // Handle forgot password flow (open modal, navigate to reset page, etc.)
    alert("Forgot password functionality would be implemented here")
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold">Login Demo</h1>
          <p className="text-muted-foreground mt-2">
            Try: test@example.com / password123
          </p>
        </div>
        
        <LoginForm
          onSubmit={handleLogin}
          onForgotPassword={handleForgotPassword}
          isLoading={isLoading}
        />
        
        <div className="mt-8 text-center">
          <p className="text-sm text-muted-foreground">
            This is a demo component. Check the console for form submission data.
          </p>
        </div>
      </div>
    </div>
  )
}

export { LoginFormDemo }