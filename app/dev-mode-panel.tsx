"use client";

import { useDevMode } from "@/lib/dev-mode-context";

export default function DevModePanel() {
  const { isDevMode, setDevMode, lastLog } = useDevMode();

  return (
    <aside
      aria-label="Developer Mode skydelis"
      className="fixed bottom-4 right-4 z-50 max-w-sm rounded-2xl border border-stone-300 bg-white/95 p-4 shadow-xl backdrop-blur transition-all"
    >
      {/* Jungiklis */}
      <div className="flex items-center justify-between gap-4">
        <label
          htmlFor="developer-mode-toggle"
          className="flex cursor-pointer items-center gap-2 text-xs font-bold uppercase tracking-wider text-stone-700"
        >
          <span>🛠️ Developer Mode</span>
        </label>
        <button
          id="developer-mode-toggle"
          type="button"
          role="switch"
          aria-checked={isDevMode}
          onClick={() => setDevMode(!isDevMode)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-orange-600 ${
            isDevMode ? "bg-orange-700" : "bg-stone-300"
          }`}
        >
          <span className="sr-only">Įjungti Developer Mode</span>
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              isDevMode ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </div>

      {/* Techninė informacija (rodoma TIK kai įjungtas Developer Mode) */}
      {isDevMode && (
        <div className="mt-3 border-t border-stone-200 pt-3 text-xs">
          <p className="font-semibold text-stone-500">Paskutinė API operacija:</p>
          {lastLog ? (
            <div className="mt-2 space-y-1.5 rounded-xl bg-stone-50 p-3 font-mono text-[11px] leading-relaxed text-stone-800 ring-1 ring-stone-200/80">
              <div className="flex justify-between">
                <span className="font-semibold text-stone-500">Sistema:</span>
                <span className="font-bold text-orange-800">{lastLog.system}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold text-stone-500">Endpoint:</span>
                <span className="truncate pl-2 text-right">{lastLog.endpoint}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold text-stone-500">Metodas:</span>
                <span>{lastLog.method}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold text-stone-500">Statusas:</span>
                <span
                  className={
                    lastLog.success
                      ? "font-bold text-green-700"
                      : "font-bold text-red-700"
                  }
                >
                  {lastLog.status}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold text-stone-500">Sėkmė:</span>
                <span
                  className={
                    lastLog.success
                      ? "font-bold text-green-700"
                      : "font-bold text-red-700"
                  }
                >
                  {lastLog.success ? "Taip" : "Ne"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold text-stone-500">Trukmė:</span>
                <span className="font-semibold">{lastLog.durationMs} ms</span>
              </div>
              <div className="flex justify-between border-t border-stone-200/60 pt-1 text-[10px]">
                <span className="font-semibold text-stone-500">Kelias:</span>
                <span className="font-semibold text-stone-700">{lastLog.path}</span>
              </div>
              <div className="text-right text-[10px] text-stone-400">
                Laikas: {lastLog.timestamp}
              </div>
            </div>
          ) : (
            <p className="mt-2 text-stone-400 italic">
              Kol kas neatlikta jokia API operacija.
            </p>
          )}
        </div>
      )}
    </aside>
  );
}
