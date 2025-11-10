import { useState, useEffect } from 'react'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Activity, AlertCircle } from 'lucide-react'

const STORAGE_KEYS = {
  inactivitySeconds: "moveMouse_inactivitySeconds",
  rangeFrom: "moveMouse_rangeFrom",
  rangeTo: "moveMouse_rangeTo",
};

const getStoredValue = (key: string, defaultValue: number): number => {
  if (typeof window === "undefined") return defaultValue;
  try {
    const stored = localStorage.getItem(key);
    if (stored !== null) {
      const parsed = parseFloat(stored);
      return isNaN(parsed) ? defaultValue : parsed;
    }
  } catch (error) {
    console.error(`Error reading ${key} from localStorage:`, error);
  }
  return defaultValue;
};

const setStoredValue = (key: string, value: number): void => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, value.toString());
  } catch (error) {
    console.error(`Error saving ${key} to localStorage:`, error);
  }
};

function App() {
  const [isEnabled, setIsEnabled] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [apiAvailable, setApiAvailable] = useState(false)
  const [permissionError, setPermissionError] = useState<string | null>(null)
  const [inactivitySeconds, setInactivitySeconds] = useState(() =>
    getStoredValue(STORAGE_KEYS.inactivitySeconds, 60)
  )
  const [rangeFrom, setRangeFrom] = useState(() =>
    getStoredValue(STORAGE_KEYS.rangeFrom, 1)
  )
  const [rangeTo, setRangeTo] = useState(() =>
    getStoredValue(STORAGE_KEYS.rangeTo, 3)
  )

  useEffect(() => {
    // Wait for Electron API to be available
    const checkAPI = () => {
      if (window.electronAPI) {
        setApiAvailable(true)
        // Check accessibility permissions
        window.electronAPI.checkAccessibilityPermissions().then(({ hasPermission, error }) => {
          if (!hasPermission) {
            setPermissionError(error || 'Accessibility permissions are required')
          }
        }).catch((error) => {
          console.error('Error checking accessibility permissions:', error)
        })
        
        window.electronAPI.getMouseMoveStatus().then(({ isMoving }) => {
          setIsEnabled(isMoving)
        }).catch((error) => {
          console.error('Error getting mouse move status:', error)
        })
      } else {
        // Retry after a short delay
        setTimeout(checkAPI, 100)
      }
    }
    checkAPI()
  }, [])

  const handleToggle = async (checked: boolean) => {
    if (!window.electronAPI) {
      console.error('Electron API not available')
      console.error('window.electronAPI:', window.electronAPI)
      console.error('window:', window)
      return
    }

    setIsLoading(true)
    setPermissionError(null)
    
    try {
      if (checked) {
        const range = rangeFrom > 0 && rangeTo > 0 ? { from: rangeFrom, to: rangeTo } : undefined
        const result = await window.electronAPI.startMouseMove(inactivitySeconds, range)
        if (result.success) {
          setIsEnabled(true)
        } else {
          if (result.error === 'ACCESSIBILITY_PERMISSION_REQUIRED') {
            setPermissionError(result.message || 'Accessibility permissions are required')
          } else {
            setPermissionError(result.message || 'Failed to start mouse movement')
          }
          setIsEnabled(false)
        }
      } else {
        await window.electronAPI.stopMouseMove()
        setIsEnabled(false)
      }
    } catch (error) {
      console.error('Error toggling mouse movement:', error)
      setPermissionError('An unexpected error occurred')
      setIsEnabled(false)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-8">
      <div className="bg-card border border-border rounded-lg shadow-lg p-8 w-full max-w-md">
        <div className="flex flex-col items-center space-y-6">
          <div className="flex items-center space-x-3">
            <Activity 
              className={`h-8 w-8 ${isEnabled ? 'text-primary animate-pulse' : 'text-muted-foreground'}`} 
            />
            <h1 className="text-2xl font-bold text-foreground">
              Move Mouse
            </h1>
          </div>
          
          <div className="flex flex-col items-center space-y-4 w-full">
            <div className="w-full space-y-2">
              <label 
                htmlFor="inactivity-seconds" 
                className="text-sm font-medium text-foreground"
              >
                Inactivity threshold (seconds)
              </label>
              <Input
                id="inactivity-seconds"
                type="number"
                min="1"
                value={inactivitySeconds}
                onChange={(e) => {
                  const value = parseInt(e.target.value) || 1
                  const newValue = Math.max(1, value)
                  setInactivitySeconds(newValue)
                  setStoredValue(STORAGE_KEYS.inactivitySeconds, newValue)
                }}
                disabled={isEnabled || isLoading || !apiAvailable}
                className="w-full"
              />
            </div>

            <div className="w-full space-y-2">
              <label 
                className="text-sm font-medium text-foreground"
              >
                Movement interval range (seconds)
              </label>
              <div className="flex items-center space-x-2">
                <div className="flex-1 space-y-1">
                  <label 
                    htmlFor="range-from" 
                    className="text-xs text-muted-foreground"
                  >
                    From
                  </label>
                  <Input
                    id="range-from"
                    type="number"
                    min="0.1"
                    step="0.1"
                    value={rangeFrom}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value) || 0.1
                      const newValue = Math.max(0.1, value)
                      setRangeFrom(newValue)
                      setStoredValue(STORAGE_KEYS.rangeFrom, newValue)
                    }}
                    disabled={isEnabled || isLoading || !apiAvailable}
                    className="w-full"
                  />
                </div>
                <div className="flex-1 space-y-1">
                  <label 
                    htmlFor="range-to" 
                    className="text-xs text-muted-foreground"
                  >
                    To
                  </label>
                  <Input
                    id="range-to"
                    type="number"
                    min="0.1"
                    step="0.1"
                    value={rangeTo}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value) || 0.1
                      const newValue = Math.max(0.1, value)
                      setRangeTo(newValue)
                      setStoredValue(STORAGE_KEYS.rangeTo, newValue)
                    }}
                    disabled={isEnabled || isLoading || !apiAvailable}
                    className="w-full"
                  />
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-3 w-full justify-between">
              <label 
                htmlFor="mouse-toggle" 
                className="text-sm font-medium text-foreground cursor-pointer"
              >
                {isEnabled ? 'Mouse movement is ON' : 'Mouse movement is OFF'}
              </label>
              <Switch
                id="mouse-toggle"
                checked={isEnabled}
                onCheckedChange={handleToggle}
                disabled={isLoading || !apiAvailable}
              />
            </div>
            
            {permissionError && (
              <div className="w-full p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                <div className="flex items-start space-x-2">
                  <AlertCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-xs font-medium text-destructive mb-1">
                      Accessibility Permission Required
                    </p>
                    <p className="text-xs text-muted-foreground mb-2">
                      {permissionError}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      To grant permissions:
                    </p>
                    <ol className="text-xs text-muted-foreground list-decimal list-inside mt-1 space-y-0.5">
                      <li>Open System Settings</li>
                      <li>Go to Privacy & Security → Accessibility</li>
                      <li>Add this app (or Terminal if running from terminal)</li>
                      <li>Toggle the switch again</li>
                    </ol>
                  </div>
                </div>
              </div>
            )}
            
            {!permissionError && (
              <p className="text-xs text-muted-foreground text-center mt-2">
                {isEnabled 
                  ? `Mouse will move after ${inactivitySeconds}s of inactivity, then every ${rangeFrom}-${rangeTo}s randomly` 
                  : 'Toggle to start moving the mouse cursor after inactivity'}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default App

