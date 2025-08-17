# 🔐 Authentication API Testing Guide

Complete guide to test your new authentication system with Postman.

## 🚀 Prerequisites

1. **Server Setup**:
   ```bash
   cd server
   npm install
   npm run dev
   ```
   ✅ Server should show: "🚀 Server running on http://localhost:3001"

2. **Environment Ready**:
   - ✅ `.env` file configured with JWT secrets
   - ✅ Database initialized
   - ✅ No error messages in console

## 📋 Testing Authentication Endpoints

### **Test 1: User Registration** 
Create a new user account with username + password.

**Method**: `POST`  
**URL**: `http://localhost:3001/api/auth/register`  
**Headers**: `Content-Type: application/json`  
**Body**:
```json
{
  "username": "testuser123",
  "password": "SecurePass123",
  "confirmPassword": "SecurePass123",
  "acceptTerms": true
}
```

**Expected Response** (201 Created):
```json
{
  "success": true,
  "user": {
    "id": 1,
    "username": "testuser123",
    "created_at": "2024-01-15T12:00:00.000Z",
    "updated_at": "2024-01-15T12:00:00.000Z"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "message": "User registered successfully"
}
```

### **Test 2: Username Uniqueness** 
Try to register the same username again.

**Method**: `POST`  
**URL**: `http://localhost:3001/api/auth/register`  
**Body**: Same as Test 1

**Expected Response** (409 Conflict):
```json
{
  "success": false,
  "error": "Username already exists"
}
```

### **Test 3: User Login**
Login with the registered user credentials.

**Method**: `POST`  
**URL**: `http://localhost:3001/api/auth/login`  
**Headers**: `Content-Type: application/json`  
**Body**:
```json
{
  "username": "testuser123",
  "password": "SecurePass123",
  "rememberMe": true
}
```

**Expected Response** (200 OK):
```json
{
  "success": true,
  "user": {
    "id": 1,
    "username": "testuser123",
    "created_at": "2024-01-15T12:00:00.000Z",
    "updated_at": "2024-01-15T12:00:00.000Z"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "message": "Login successful"
}
```

### **Test 4: Invalid Login**
Try to login with wrong password.

**Method**: `POST`  
**URL**: `http://localhost:3001/api/auth/login`  
**Body**:
```json
{
  "username": "testuser123",
  "password": "WrongPassword123"
}
```

**Expected Response** (401 Unauthorized):
```json
{
  "success": false,
  "error": "Invalid username or password"
}
```

### **Test 5: Get Current User** 
Test protected route with JWT token.

**Method**: `GET`  
**URL**: `http://localhost:3001/api/auth/me`  
**Headers**: 
- `Content-Type: application/json`
- `Authorization: Bearer YOUR_ACCESS_TOKEN_HERE`

**Expected Response** (200 OK):
```json
{
  "success": true,
  "user": {
    "id": 1,
    "username": "testuser123",
    "created_at": "2024-01-15T12:00:00.000Z",
    "updated_at": "2024-01-15T12:00:00.000Z"
  }
}
```

### **Test 6: Token Refresh**
Refresh the access token using refresh token.

**Method**: `POST`  
**URL**: `http://localhost:3001/api/auth/refresh`  
**Headers**: `Content-Type: application/json`  
**Body**:
```json
{
  "refreshToken": "YOUR_REFRESH_TOKEN_HERE"
}
```

**Expected Response** (200 OK):
```json
{
  "success": true,
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### **Test 7: Logout**
Invalidate the refresh token.

**Method**: `POST`  
**URL**: `http://localhost:3001/api/auth/logout`  
**Headers**: 
- `Content-Type: application/json`
- `Authorization: Bearer YOUR_ACCESS_TOKEN_HERE`

**Expected Response** (200 OK):
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

## 🧪 Validation Testing

### **Test 8: Weak Password**
**Body**:
```json
{
  "username": "newuser456",
  "password": "weak",
  "confirmPassword": "weak",
  "acceptTerms": true
}
```

**Expected Response** (400 Bad Request):
```json
{
  "success": false,
  "error": "Validation failed",
  "details": [
    {
      "code": "too_small",
      "minimum": 8,
      "message": "Password must be at least 8 characters long",
      "path": ["password"]
    }
  ]
}
```

### **Test 9: Invalid Username**
**Body**:
```json
{
  "username": "ab",
  "password": "ValidPass123",
  "confirmPassword": "ValidPass123", 
  "acceptTerms": true
}
```

**Expected Response** (400 Bad Request):
```json
{
  "success": false,
  "error": "Validation failed",
  "details": [
    {
      "message": "Username must be at least 3 characters long",
      "path": ["username"]
    }
  ]
}
```

### **Test 10: Reserved Username**
**Body**:
```json
{
  "username": "admin",
  "password": "ValidPass123",
  "confirmPassword": "ValidPass123",
  "acceptTerms": true
}
```

**Expected Response** (400 Bad Request):
```json
{
  "success": false,
  "error": "Validation failed",
  "details": [
    {
      "message": "This username is reserved and cannot be used",
      "path": ["username"]
    }
  ]
}
```

## 🔒 Security Testing

### **Test 11: Rate Limiting**
Make 6+ rapid requests to login endpoint.

**Expected**: After 5 failed attempts within 15 minutes:
```json
{
  "success": false,
  "error": "Too many attempts. Please try again later."
}
```

### **Test 12: Token Without Bearer**
Call `/api/auth/me` with just the token (no "Bearer ").

**Headers**: `Authorization: your-token-here`

**Expected Response** (401 Unauthorized):
```json
{
  "success": false,
  "error": "Access token required"
}
```

### **Test 13: Expired Token**
Wait 15+ minutes, then use access token.

**Expected Response** (401 Unauthorized):
```json
{
  "success": false,
  "error": "Authentication token has expired"
}
```

## 🌐 Google OAuth Testing (Optional)

For Google OAuth testing, you'll need to set up Google Cloud Console first (see `GOOGLE_OAUTH_SETUP.md`).

### **Test 14: Google Authentication**
**Method**: `POST`  
**URL**: `http://localhost:3001/api/auth/google`  
**Body**:
```json
{
  "idToken": "GOOGLE_ID_TOKEN_FROM_FRONTEND"
}
```

**Expected Response** (200 OK):
```json
{
  "success": true,
  "user": {
    "id": 2,
    "username": "john_google_abc123",
    "google_id": "google_user_id_here",
    "created_at": "2024-01-15T12:00:00.000Z"
  },
  "accessToken": "eyJ...",
  "refreshToken": "eyJ...",
  "message": "Successfully authenticated with Google"
}
```

## 📊 Integration Testing

### **Test 15: Full User Flow**
1. ✅ Register new user
2. ✅ Login with credentials  
3. ✅ Get user profile with token
4. ✅ Save typing test result (existing endpoint)
5. ✅ Refresh token before expiry
6. ✅ Logout

### **Test 16: Cross-Origin Testing**
Test CORS by making requests from different origins (if needed).

## 🔧 Troubleshooting

### Common Issues:

1. **"JWT_SECRET not configured"**
   - Check `.env` file exists with `JWT_SECRET`
   - Restart server after adding environment variables

2. **"Database connection error"** 
   - Check `DATABASE_PATH` in `.env`
   - Ensure server has write permissions

3. **"Rate limit exceeded"**
   - Wait 15 minutes or restart server to reset

4. **"Invalid token format"**
   - Ensure Authorization header: `Bearer your_token_here`
   - Check token isn't corrupted/truncated

## ✅ Success Checklist

- [ ] User registration works
- [ ] Username uniqueness enforced  
- [ ] Login returns valid JWT tokens
- [ ] Protected routes require authentication
- [ ] Token refresh works
- [ ] Validation catches invalid input
- [ ] Rate limiting protects against abuse
- [ ] Security headers included in responses
- [ ] Google OAuth configured (optional)
- [ ] Full user flow completes successfully

**🎉 Your authentication system is production-ready!**

Next steps:
1. Integrate with frontend React forms
2. Add user authentication to typing test flow
3. Deploy to production with HTTPS