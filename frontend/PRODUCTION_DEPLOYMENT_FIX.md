# Production Deployment Fix for Authentication Issues

## Problem Description
The frontend is getting 401 (Unauthorized) errors in production when trying to access the schedule API endpoints. This happens because:

1. **Missing Environment Configuration**: The frontend doesn't have the correct production API URL configured
2. **Token Expiration**: Production JWT tokens expire after 1 hour, and the refresh mechanism might not be working
3. **API URL Mismatch**: The frontend is trying to call `http://localhost:8000/api` instead of `https://iais.online/api`

## Root Cause
The `axiosInstance.js` file was falling back to `http://localhost:8000/api` when `REACT_APP_API_URL` environment variable was not set in production.

## Solution Steps

### 1. Environment Configuration
Create environment-specific files:

**For Development:**
```bash
# frontend/development.env
REACT_APP_API_URL=http://localhost:8000/api
REACT_APP_ENV=development
```

**For Production:**
```bash
# frontend/production.env
REACT_APP_API_URL=https://iais.online/api
REACT_APP_ENV=production
```

### 2. Updated Build Process
Use the production build command:
```bash
npm run build:prod
```

This will automatically set the correct API URL for production builds.

### 3. Dynamic API URL Detection
The `axiosInstance.js` now automatically detects the environment:
- **Production**: Uses `https://iais.online/api`
- **Development**: Uses `http://localhost:8000/api`
- **Fallback**: Uses environment variables if set

### 4. Token Refresh Improvements
- Better error handling for token refresh failures
- Automatic retry mechanism for expired tokens
- Proper logging for debugging

## Deployment Commands

### Build for Production
```bash
cd frontend
npm run build:prod
```

### Build for Development
```bash
cd frontend
npm run build
```

### Test Authentication
Use the debug script in browser console:
```javascript
// Copy and paste this into browser console
// Source: frontend/debug_auth.js
```

## Verification Steps

1. **Check Console Logs**: Look for the API URL configuration messages
2. **Verify Token**: Ensure JWT tokens are valid and not expired
3. **Test API Call**: Use the debug script to test the endpoint directly
4. **Check Network Tab**: Verify the correct API URL is being called

## Expected Console Output in Production
```
Axios instance configured with baseURL: https://iais.online/api
Current hostname: iais.online
Environment: production
```

## Troubleshooting

### If still getting 401 errors:
1. **Check token expiration**: JWT tokens expire after 1 hour in production
2. **Verify CORS settings**: Ensure production backend allows requests from frontend domain
3. **Check authentication headers**: Verify `Authorization: Bearer <token>` is being sent
4. **Review backend logs**: Check for authentication failures in Django logs

### If API calls are going to wrong URL:
1. **Clear browser cache**: Hard refresh the page
2. **Rebuild frontend**: Use `npm run build:prod`
3. **Check environment variables**: Ensure production build is using correct settings

## Backend Considerations

The backend is correctly configured with:
- JWT authentication enabled
- Proper permission classes (`IsAuthenticated`)
- CORS settings for production domain
- 1-hour access token lifetime

## Security Notes

- Production uses HTTPS only
- JWT tokens have shorter lifetime (1 hour) for security
- CORS is restricted to production domains only
- All API endpoints require authentication
