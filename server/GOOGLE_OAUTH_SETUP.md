# Google OAuth Setup Guide

This guide will help you set up Google OAuth authentication for the TapTest application.

## 🚀 Quick Setup for Development

### Step 1: Google Cloud Console Setup

1. **Go to Google Cloud Console**
   - Visit: https://console.cloud.google.com/
   - Sign in with your Google account

2. **Create a New Project** (or select existing)
   - Click "Select a project" → "New Project"
   - Project Name: `TapTest` or your preferred name
   - Click "Create"

3. **Enable Google+ API**
   - Go to "APIs & Services" → "Library"
   - Search for "Google+ API" 
   - Click "Enable"

### Step 2: Create OAuth Credentials

1. **Go to Credentials**
   - Navigate to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "OAuth 2.0 Client IDs"

2. **Configure OAuth Consent Screen** (if not done)
   - Click "Configure Consent Screen"
   - Choose "External" for testing (Internal for organization use)
   - Fill required fields:
     - App Name: `TapTest`
     - User Support Email: Your email
     - Developer Contact: Your email
   - Save and continue through all steps

3. **Create OAuth Client ID**
   - Application Type: `Web application`
   - Name: `TapTest Web Client`
   - Authorized JavaScript origins:
     ```
     http://localhost:5173
     http://localhost:3000
     http://localhost:4173
     ```
   - Authorized redirect URIs:
     ```
     http://localhost:5173/auth/google/callback
     http://localhost:3000/auth/google/callback
     ```
   - Click "Create"

4. **Copy Credentials**
   - Copy the `Client ID` and `Client Secret`
   - Keep these secure!

### Step 3: Configure Environment

1. **Copy environment file**:
   ```bash
   cd server
   cp .env.development .env
   ```

2. **Update .env file**:
   ```bash
   # Replace these with your actual Google OAuth credentials
   GOOGLE_CLIENT_ID=your-client-id-here.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=your-client-secret-here
   ```

### Step 4: Install Dependencies

```bash
cd server
npm install
```

The `google-auth-library` is already included in package.json.

## 🧪 Testing Google OAuth

### API Endpoints Available:

1. **POST /api/auth/google**
   - Body: `{ "idToken": "google_id_token_here" }`
   - Creates account or logs in existing user
   - Returns JWT tokens and user info

### Test Flow:

1. **Frontend Integration** (when ready):
   ```javascript
   // Frontend will use Google Sign-In JavaScript API
   // to get idToken, then send to your backend
   
   const response = await fetch('/api/auth/google', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({ idToken: googleIdToken })
   });
   ```

2. **Manual Testing** (for development):
   - Use Google OAuth Playground: https://developers.google.com/oauthplayground/
   - Get an ID token and test the endpoint with Postman

### Expected Response:
```json
{
  "success": true,
  "user": {
    "id": 1,
    "username": "john_google_123",
    "google_id": "google_user_id_here",
    "created_at": "2024-01-15T10:30:00.000Z"
  },
  "accessToken": "eyJ...",
  "refreshToken": "eyJ...",
  "message": "Successfully authenticated with Google"
}
```

## 🔒 Security Considerations

### Development vs Production

**Development**:
- Use `http://localhost` URLs
- Test with your personal Google account
- Client secrets in `.env` file (gitignored)

**Production**:
- Use `https://yourdomain.com` URLs
- Store secrets in secure environment variables
- Enable additional security features:
  ```bash
  HTTPS_ONLY=true
  SECURE_COOKIES=true
  ```

### OAuth Security Features

✅ **Implemented**:
- ID token verification with Google's public keys
- Automatic username generation for Google users
- Account linking (Google ID stored with user)
- Secure JWT token generation
- Rate limiting on auth endpoints

✅ **Built-in Protection**:
- CSRF protection via SameSite cookies
- XSS protection headers
- Input validation and sanitization
- SQL injection prevention

## 🚨 Troubleshooting

### Common Issues:

1. **"Invalid Client ID"**
   - Check `GOOGLE_CLIENT_ID` in `.env`
   - Ensure Client ID matches Google Console

2. **"Redirect URI Mismatch"**
   - Check authorized URIs in Google Console
   - Ensure frontend URLs match exactly

3. **"Token Verification Failed"**
   - Check `GOOGLE_CLIENT_SECRET` in `.env`
   - Ensure token is fresh (Google tokens expire quickly)

4. **CORS Errors**
   - Check `CORS_ORIGINS` includes your frontend URL
   - Ensure credentials are enabled

### Debug Mode:

Enable detailed logging:
```bash
LOG_LEVEL=debug
```

Check server logs for detailed error messages.

## 📱 Frontend Integration Preview

When ready, your React frontend will use:

```jsx
import { GoogleLogin } from '@react-oauth/google';

function LoginPage() {
  const handleGoogleSuccess = async (credentialResponse) => {
    const response = await fetch('/api/auth/google', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        idToken: credentialResponse.credential 
      })
    });
    
    const data = await response.json();
    if (data.success) {
      // Store tokens and redirect
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
    }
  };

  return (
    <GoogleLogin
      onSuccess={handleGoogleSuccess}
      onError={() => console.log('Login Failed')}
    />
  );
}
```

## ✅ Checklist

- [ ] Google Cloud Console project created
- [ ] OAuth credentials generated
- [ ] Environment variables configured
- [ ] Server running without errors
- [ ] Google OAuth endpoint responding
- [ ] Frontend integration planned

Your Google OAuth authentication is now ready for testing and integration!