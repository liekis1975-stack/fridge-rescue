"use client";

import {
  createContext,
  useContext,
  useSyncExternalStore,
  type ReactNode,
} from "react";

export type ApiLog = {
  system: "TheMealDB" | "Gemini" | "Supabase";
  endpoint: string;
  method: string;
  status: number | string;
  success: boolean;
  durationMs: number;
  path: string;
  timestamp: string;
};

type DevModeContextType = {
  isDevMode: boolean;
  setDevMode: (enabled: boolean) => void;
  lastLog: ApiLog | null;
  recordLog: (log: ApiLog) => void;
};

const DevModeContext = createContext<DevModeContextType | null>(null);
const DEV_MODE_KEY = "fridge_dev_mode";
const LAST_LOG_KEY = "fridge_dev_last_log";
const DEV_MODE_EVENT = "fridge-dev-mode-change";
const LAST_LOG_EVENT = "fridge-dev-last-log-change";

let devModeSnapshot = false;
let lastLogSnapshot: string | null = null;

function subscribeToStorage(
  key: string,
  eventName: string,
  callback: () => void,
) {
  if (typeof window === "undefined") return () => {};

  const handleStorage = (event: StorageEvent) => {
    if (event.key === key || event.key === null) callback();
  };

  window.addEventListener("storage", handleStorage);
  window.addEventListener(eventName, callback);
  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(eventName, callback);
  };
}

function getDevModeSnapshot() {
  if (typeof window !== "undefined") {
    try {
      devModeSnapshot = window.localStorage.getItem(DEV_MODE_KEY) === "true";
    } catch {
      // Naudojama paskutinė žinoma reikšmė, jei saugykla neprieinama.
    }
  }
  return devModeSnapshot;
}

function getLastLogSnapshot() {
  if (typeof window !== "undefined") {
    try {
      lastLogSnapshot = window.sessionStorage.getItem(LAST_LOG_KEY);
    } catch {
      // Naudojama paskutinė žinoma reikšmė, jei saugykla neprieinama.
    }
  }
  return lastLogSnapshot;
}

function parseLastLog(value: string | null): ApiLog | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as ApiLog;
  } catch {
    return null;
  }
}

export function DevModeProvider({ children }: { children: ReactNode }) {
  const isDevMode = useSyncExternalStore(
    (callback) => subscribeToStorage(DEV_MODE_KEY, DEV_MODE_EVENT, callback),
    getDevModeSnapshot,
    () => false,
  );
  const lastLogJson = useSyncExternalStore(
    (callback) => subscribeToStorage(LAST_LOG_KEY, LAST_LOG_EVENT, callback),
    getLastLogSnapshot,
    () => null,
  );
  const lastLog = parseLastLog(lastLogJson);

  function setDevMode(enabled: boolean) {
    devModeSnapshot = enabled;
    try {
      localStorage.setItem(DEV_MODE_KEY, String(enabled));
    } catch {
      // Ignoruoti
    }
    window.dispatchEvent(new Event(DEV_MODE_EVENT));
  }

  function recordLog(log: ApiLog) {
    lastLogSnapshot = JSON.stringify(log);
    try {
      sessionStorage.setItem(LAST_LOG_KEY, lastLogSnapshot);
    } catch {
      // Ignoruoti
    }
    window.dispatchEvent(new Event(LAST_LOG_EVENT));
  }

  return (
    <DevModeContext.Provider value={{ isDevMode, setDevMode, lastLog, recordLog }}>
      {children}
    </DevModeContext.Provider>
  );
}

export function useDevMode(): DevModeContextType {
  const context = useContext(DevModeContext);
  if (!context) {
    return {
      isDevMode: false,
      setDevMode: () => {},
      lastLog: null,
      recordLog: () => {},
    };
  }
  return context;
}
