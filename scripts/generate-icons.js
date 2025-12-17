/**
 * Icon Generation Script for PWA
 * 
 * This script generates all required PWA icons from a source image.
 * 
 * Requirements:
 * - Install sharp: npm install --save-dev sharp
 * 
 * Usage:
 * node scripts/generate-icons.js
 */

const fs = require('fs');
const path = require('path');

// Check if sharp is available
let sharp;
try {
  sharp = require('sharp');
} catch (error) {
  console.error('Error: sharp is not installed.');
  console.log('Please install it by running: npm install --save-dev sharp');
  process.exit(1);
}

const sourceIcon = path.join(__dirname, '../public/assets/maverixicon.png');
const splashImageUrl = 'https://static.vecteezy.com/system/resources/previews/028/586/346/large_2x/photography-studio-backdrop-for-a-portrait-abstract-red-orange-grunge-wallpaper-muslin-fabric-texture-for-studio-background-photo.jpg';
const iconsDir = path.join(__dirname, '../public/icons');

// ============================================
// CUSTOMIZATION SETTINGS - Edit these values
// ============================================

// Splash screen background color (RGB values 0-255) - Only used as fallback
const SPLASH_BACKGROUND_COLOR = { r: 99, g: 102, b: 241, alpha: 1 }; // Default: #6366f1 (indigo)

// Icon size on splash screen (as percentage of screen height) - Only used if splash image fails
const SPLASH_ICON_SIZE_PERCENT = 0.3; // 30% of screen height

// Icon background color (for icons with transparency)
// Set to null for transparent background, or use { r, g, b, alpha }
const ICON_BACKGROUND_COLOR = null; // null = transparent

// ============================================
// END CUSTOMIZATION SETTINGS
// ============================================

// Ensure icons directory exists
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Icon sizes to generate
const iconSizes = [
  { size: 192, name: 'icon-192x192.png' },
  { size: 512, name: 'icon-512x512.png' },
  { size: 180, name: 'apple-icon-180x180.png' },
];

// Splash screen sizes (for iOS)
const splashSizes = [
  { width: 2048, height: 2732, name: 'splash-2048x2732.png' }, // iPad Pro 12.9"
  { width: 1668, height: 2388, name: 'splash-1668x2388.png' }, // iPad Pro 11"
  { width: 1536, height: 2048, name: 'splash-1536x2048.png' }, // iPad
  { width: 1242, height: 2688, name: 'splash-1242x2688.png' }, // iPhone XS Max
  { width: 1125, height: 2436, name: 'splash-1125x2436.png' }, // iPhone X/XS
  { width: 828, height: 1792, name: 'splash-828x1792.png' }, // iPhone XR
  { width: 750, height: 1334, name: 'splash-750x1334.png' }, // iPhone 8/7/6s/6
  { width: 640, height: 1136, name: 'splash-640x1136.png' }, // iPhone SE
];

async function generateIcons() {
  if (!fs.existsSync(sourceIcon)) {
    console.error(`Source icon not found: ${sourceIcon}`);
    console.log('Please ensure maverixicon.png exists in public/assets/');
    process.exit(1);
  }

  console.log('Generating PWA icons...\n');

  // Generate app icons
  for (const icon of iconSizes) {
    try {
      const resizeOptions = {
        fit: 'contain',
        background: ICON_BACKGROUND_COLOR || { r: 255, g: 255, b: 255, alpha: 0 }
      };
      
      await sharp(sourceIcon)
        .resize(icon.size, icon.size, resizeOptions)
        .png()
        .toFile(path.join(iconsDir, icon.name));
      console.log(`✓ Generated ${icon.name}`);
    } catch (error) {
      console.error(`✗ Failed to generate ${icon.name}:`, error.message);
    }
  }

  // Generate splash screens using the splash image URL
  console.log('\nGenerating splash screens...\n');
  
  // Download splash image first
  let splashImageBuffer;
  try {
    console.log('Downloading splash screen image...');
    const https = require('https');
    const http = require('http');
    
    splashImageBuffer = await new Promise((resolve, reject) => {
      const imageUrl = new URL(splashImageUrl);
      const client = imageUrl.protocol === 'https:' ? https : http;
      
      client.get(imageUrl.href, (res) => {
        if (res.statusCode !== 200) {
          reject(new Error(`Failed to download image: ${res.statusCode}`));
          return;
        }
        
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => resolve(Buffer.concat(chunks)));
        res.on('error', reject);
      }).on('error', reject);
    });
    
    console.log('✓ Splash image downloaded');
  } catch (error) {
    console.error('✗ Failed to download splash image, using fallback:', error.message);
    // Fallback to source icon if download fails
    splashImageBuffer = await sharp(sourceIcon).toBuffer();
  }

  for (const splash of splashSizes) {
    try {
      // Use the splash image as background, resize to fit splash screen dimensions
      await sharp(splashImageBuffer)
        .resize(splash.width, splash.height, {
          fit: 'cover', // Cover the entire splash screen
          position: 'center'
        })
        .png()
        .toFile(path.join(iconsDir, splash.name));
      
      console.log(`✓ Generated ${splash.name}`);
    } catch (error) {
      console.error(`✗ Failed to generate ${splash.name}:`, error.message);
    }
  }

  console.log('\n✓ All icons generated successfully!');
  console.log('\n📝 Customization Tips:');
  console.log('   - Edit SPLASH_BACKGROUND_COLOR to change splash screen color');
  console.log('   - Edit SPLASH_ICON_SIZE_PERCENT to change icon size on splash');
  console.log('   - Edit ICON_BACKGROUND_COLOR to add background to icons');
  console.log('   - See CUSTOMIZE_ICONS_SPLASH.md for detailed instructions');
}

generateIcons().catch(console.error);

