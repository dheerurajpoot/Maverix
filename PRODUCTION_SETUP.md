# Production Setup Guide

## Required Environment Variables

For authentication to work properly in production, ensure these environment variables are set:

### Required Variables:

1. **NEXTAUTH_SECRET** (Required)
   - This is a secret key used to encrypt and sign JWT tokens
   - **Critical**: Must be set in production for authentication to work
   - **How to generate:**
     
     **Option 1: Using OpenSSL (Recommended)**
     ```bash
     openssl rand -base64 32
     ```
     This will output something like: `xK8pL2mN9qR5tW7yZ3bC6dF1gH4jK8lM0nP2qR5sT8uV1wX4yZ7aB0cD3eF6gH9`
     
     **Option 2: Using Node.js**
     ```bash
     node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
     ```
     
     **Option 3: Using Online Generator**
     - Visit: https://generate-secret.vercel.app/32
     - Or use any secure random string generator (minimum 32 characters)
   
   - **What to add:** Copy the generated string and paste it as the value
   - **Example value:** `xK8pL2mN9qR5tW7yZ3bC6dF1gH4jK8lM0nP2qR5sT8uV1wX4yZ7aB0cD3eF6gH9`
   - **Important:** 
     - Use a different secret for production than development
     - Never commit this secret to your repository
     - Keep it secure and don't share it publicly

2. **NEXTAUTH_URL** (Recommended)
   - Set to your production URL: `https://maveriix.vercel.app`
   - NextAuth will auto-detect this, but setting it explicitly is recommended
   - Should match your production domain exactly

3. **MONGODB_URI** (Required)
   - Your MongoDB connection string
   - Example: `mongodb+srv://username:password@cluster.mongodb.net/dbname`

4. **MONGODB_DB** (Required)
   - Your MongoDB database name

### Optional Variables:

- **NODE_ENV**: Should be set to `production` in production
- **VERCEL**: Automatically set by Vercel (set to `1`)

## Vercel Configuration

1. Go to your Vercel project settings
2. Navigate to "Environment Variables"
3. Add all required variables listed above
4. Ensure `NEXTAUTH_SECRET` is set (this is critical!)
5. Redeploy after adding environment variables

## Common Production Issues

### Issue: Login works but redirect doesn't happen
**Solution**: Ensure `NEXTAUTH_SECRET` is set and `NEXTAUTH_URL` matches your domain

### Issue: Cookies not being set
**Solution**: 
- Ensure `NEXTAUTH_URL` is set correctly
- Check that your domain uses HTTPS (required for secure cookies)
- Verify `trustHost: true` is set in auth config (already configured)

### Issue: Session not persisting
**Solution**: 
- Check cookie settings in browser DevTools
- Ensure cookies are not being blocked
- Verify `NEXTAUTH_SECRET` is consistent across deployments

## Testing Production Authentication

1. Clear browser cookies for your domain
2. Try logging in
3. Check browser DevTools → Application → Cookies
4. Verify `next-auth.session-token` cookie is set
5. Check that redirect happens to correct dashboard based on role

## Debug Mode

To enable debug logging in production (temporarily), set:
```
NODE_ENV=development
```
Or add `debug: true` in `lib/auth.ts` (remove after debugging)

