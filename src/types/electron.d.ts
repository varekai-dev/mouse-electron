export interface ElectronAPI {
  startMouseMove: (inactivitySeconds?: number) => Promise<{ success: boolean; error?: string; message?: string }>
  stopMouseMove: () => Promise<{ success: boolean }>
  getMouseMoveStatus: () => Promise<{ isMoving: boolean }>
  checkAccessibilityPermissions: () => Promise<{ hasPermission: boolean; error?: string }>
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}

