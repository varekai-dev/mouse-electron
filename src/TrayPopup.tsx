import { useState, useEffect } from "react";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Activity, X, Power } from "lucide-react";

const STORAGE_KEYS = {
  inactivitySeconds: "moveMouse_inactivitySeconds",
  rangeFrom: "moveMouse_rangeFrom",
  rangeTo: "moveMouse_rangeTo",
  keyboardActivity: "moveMouse_keyboardActivity",
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

function TrayPopup() {
  const [isEnabled, setIsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [apiAvailable, setApiAvailable] = useState(false);
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

  useEffect(() => {
    // Wait for Electron API to be available
    const checkAPI = () => {
      if (window.electronAPI) {
        setApiAvailable(true);
        window.electronAPI
          .getMouseMoveStatus()
          .then(({ isMoving }) => {
            setIsEnabled(isMoving);
          })
          .catch((error) => {
            console.error("Error getting mouse move status:", error);
          });
      } else {
        setTimeout(checkAPI, 100);
      }
    };
    checkAPI();

    // Poll for status updates
    const interval = setInterval(() => {
      if (window.electronAPI) {
        window.electronAPI
          .getMouseMoveStatus()
          .then(({ isMoving }) => {
            setIsEnabled(isMoving);
          })
          .catch(() => {});
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleToggle = async (checked: boolean) => {
    if (!window.electronAPI) return;

    setIsLoading(true);

    try {
      if (checked) {
        const range =
          rangeFrom > 0 && rangeTo > 0
            ? { from: rangeFrom, to: rangeTo }
            : undefined;
        const result = await window.electronAPI.startMouseMove(
          inactivitySeconds,
          range,
          keyboardActivity
        );
        if (result.success) {
          setIsEnabled(true);
        } else {
          setIsEnabled(false);
        }
      } else {
        await window.electronAPI.stopMouseMove();
        setIsEnabled(false);
      }
    } catch (error) {
      console.error("Error toggling mouse movement:", error);
      setIsEnabled(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (window.electronAPI && window.electronAPI.closePopup) {
      window.electronAPI.closePopup();
    }
  };

  const handleQuit = () => {
    if (window.electronAPI && window.electronAPI.quitApp) {
      window.electronAPI.quitApp();
    }
  };

  return (
    <div className="w-full h-auto min-h-fit bg-background rounded-lg shadow-lg border border-border flex flex-col">
      <div className="px-4 pt-4 pb-4 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Activity
              className={`h-5 w-5 ${
                isEnabled
                  ? "text-primary animate-pulse"
                  : "text-muted-foreground"
              }`}
            />
            <h2 className="text-sm font-semibold text-foreground">
              Move Mouse
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-muted rounded transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        {/* Status */}
        <div className="flex items-center justify-between py-2 border-b border-border">
          <span className="text-xs text-muted-foreground">Status</span>
          <span
            className={`text-xs font-medium ${
              isEnabled ? "text-primary" : "text-muted-foreground"
            }`}
          >
            {isEnabled ? "Active" : "Inactive"}
          </span>
        </div>

        {/* Keyboard Activity Toggle */}
        <div className="flex items-center justify-between">
          <label
            htmlFor="tray-keyboard-activity"
            className="text-xs font-medium text-foreground cursor-pointer"
          >
            Include Keyboard Activity
          </label>
          <Switch
            id="tray-keyboard-activity"
            checked={keyboardActivity}
            onCheckedChange={(checked) => {
              setKeyboardActivity(checked);
              setStoredBoolean(STORAGE_KEYS.keyboardActivity, checked);
            }}
            disabled={isEnabled || isLoading || !apiAvailable}
          />
        </div>

        {/* Toggle */}
        <div className="flex items-center justify-between">
          <label
            htmlFor="tray-toggle"
            className="text-xs font-medium text-foreground cursor-pointer"
          >
            Enable Mouse Movement
          </label>
          <Switch
            id="tray-toggle"
            checked={isEnabled}
            onCheckedChange={handleToggle}
            disabled={isLoading || !apiAvailable}
          />
        </div>

        {/* Inactivity Threshold */}
        <div className="space-y-2">
          <label
            htmlFor="tray-inactivity"
            className="text-xs font-medium text-foreground"
          >
            Inactivity Threshold (seconds)
          </label>
          <Input
            id="tray-inactivity"
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
                    setStoredValue(STORAGE_KEYS.inactivitySeconds, newValue);
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
            className="h-8 text-xs"
          />
        </div>

        {/* Movement Interval Range */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-foreground">
            Movement Interval Range (seconds)
          </label>
          <div className="flex items-center space-x-2">
            <div className="flex-1 space-y-1">
              <label
                htmlFor="tray-range-from"
                className="text-xs text-muted-foreground"
              >
                From
              </label>
              <Input
                id="tray-range-from"
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
                className="h-8 text-xs"
              />
            </div>
            <div className="flex-1 space-y-1">
              <label
                htmlFor="tray-range-to"
                className="text-xs text-muted-foreground"
              >
                To
              </label>
              <Input
                id="tray-range-to"
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
                className="h-8 text-xs"
              />
            </div>
          </div>
        </div>

        {/* Info */}
        <div className="pt-1 border-t border-border">
          <p className="text-xs text-muted-foreground">
            {isEnabled
              ? keyboardActivity
                ? `Will randomly move mouse or type a letter after ${inactivitySeconds}s of inactivity, then every ${rangeFrom}-${rangeTo}s randomly`
                : `Moving mouse after ${inactivitySeconds}s of inactivity, then every ${rangeFrom}-${rangeTo}s randomly`
              : "Enable to start moving mouse after inactivity"}
          </p>
        </div>

        {/* Quit App Button */}
        <div className="pt-1 border-t border-border">
          <button
            onClick={handleQuit}
            className="w-full flex items-center justify-center space-x-2 px-3 py-2 text-xs font-medium text-destructive hover:bg-destructive/10 rounded-md transition-colors"
            aria-label="Quit App"
          >
            <Power className="h-4 w-4" />
            <span>Quit App</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default TrayPopup;
