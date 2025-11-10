import { app, BrowserWindow, ipcMain } from 'electron'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { mouse, Point } from '@nut-tree-fork/nut-js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

let mainWindow: BrowserWindow | null = null
let mouseMoveInterval: NodeJS.Timeout | null = null
let isMoving = false

const isDev = process.env.NODE_ENV !== 'production' && !app.isPackaged

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 400,
    height: 300,
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(join(__dirname, '../dist/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

async function moveMouseSmoothly(targetX: number, targetY: number) {
  const currentPos = await mouse.getPosition()
  const startX = currentPos.x
  const startY = currentPos.y
  
  const steps = 20
  const delay = 10 // ms between steps
  
  for (let i = 0; i <= steps; i++) {
    if (!isMoving) break
    
    const progress = i / steps
    const easeProgress = progress * (2 - progress) // Ease out function
    
    const x = Math.round(startX + (targetX - startX) * easeProgress)
    const y = Math.round(startY + (targetY - startY) * easeProgress)
    
    await mouse.setPosition(new Point(x, y))
    
    if (i < steps) {
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
}

async function performRandomMouseMove() {
  if (!isMoving) return
  
  try {
    const currentPos = await mouse.getPosition()
    
    // Generate random angle (0 to 2π)
    const angle = Math.random() * 2 * Math.PI
    
    // Generate random distance (50-200 pixels)
    const distance = 50 + Math.random() * 150
    
    // Calculate target position
    const targetX = Math.round(currentPos.x + distance * Math.cos(angle))
    const targetY = Math.round(currentPos.y + distance * Math.sin(angle))
    
    // For simplicity, we'll just clamp to reasonable bounds
    // In production, you'd want to get actual screen dimensions
    const clampedX = Math.max(0, Math.min(targetX, 5000))
    const clampedY = Math.max(0, Math.min(targetY, 5000))
    
    await moveMouseSmoothly(clampedX, clampedY)
  } catch (error) {
    console.error('Error moving mouse:', error)
  }
}

function startMouseMovement() {
  if (isMoving) return
  
  isMoving = true
  // Start immediately, then repeat every second
  performRandomMouseMove()
  mouseMoveInterval = setInterval(() => {
    performRandomMouseMove()
  }, 1000)
}

function stopMouseMovement() {
  isMoving = false
  if (mouseMoveInterval) {
    clearInterval(mouseMoveInterval)
    mouseMoveInterval = null
  }
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  stopMouseMovement()
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// Check accessibility permissions
async function checkAccessibilityPermissions(): Promise<{ hasPermission: boolean; error?: string }> {
  if (process.platform !== 'darwin') {
    return { hasPermission: true } // Not needed on non-macOS
  }
  
  try {
    // Try to get mouse position - if it fails, permissions aren't granted
    await mouse.getPosition()
    return { hasPermission: true }
  } catch (error: any) {
    return { 
      hasPermission: false, 
      error: error?.message || 'Accessibility permissions not granted'
    }
  }
}

// IPC handlers
ipcMain.handle('mouse-move:start', async () => {
  try {
    // Check permissions first
    const permissionCheck = await checkAccessibilityPermissions()
    if (!permissionCheck.hasPermission) {
      return { 
        success: false, 
        error: 'ACCESSIBILITY_PERMISSION_REQUIRED',
        message: permissionCheck.error || 'Accessibility permissions are required to move the mouse. Please grant permissions in System Settings > Privacy & Security > Accessibility.'
      }
    }
    
    startMouseMovement()
    return { success: true }
  } catch (error: any) {
    return { 
      success: false, 
      error: 'UNKNOWN_ERROR',
      message: error?.message || 'Failed to start mouse movement'
    }
  }
})

ipcMain.handle('mouse-move:stop', () => {
  stopMouseMovement()
  return { success: true }
})

ipcMain.handle('mouse-move:status', () => {
  return { isMoving }
})

ipcMain.handle('mouse-move:check-permissions', async () => {
  return await checkAccessibilityPermissions()
})

