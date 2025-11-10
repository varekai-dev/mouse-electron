import { useState, useEffect } from "react";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Activity, X, Power } from "lucide-react";

function TrayPopup() {
  const [isEnabled, setIsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [apiAvailable, setApiAvailable] = useState(false);
  const [inactivitySeconds, setInactivitySeconds] = useState(60);

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
        const result = await window.electronAPI.startMouseMove(
          inactivitySeconds
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
    <div className="w-full h-full bg-background rounded-lg shadow-lg border border-border overflow-hidden">
      <div className="p-4 space-y-4">
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
              Mouse Mover
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
            type="number"
            min="1"
            value={inactivitySeconds}
            onChange={(e) => {
              const value = parseInt(e.target.value) || 1;
              setInactivitySeconds(Math.max(1, value));
            }}
            disabled={isEnabled || isLoading || !apiAvailable}
            className="h-8 text-xs"
          />
        </div>

        {/* Info */}
        <div className="pt-2 border-t border-border">
          <p className="text-xs text-muted-foreground">
            {isEnabled
              ? `Moving mouse after ${inactivitySeconds}s of inactivity`
              : "Enable to start moving mouse after inactivity"}
          </p>
        </div>

        {/* Quit App Button */}
        <div className="pt-2 border-t border-border">
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
