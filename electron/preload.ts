const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  startMouseMove: (inactivitySeconds?: number, range?: { from: number; to: number }, keyboardActivity?: boolean) =>
    ipcRenderer.invoke("mouse-move:start", inactivitySeconds, range, keyboardActivity),
  stopMouseMove: () => ipcRenderer.invoke("mouse-move:stop"),
  getMouseMoveStatus: () => ipcRenderer.invoke("mouse-move:status"),
  checkAccessibilityPermissions: () =>
    ipcRenderer.invoke("mouse-move:check-permissions"),
  closePopup: () => ipcRenderer.invoke("popup:close"),
  quitApp: () => ipcRenderer.invoke("app:quit"),
});
