# Icon Files

Place your icon image here as `icon.png`.

## Requirements:
- **Format**: PNG with transparency support
- **Recommended size**: 512x512 pixels (or larger, square)
- **Name**: `icon.png`

The icon will be:
- Used as the tray icon (automatically resized to 16x16 or 22x22 depending on platform)
- Used as the app icon when building with electron-builder (automatically converted to .icns for macOS, .ico for Windows)

## Notes:
- If the icon file is not found, the app will fall back to a programmatically generated icon
- The icon should have a transparent background for best results
- For best quality, use a high-resolution square image (512x512 or larger)

