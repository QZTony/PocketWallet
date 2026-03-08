# Pocket Wallet - Icon Setup Guide

## Icons Created
- ✅ app-icon.svg (in assets folder)
- ✅ logo.svg (in assets folder)

## Required PNG Icons for Expo/React Native

You need to convert the SVG icons to PNG format with these sizes:

### 1. App Icon (app-icon.png)
- Size: 1024x1024 pixels
- Format: PNG with transparency
- Location: `assets/app-icon.png`

### 2. Adaptive Icon (adaptive-icon.png)
- Size: 1024x1024 pixels
- Format: PNG with transparency
- Location: `assets/adaptive-icon.png`
- Note: For Android, should have safe zone (inner 66% circle)

### 3. Splash Screen (splash.png)
- Size: 1242x2436 pixels (or similar)
- Format: PNG
- Location: `assets/splash.png`
- Background: Black (#000000)

## How to Convert SVG to PNG

### Option 1: Online Tools
1. Go to https://cloudconvert.com/svg-to-png
2. Upload `assets/app-icon.svg`
3. Set output size to 1024x1024
4. Download and save as `assets/app-icon.png`
5. Repeat for adaptive-icon.png

### Option 2: Using Inkscape (Free)
1. Install Inkscape: https://inkscape.org/
2. Open app-icon.svg
3. File > Export PNG Image
4. Set width/height to 1024
5. Export as app-icon.png

### Option 3: Using ImageMagick (Command Line)
```bash
# Install ImageMagick first
magick convert -background none -size 1024x1024 assets/app-icon.svg assets/app-icon.png
magick convert -background none -size 1024x1024 assets/app-icon.svg assets/adaptive-icon.png
```

### Option 4: Using Node.js (sharp library)
```bash
npm install sharp
node -e "require('sharp')('assets/app-icon.svg').resize(1024, 1024).png().toFile('assets/app-icon.png')"
```

## After Creating PNG Files

Run these commands to rebuild the app:

```bash
# Clean and rebuild
npx expo prebuild --clean

# For Android
npm run android

# For iOS
npm run ios
```

## App Configuration Updated

✅ app.json has been updated with:
- App name: "Pocket Wallet"
- Package name: com.pocketwallet.app
- Dark theme
- Black splash screen
- Icon references

## Website Updated

✅ Website now uses icons from assets folder:
- Logo in navigation
- App icon in hero section
- Favicon set

## Next Steps

1. Convert SVG to PNG using one of the methods above
2. Create splash screen (optional - can use app icon on black background)
3. Run `npx expo prebuild --clean`
4. Test on Android/iOS

## Design Notes

The icon features:
- Black background (#000000)
- White pocket shape
- Letter "P" in center
- Minimalist black & white design
- Matches app theme perfectly
