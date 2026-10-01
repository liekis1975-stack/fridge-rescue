"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { useDevMode } from "@/lib/dev-mode-context";

type Ingredient = { name: string; measure: string };

type Props = {
  mealId?: string;
  mealName: string;
  ingredients: Ingredient[];
  instructions: string;
};

const TIME_OPTIONS = [
  { value: 15, label: "15 min" },
  { value: 30, label: "30 min" },
  { value: 60, label: "60 min" },
] as const;

const SERVINGS_OPTIONS = [
  { value: 1, label: "1 žmogus" },
  { value: 2, label: "2 žmonės" },
  { value: 4, label: "4 žmonės" },
] as const;

const PRIORITY_OPTIONS = [
  { value: "paprasčiau", label: "🟢 Paprasčiau" },
  { value: "pigiau", label: "💰 Pigiau" },
  { value: "sveikiau", label: "🥦 Sveikiau" },
  { value: "originalas", label: "🎯 Kuo panašiau į originalą" },
] as const;

type TimeOption = (typeof TIME_OPTIONS)[number]["value"];
type ServingsOption = (typeof SERVINGS_OPTIONS)[number]["value"];
type PriorityOption = (typeof PRIORITY_OPTIONS)[number]["value"];

export default function AiAdaptForm({ mealId, mealName, ingredients, instructions }: Props) {
  const supabase = useMemo(() => createClient(), []);
  const { recordLog } = useDevMode();
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [userRequest, setUserRequest] = useState("");
  const [timeMinutes, setTimeMinutes] = useState<TimeOption>(30);
  const [servings, setServings] = useState<ServingsOption>(2);
  const [priority, setPriority] = useState<PriorityOption>("originalas");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [savingAi, setSavingAi] = useState(false);
  const [saveAiSuccess, setSaveAiSuccess] = useState(false);
  const [saveAiError, setSaveAiError] = useState("");
  const requestInProgress = useRef(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    void supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (requestInProgress.current) return;

    const value = userRequest.trim();
    if (!value) {
      setError("Aprašykite savo situaciją prieš spausdami mygtuką.");
      return;
    }

    requestInProgress.current = true;
    setLoading(true);
    setError("");
    setAnswer("");
    setSaveAiSuccess(false);
    setSaveAiError("");

    const startTime = performance.now();
    let httpStatus: number | string = "Tinklo klaida";
    let isSuccess = false;

    try {
      const response = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mealName,
          ingredients,
          instructions,
          userRequest: value,
          timeMinutes,
          servings,
          priority,
        }),
      });
      httpStatus = response.status;

      const data: { answer?: string; error?: string } = await response.json();

      if (!response.ok || !data.answer) {
        setError(data.error ?? "AI užklausa nepavyko. Bandykite vėliau.");
      } else {
        isSuccess = true;
        setAnswer(data.answer);
      }
    } catch {
      setError("Nepavyko prisijungti prie serverio. Patikrinkite interneto ryšį.");
    } finally {
      recordLog({
        system: "Gemini",
        endpoint: "/api/ai",
        method: "POST",
        status: httpStatus,
        success: isSuccess,
        durationMs: Math.round(performance.now() - startTime),
        path: "Fridge Rescue → Gemini",
        timestamp: new Date().toLocaleTimeString("lt-LT"),
      });
      requestInProgress.current = false;
      setLoading(false);
    }
  }

  async function handleSaveAiRecipe() {
    if (savingAi || saveAiSuccess || !answer) return;
    setSaveAiError("");
    setSavingAi(true);

    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) {
        setUser(null);
        setSaveAiError("Norėdami išsaugoti receptą, prisijunkite.");
        setSavingAi(false);
        return;
      }

      const startTime = performance.now();
      let httpStatus: number | string = "Tinklo klaida";
      let isSuccess = false;
      try {
        const { error: insertError, status } = await supabase.from("saved_ai_recipes").insert({
          user_id: currentUser.id,
          original_recipe_id: mealId ?? null,
          original_recipe_name: mealName,
          user_request: userRequest.trim(),
          ai_result: answer,
          time_minutes: timeMinutes,
          servings: servings,
          priority: priority,
        });
        httpStatus = status;
        isSuccess = !insertError;

        if (insertError) {
          console.error("Failed to save AI recipe:", insertError);
          setSaveAiError("Nepavyko išsaugoti recepto. Patikrinkite, ar Supabase sukurta lentelė saved_ai_recipes.");
        } else {
          setSaveAiSuccess(true);
        }
      } finally {
        recordLog({
          system: "Supabase",
          endpoint: "/rest/v1/saved_ai_recipes",
          method: "POST",
          status: httpStatus,
          success: isSuccess,
          durationMs: Math.round(performance.now() - startTime),
          path: "Fridge Rescue → Supabase",
          timestamp: new Date().toLocaleTimeString("lt-LT"),
        });
      }
    } catch (err) {
      console.error("Save AI recipe error:", err);
      setSaveAiError("Įvyko klaida saugant receptą. Pabandykite dar kartą.");
    } finally {
      setSavingAi(false);
    }
  }

  return (
    <section className="mt-8 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-stone-200 sm:p-8">
      <h2 className="text-2xl font-bold">✨ AI recepto gelbėtojas</h2>
      <p className="mt-2 text-sm text-stone-600">
        Nurodykite savo situaciją – AI pritaikys receptą pagal jūsų poreikius.
      </p>

      <form onSubmit={handleSubmit} className="mt-5 space-y-6">
        {/* Laikas */}
        <fieldset>
          <legend className="text-sm font-semibold text-stone-700">⏱ Kiek laiko turite?</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {TIME_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className={`cursor-pointer rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                  timeMinutes === opt.value
                    ? "border-orange-600 bg-orange-600 text-white"
                    : "border-stone-300 bg-stone-50 text-stone-700 hover:border-orange-400"
                }`}
              >
                <input
                  type="radio"
                  name="timeMinutes"
                  value={opt.value}
                  checked={timeMinutes === opt.value}
                  onChange={() => setTimeMinutes(opt.value)}
                  className="sr-only"
                />
                {opt.label}
              </label>
            ))}
          </div>
        </fieldset>

        {/* Žmonių skaičius */}
        <fieldset>
          <legend className="text-sm font-semibold text-stone-700">👥 Kiek žmonių?</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {SERVINGS_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className={`cursor-pointer rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                  servings === opt.value
                    ? "border-orange-600 bg-orange-600 text-white"
                    : "border-stone-300 bg-stone-50 text-stone-700 hover:border-orange-400"
                }`}
              >
                <input
                  type="radio"
                  name="servings"
                  value={opt.value}
                  checked={servings === opt.value}
                  onChange={() => setServings(opt.value)}
                  className="sr-only"
                />
                {opt.label}
              </label>
            ))}
          </div>
        </fieldset>

        {/* Prioritetas */}
        <fieldset>
          <legend className="text-sm font-semibold text-stone-700">🎯 Ko norite?</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {PRIORITY_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className={`cursor-pointer rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                  priority === opt.value
                    ? "border-orange-600 bg-orange-600 text-white"
                    : "border-stone-300 bg-stone-50 text-stone-700 hover:border-orange-400"
                }`}
              >
                <input
                  type="radio"
                  name="priority"
                  value={opt.value}
                  checked={priority === opt.value}
                  onChange={() => setPriority(opt.value)}
                  className="sr-only"
                />
                {opt.label}
              </label>
            ))}
          </div>
        </fieldset>

        {/* Laisvo teksto laukas */}
        <div>
          <label htmlFor="user-request" className="block text-sm font-semibold text-stone-700">
            Jūsų situacija
          </label>
          <textarea
            id="user-request"
            name="userRequest"
            rows={3}
            maxLength={500}
            placeholder="Pavyzdžiui: neturiu pieno ir sviesto, turiu tik aliejų."
            value={userRequest}
            onChange={(e) => { setUserRequest(e.target.value); setError(""); }}
            disabled={loading}
            className="mt-2 w-full rounded-xl border border-stone-300 bg-stone-50 px-4 py-3 text-sm leading-relaxed outline-orange-600 disabled:opacity-60"
          />
          <div className="mt-1 flex justify-end">
            <span className="text-xs text-stone-400">{userRequest.length}/500</span>
          </div>
        </div>

        {error && (
          <p role="alert" className="text-sm text-red-700">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="rounded-xl bg-orange-700 px-6 py-3 font-semibold text-white hover:bg-orange-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Generuojama…" : "✨ Pritaikyti receptą"}
        </button>
      </form>

      {loading && (
        <p role="status" className="mt-6 text-sm text-stone-500">
          AI analizuoja receptą ir rengia pritaikytą variantą…
        </p>
      )}

      {answer && !loading && (
        <div className="mt-6 rounded-xl border border-orange-200 bg-orange-50 p-5">
          <p className="mb-3 text-sm font-bold uppercase tracking-widest text-orange-700">
            AI pritaikytas receptas
          </p>
          <div className="whitespace-pre-line leading-7 text-stone-800">{answer}</div>

          <div className="mt-6 border-t border-orange-200/80 pt-5">
            {user === undefined ? (
              <p className="text-sm text-stone-500">Tikrinama prisijungimo būsena…</p>
            ) : user ? (
              <div className="flex flex-wrap items-center gap-4">
                <button
                  type="button"
                  onClick={handleSaveAiRecipe}
                  disabled={savingAi || saveAiSuccess}
                  className="rounded-xl bg-orange-700 px-5 py-3 font-semibold text-white transition hover:bg-orange-800 disabled:cursor-not-allowed disabled:bg-stone-500"
                >
                  {savingAi
                    ? "Išsaugoma…"
                    : saveAiSuccess
                    ? "✅ Išsaugota į „Mano AI receptai“"
                    : "💾 Išsaugoti pritaikytą receptą"}
                </button>
                {saveAiSuccess && (
                  <Link
                    href="/my-ai-recipes"
                    className="text-sm font-semibold text-orange-700 hover:underline"
                  >
                    Peržiūrėti visus AI receptus →
                  </Link>
                )}
              </div>
            ) : (
              <p className="text-sm text-stone-600">
                Norėdami išsaugoti šį pritaikytą receptą,{" "}
                <Link href="/auth" className="font-semibold text-orange-700 underline">
                  prisijunkite
                </Link>
                .
              </p>
            )}

            {saveAiError && (
              <p role="alert" className="mt-3 text-sm text-red-700">
                {saveAiError}
              </p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
