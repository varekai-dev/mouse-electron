const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  startMouseMove: () => ipcRenderer.invoke('mouse-move:start'),
  stopMouseMove: () => ipcRenderer.invoke('mouse-move:stop'),
  getMouseMoveStatus: () => ipcRenderer.invoke('mouse-move:status'),
  checkAccessibilityPermissions: () => ipcRenderer.invoke('mouse-move:check-permissions'),
})

