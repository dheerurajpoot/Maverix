# PWA Setup for MaveriX

This application is configured as a Progressive Web App (PWA) that can be installed on mobile devices and desktops.

## Features

- ✅ **Installable**: Users can install the app on their devices
- ✅ **Offline Support**: Service worker caches assets for offline access
- ✅ **App-like Experience**: Standalone display mode
- ✅ **Splash Screens**: Custom splash screens for iOS devices
- ✅ **App Icons**: Custom icons using maverixicon.png

## Installation

### For Users

1. **Mobile (Android/iOS)**:
   - Open the app in your browser
   - Look for the "Add to Home Screen" or "Install" prompt
   - Tap to install

2. **Desktop (Chrome/Edge)**:
   - Look for the install icon in the address bar
   - Click to install the app

### For Developers

1. **Generate Icons**:
   ```bash
   npm run generate-icons
   ```

2. **Generate Splash Screens**:
   ```bash
   npm run generate-splash
   ```

## Files

- `public/manifest.json` - PWA manifest file
- `public/sw.js` - Service worker for offline functionality
- `app/manifest.ts` - Next.js manifest route
- `components/PWARegister.tsx` - Service worker registration component
- `public/icons/` - App icons and splash screens

## Configuration

### App Details
- **Name**: MaveriX
- **App Icon**: `/assets/maverixicon.png`
- **Splash Screen**: Black background with `maverixicon.png` centered
- **Theme Color**: #6366f1 (Indigo)

### Service Worker

The service worker (`public/sw.js`) provides:
- Asset caching for offline access
- Runtime caching for dynamic content
- Background sync support (ready for future use)
- Push notification support (ready for future use)

### Manifest

The manifest file defines:
- App name and description
- Display mode (standalone)
- Icons and splash screens
- Theme colors
- Start URL

## Testing

1. **Local Development**:
   - Run `npm run dev`
   - Open Chrome DevTools > Application > Service Workers
   - Check if service worker is registered

2. **Production Build**:
   - Run `npm run build`
   - Run `npm start`
   - Test on a mobile device or use Chrome DevTools device emulation

3. **Lighthouse PWA Audit**:
   - Open Chrome DevTools > Lighthouse
   - Run PWA audit
   - Should score 100/100 for PWA criteria

## Troubleshooting

### Service Worker Not Registering
- Check browser console for errors
- Ensure HTTPS (required for service workers in production)
- Clear browser cache and reload

### Icons Not Showing
- Run `npm run generate-icons` to regenerate icons
- Check that files exist in `public/icons/`
- Verify file paths in `manifest.json`

### Splash Screens Not Working
- Run `npm run generate-splash` to regenerate splash screens
- Check that files exist in `public/icons/`
- Verify Apple meta tags in `app/layout.tsx`

## Notes

- Service workers require HTTPS in production (localhost is exempt)
- iOS Safari has limited PWA support compared to Android Chrome
- The app will work offline for cached pages and assets

