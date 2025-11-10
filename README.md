# Electron Mouse Mover App

An Electron application that smoothly moves your mouse cursor in random directions every second when enabled. Built with React, TypeScript, and shadcn/ui.

## Features

- 🖱️ Smooth mouse movement in random directions
- ⚡ Moves every second when enabled
- 🎨 Beautiful UI built with shadcn/ui
- 🔄 Works in background (continues when app is minimized)
- 🎯 Medium random distance (50-200 pixels)

## Prerequisites

- Node.js (v18 or higher)
- npm or yarn

## Installation

1. Install dependencies:
```bash
npm install
```

2. For macOS, you'll need to grant Accessibility permissions:
   - Go to System Settings > Privacy & Security > Accessibility
   - Add Terminal (or your code editor) to the allowed apps
   - When you run the app, you'll be prompted to grant permissions

## Development

Run the app in development mode:

```bash
npm run electron:dev
```

This will:
- Start the Vite dev server for React
- Launch Electron when the server is ready
- Open DevTools automatically

## Building

Build the app for production:

```bash
npm run electron:build
```

This will:
- Build the React app
- Compile the Electron main process
- Package the app using electron-builder

## Usage

1. Launch the app
2. Toggle the switch to enable/disable mouse movement
3. When enabled, the mouse will move smoothly in random directions every second
4. The app continues working even when minimized

## Project Structure

```
/
├── electron/
│   ├── main.ts          # Electron main process
│   └── preload.ts       # IPC bridge
├── src/
│   ├── App.tsx          # Main React component
│   ├── components/
│   │   └── ui/          # shadcn/ui components
│   └── lib/
│       └── utils.ts     # Utility functions
└── package.json
```

## Technologies

- **Electron**: Desktop app framework
- **React**: UI framework
- **TypeScript**: Type safety
- **Vite**: Build tool
- **shadcn/ui**: UI component library
- **@nut-tree-fork/nut-js**: Mouse control library
- **Tailwind CSS**: Styling

## License

MIT

