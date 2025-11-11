import { useState, useEffect } from "react";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Activity, AlertCircle } from "lucide-react";

const STORAGE_KEYS = {
  inactivitySeconds: "moveMouse_inactivitySeconds",
  rangeFrom: "moveMouse_rangeFrom",
  rangeTo: "moveMouse_rangeTo",
  keyboardActivity: "moveMouse_keyboardActivity",
  hubstaffMode: "moveMouse_hubstaffMode",
  hubstaffRangeFrom: "moveMouse_hubstaffRangeFrom",
  hubstaffRangeTo: "moveMouse_hubstaffRangeTo",
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

const getStoredBoolean = (key: string, defaultValue: boolean): boolean => {
  if (typeof window === "undefined") return defaultValue;
  try {
    const stored = localStorage.getItem(key);
    if (stored !== null) {
      return stored === "true";
    }
  } catch (error) {
    console.error(`Error reading ${key} from localStorage:`, error);
  }
  return defaultValue;
};

const setStoredBoolean = (key: string, value: boolean): void => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, value.toString());
  } catch (error) {
    console.error(`Error saving ${key} to localStorage:`, error);
  }
};

const isValidNumberInput = (value: string): boolean => {
  if (value === "") return true;
  // Allow: digits, digits with decimal point, digits with decimal and more digits
  // Also allow intermediate states like "1." or "1.5" while typing
  return /^\d*\.?\d*$/.test(value) && value !== ".";
};

function App() {
  const [isEnabled, setIsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [apiAvailable, setApiAvailable] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [inactivitySeconds, setInactivitySeconds] = useState(() =>
    getStoredValue(STORAGE_KEYS.inactivitySeconds, 60)
  );
  const [inactivitySecondsDisplay, setInactivitySecondsDisplay] = useState(() =>
    getStoredValue(STORAGE_KEYS.inactivitySeconds, 60).toString()
  );
  const [rangeFrom, setRangeFrom] = useState(() =>
    getStoredValue(STORAGE_KEYS.rangeFrom, 1)
  );
  const [rangeFromDisplay, setRangeFromDisplay] = useState(() =>
    getStoredValue(STORAGE_KEYS.rangeFrom, 1).toString()
  );
  const [rangeTo, setRangeTo] = useState(() =>
    getStoredValue(STORAGE_KEYS.rangeTo, 3)
  );
  const [rangeToDisplay, setRangeToDisplay] = useState(() =>
    getStoredValue(STORAGE_KEYS.rangeTo, 3).toString()
  );
  const [keyboardActivity, setKeyboardActivity] = useState(() =>
    getStoredBoolean(STORAGE_KEYS.keyboardActivity, false)
  );
  const [hubstaffMode, setHubstaffMode] = useState(() =>
    getStoredBoolean(STORAGE_KEYS.hubstaffMode, false)
  );
  const [hubstaffRangeFrom, setHubstaffRangeFrom] = useState(() =>
    getStoredValue(STORAGE_KEYS.hubstaffRangeFrom, 50)
  );
  const [hubstaffRangeTo, setHubstaffRangeTo] = useState(() =>
    getStoredValue(STORAGE_KEYS.hubstaffRangeTo, 75)
  );

  useEffect(() => {
    // Wait for Electron API to be available
    const checkAPI = () => {
      if (window.electronAPI) {
        setApiAvailable(true);
        // Check accessibility permissions
        window.electronAPI
          .checkAccessibilityPermissions()
          .then(({ hasPermission, error }) => {
            if (!hasPermission) {
              setPermissionError(
                error || "Accessibility permissions are required"
              );
            }
          })
          .catch((error) => {
            console.error("Error checking accessibility permissions:", error);
          });

        window.electronAPI
          .getMouseMoveStatus()
          .then(({ isMoving }) => {
            setIsEnabled(isMoving);
          })
          .catch((error) => {
            console.error("Error getting mouse move status:", error);
          });
      } else {
        // Retry after a short delay
        setTimeout(checkAPI, 100);
      }
    };
    checkAPI();
  }, []);

  const handleToggle = async (checked: boolean) => {
    if (!window.electronAPI) {
      console.error("Electron API not available");
      console.error("window.electronAPI:", window.electronAPI);
      console.error("window:", window);
      return;
    }

    setIsLoading(true);
    setPermissionError(null);

    try {
      if (checked) {
        let range: { from: number; to: number } | undefined;
        
        if (hubstaffMode) {
          // Convert percentage to seconds using formula: interval = 100 / percentage
          const secondsFrom = 100 / hubstaffRangeTo; // Higher percentage = lower interval
          const secondsTo = 100 / hubstaffRangeFrom; // Lower percentage = higher interval
          range = { from: secondsFrom, to: secondsTo };
        } else {
          range =
            rangeFrom > 0 && rangeTo > 0
              ? { from: rangeFrom, to: rangeTo }
              : undefined;
        }
        
        const result = await window.electronAPI.startMouseMove(
          inactivitySeconds,
          range,
          keyboardActivity
        );
        if (result.success) {
          setIsEnabled(true);
        } else {
          if (result.error === "ACCESSIBILITY_PERMISSION_REQUIRED") {
            setPermissionError(
              result.message || "Accessibility permissions are required"
            );
          } else {
            setPermissionError(
              result.message || "Failed to start mouse movement"
            );
          }
          setIsEnabled(false);
        }
      } else {
        await window.electronAPI.stopMouseMove();
        setIsEnabled(false);
      }
    } catch (error) {
      console.error("Error toggling mouse movement:", error);
      setPermissionError("An unexpected error occurred");
      setIsEnabled(false);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-8">
      <div className="bg-card border border-border rounded-lg shadow-lg w-full max-w-md h-[90vh] max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex flex-col items-center space-y-6 p-8 overflow-y-auto custom-scrollbar flex-1 min-h-0">
          <div className="flex items-center space-x-3">
            <Activity
              className={`h-8 w-8 ${
                isEnabled
                  ? "text-primary animate-pulse"
                  : "text-muted-foreground"
              }`}
            />
            <h1 className="text-2xl font-bold text-foreground">Move Mouse</h1>
          </div>

          <div className="flex items-center space-x-3 w-full justify-between border-b border-border pb-4">
            <label
              htmlFor="mouse-toggle"
              className="text-sm font-medium text-foreground cursor-pointer"
            >
              Enable Mouse Movement
            </label>
            <Switch
              id="mouse-toggle"
              checked={isEnabled}
              onCheckedChange={handleToggle}
              disabled={isLoading || !apiAvailable}
            />
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
                type="text"
                value={inactivitySecondsDisplay}
                onChange={(e) => {
                  const value = e.target.value;
                  if (isValidNumberInput(value)) {
                    setInactivitySecondsDisplay(value);
                    if (value !== "") {
                      const numValue = parseFloat(value);
                      if (!isNaN(numValue)) {
                        const newValue = Math.max(1, numValue);
                        setInactivitySeconds(newValue);
                        setStoredValue(
                          STORAGE_KEYS.inactivitySeconds,
                          newValue
                        );
                      }
                    }
                  }
                }}
                onBlur={(e) => {
                  const value = e.target.value;
                  if (value === "") {
                    setInactivitySecondsDisplay("1");
                    setInactivitySeconds(1);
                    setStoredValue(STORAGE_KEYS.inactivitySeconds, 1);
                  } else {
                    const numValue = parseFloat(value);
                    if (!isNaN(numValue)) {
                      const newValue = Math.max(1, numValue);
                      setInactivitySecondsDisplay(newValue.toString());
                      setInactivitySeconds(newValue);
                      setStoredValue(STORAGE_KEYS.inactivitySeconds, newValue);
                    }
                  }
                }}
                disabled={isEnabled || isLoading || !apiAvailable}
                className="w-full"
              />
            </div>

            {!hubstaffMode && (
              <div className="w-full space-y-2">
                <label className="text-sm font-medium text-foreground">
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
                      type="text"
                      value={rangeFromDisplay}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (isValidNumberInput(value)) {
                          setRangeFromDisplay(value);
                          if (value !== "") {
                            const numValue = parseFloat(value);
                            if (!isNaN(numValue)) {
                              const newValue = Math.max(0.1, numValue);
                              setRangeFrom(newValue);
                              setStoredValue(STORAGE_KEYS.rangeFrom, newValue);
                            }
                          }
                        }
                      }}
                      onBlur={(e) => {
                        const value = e.target.value;
                        if (value === "") {
                          setRangeFromDisplay("0.1");
                          setRangeFrom(0.1);
                          setStoredValue(STORAGE_KEYS.rangeFrom, 0.1);
                        } else {
                          const numValue = parseFloat(value);
                          if (!isNaN(numValue)) {
                            const newValue = Math.max(0.1, numValue);
                            setRangeFromDisplay(newValue.toString());
                            setRangeFrom(newValue);
                            setStoredValue(STORAGE_KEYS.rangeFrom, newValue);
                          }
                        }
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
                      type="text"
                      value={rangeToDisplay}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (isValidNumberInput(value)) {
                          setRangeToDisplay(value);
                          if (value !== "") {
                            const numValue = parseFloat(value);
                            if (!isNaN(numValue)) {
                              const newValue = Math.max(0.1, numValue);
                              setRangeTo(newValue);
                              setStoredValue(STORAGE_KEYS.rangeTo, newValue);
                            }
                          }
                        }
                      }}
                      onBlur={(e) => {
                        const value = e.target.value;
                        if (value === "") {
                          setRangeToDisplay("0.1");
                          setRangeTo(0.1);
                          setStoredValue(STORAGE_KEYS.rangeTo, 0.1);
                        } else {
                          const numValue = parseFloat(value);
                          if (!isNaN(numValue)) {
                            const newValue = Math.max(0.1, numValue);
                            setRangeToDisplay(newValue.toString());
                            setRangeTo(newValue);
                            setStoredValue(STORAGE_KEYS.rangeTo, newValue);
                          }
                        }
                      }}
                      disabled={isEnabled || isLoading || !apiAvailable}
                      className="w-full"
                    />
                  </div>
                </div>
              </div>
            )}

            {hubstaffMode && (
              <div className="w-full space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Activity level (%)
                </label>
                <div className="space-y-2">
                  <Slider
                    min={1}
                    max={100}
                    step={1}
                    value={[hubstaffRangeFrom, hubstaffRangeTo]}
                    onValueChange={(values: number[]) => {
                      setHubstaffRangeFrom(values[0]);
                      setHubstaffRangeTo(values[1]);
                      setStoredValue(STORAGE_KEYS.hubstaffRangeFrom, values[0]);
                      setStoredValue(STORAGE_KEYS.hubstaffRangeTo, values[1]);
                    }}
                    disabled={isEnabled || isLoading || !apiAvailable}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{hubstaffRangeFrom}%</span>
                    <span>{hubstaffRangeTo}%</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Movement every {(100 / hubstaffRangeTo).toFixed(2)}-
                    {(100 / hubstaffRangeFrom).toFixed(2)} seconds
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-center space-x-3 w-full justify-between">
              <label
                htmlFor="keyboard-activity-toggle"
                className="text-sm font-medium text-foreground cursor-pointer"
              >
                Include keyboard activity
              </label>
              <Switch
                id="keyboard-activity-toggle"
                checked={keyboardActivity}
                onCheckedChange={(checked) => {
                  setKeyboardActivity(checked);
                  setStoredBoolean(STORAGE_KEYS.keyboardActivity, checked);
                }}
                disabled={isEnabled || isLoading || !apiAvailable}
              />
            </div>

            <div className="flex items-center space-x-3 w-full justify-between">
              <label
                htmlFor="hubstaff-mode-toggle"
                className="text-sm font-medium text-foreground cursor-pointer"
              >
                Hubstaff mode
              </label>
              <Switch
                id="hubstaff-mode-toggle"
                checked={hubstaffMode}
                onCheckedChange={(checked) => {
                  setHubstaffMode(checked);
                  setStoredBoolean(STORAGE_KEYS.hubstaffMode, checked);
                }}
                disabled={isEnabled || isLoading || !apiAvailable}
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
                      <li>
                        Add this app (or Terminal if running from terminal)
                      </li>
                      <li>Toggle the switch again</li>
                    </ol>
                  </div>
                </div>
              </div>
            )}

            {!permissionError && (
              <p className="text-xs text-muted-foreground text-center mt-2">
                {isEnabled
                  ? hubstaffMode
                    ? keyboardActivity
                      ? `Will randomly move mouse or type 2-5 letters after ${inactivitySeconds}s of inactivity with ${hubstaffRangeFrom}-${hubstaffRangeTo}% activity level`
                      : `Mouse will move after ${inactivitySeconds}s of inactivity with ${hubstaffRangeFrom}-${hubstaffRangeTo}% activity level`
                    : keyboardActivity
                    ? `Will randomly move mouse or type 2-5 letters after ${inactivitySeconds}s of inactivity, then every ${rangeFrom}-${rangeTo}s randomly`
                    : `Mouse will move after ${inactivitySeconds}s of inactivity, then every ${rangeFrom}-${rangeTo}s randomly`
                  : "Toggle to start moving the mouse cursor after inactivity"}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
