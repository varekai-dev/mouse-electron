import { app, BrowserWindow, ipcMain } from 'electron'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { mouse, Point } from '@nut-tree-fork/nut-js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

let mainWindow: BrowserWindow | null = null
let mouseMoveInterval: NodeJS.Timeout | null = null
let activityCheckInterval: NodeJS.Timeout | null = null
let isMoving = false
let inactivityThreshold = 60 // seconds
let lastActivityTime = Date.now()
let lastMousePosition: Point | null = null
let isProgrammaticMove = false

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
  isProgrammaticMove = true
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
  
  // Update lastMousePosition after programmatic move to avoid false activity detection
  const finalPos = await mouse.getPosition()
  lastMousePosition = finalPos
  
  // Small delay to ensure the flag is checked before next activity check
  setTimeout(() => {
    isProgrammaticMove = false
  }, 100)
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

async function checkUserActivity(): Promise<boolean> {
  try {
    // Skip activity check if we're currently moving the mouse programmatically
    if (isProgrammaticMove) {
      return false // Don't consider programmatic moves as user activity
    }
    
    const currentPos = await mouse.getPosition()
    
    // Check if mouse position has changed (user moved mouse)
    if (lastMousePosition) {
      const distance = Math.sqrt(
        Math.pow(currentPos.x - lastMousePosition.x, 2) + 
        Math.pow(currentPos.y - lastMousePosition.y, 2)
      )
      // If mouse moved more than 5 pixels, consider it user activity
      if (distance > 5) {
        lastActivityTime = Date.now()
        lastMousePosition = currentPos
        return true // User is active
      }
    } else {
      lastMousePosition = currentPos
    }
    
    // Update lastMousePosition even if it didn't move (for future comparisons)
    lastMousePosition = currentPos
    
    // Check if enough time has passed since last activity
    const timeSinceLastActivity = (Date.now() - lastActivityTime) / 1000
    // Return true if there's been recent activity (within threshold), false if inactive long enough
    return timeSinceLastActivity < inactivityThreshold
  } catch (error) {
    console.error('Error checking user activity:', error)
    return false
  }
}

function startActivityMonitoring() {
  if (activityCheckInterval) return
  
  // Check for activity every second
  activityCheckInterval = setInterval(async () => {
    if (!isMoving) return
    
    const hasRecentActivity = await checkUserActivity()
    
    if (!hasRecentActivity) {
      // No recent activity detected, safe to move mouse
      const timeSinceLastActivity = (Date.now() - lastActivityTime) / 1000
      if (timeSinceLastActivity >= inactivityThreshold) {
        await performRandomMouseMove()
      }
    }
  }, 1000)
}

function stopActivityMonitoring() {
  if (activityCheckInterval) {
    clearInterval(activityCheckInterval)
    activityCheckInterval = null
  }
  lastMousePosition = null
}

function startMouseMovement(threshold: number = 60) {
  if (isMoving) return
  
  inactivityThreshold = threshold
  lastActivityTime = Date.now()
  isMoving = true
  
  // Start monitoring activity
  startActivityMonitoring()
}

function stopMouseMovement() {
  isMoving = false
  if (mouseMoveInterval) {
    clearInterval(mouseMoveInterval)
    mouseMoveInterval = null
  }
  stopActivityMonitoring()
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
ipcMain.handle('mouse-move:start', async (_event, inactivitySeconds?: number) => {
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
    
    const threshold = inactivitySeconds && inactivitySeconds > 0 ? inactivitySeconds : 60
    startMouseMovement(threshold)
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

