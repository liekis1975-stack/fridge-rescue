"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Session, User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { useDevMode } from "@/lib/dev-mode-context";

type SavedAiRecipe = {
  id: number;
  user_id: string;
  original_recipe_id: string | null;
  original_recipe_name: string;
  user_request: string;
  ai_result: string;
  time_minutes: number | null;
  servings: number | null;
  priority: string | null;
  created_at: string;
};

export default function MyAiRecipesPage() {
  const supabase = useMemo(() => createClient(), []);
  const { recordLog } = useDevMode();
  const [user, setUser] = useState<User | null>(null);
  const [recipes, setRecipes] = useState<SavedAiRecipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState<number | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const timeoutId = window.setTimeout(() => {
      if (active) {
        setLoading(false);
        setError("Receptų įkėlimas užtruko. Patikrinkite Supabase ryšį ir bandykite dar kartą.");
      }
    }, 10000);

    async function loadRecipes(session: Session | null) {
      try {
        const currentUser = session?.user ?? null;
        if (!currentUser) {
          setUser(null);
          setRecipes([]);
          return;
        }

        setUser(currentUser);
        const { data, error: queryError } = await supabase
          .from("saved_ai_recipes")
          .select("id, user_id, original_recipe_id, original_recipe_name, user_request, ai_result, time_minutes, servings, priority, created_at")
          .eq("user_id", currentUser.id)
          .order("created_at", { ascending: false });

        if (queryError) throw queryError;
        if (active) setRecipes(data ?? []);
      } catch (cause) {
        console.error("Failed to load saved AI recipes:", cause);
        if (active) {
          setRecipes([]);
          setError("Nepavyko įkelti išsaugotų AI receptų. Patikrinkite, ar Supabase sukurta lentelė saved_ai_recipes.");
        }
      } finally {
        if (active) {
          window.clearTimeout(timeoutId);
          setLoading(false);
        }
      }
    }

    void supabase.auth.getSession()
      .then(({ data, error: sessionError }) => {
        if (sessionError) throw sessionError;
        return loadRecipes(data.session);
      })
      .catch((cause) => {
        console.error("Failed to get Supabase session:", cause);
        if (active) {
          setError("Nepavyko patikrinti prisijungimo. Patikrinkite Supabase ryšį.");
          setLoading(false);
        }
      });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "INITIAL_SESSION") return;
      window.setTimeout(() => {
        if (active) void loadRecipes(session);
      }, 0);
    });

    return () => {
      active = false;
      window.clearTimeout(timeoutId);
      void subscription.unsubscribe();
    };
  }, [supabase]);

  function removeAiRecipe(recipeId: number) {
    return async function handleRemoveAiRecipe() {
      if (!user || removingId !== null) return;
    setRemovingId(recipeId);
    setError("");

    const startTime = performance.now();
    let httpStatus: number | string = "Tinklo klaida";
    let isSuccess = false;
    try {
      const { error: deleteError, status } = await supabase
        .from("saved_ai_recipes")
        .delete()
        .eq("id", recipeId)
        .eq("user_id", user.id);
      httpStatus = status;
      isSuccess = !deleteError;

      if (deleteError) {
        setError("Nepavyko pašalinti AI recepto. Pabandykite dar kartą.");
      } else {
        setRecipes((current) => current.filter((recipe) => recipe.id !== recipeId));
      }
    } catch {
      setError("Nepavyko pašalinti AI recepto. Pabandykite dar kartą.");
      } finally {
        recordLog({
          system: "Supabase",
          endpoint: "/rest/v1/saved_ai_recipes",
          method: "DELETE",
          status: httpStatus,
          success: isSuccess,
          durationMs: Math.round(performance.now() - startTime),
          path: "Fridge Rescue → Supabase",
          timestamp: new Date().toLocaleTimeString("lt-LT"),
        });
        setRemovingId(null);
      }
    };
  }

  function formatDate(isoString: string): string {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString("lt-LT", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return isoString;
    }
  }

  return (
    <main className="min-h-screen bg-orange-50 px-5 py-12 text-stone-900 sm:px-8">
      <div className="mx-auto max-w-5xl">
        <Link href="/" className="font-semibold text-orange-700 hover:underline">
          ← Grįžti į paiešką
        </Link>

        {/* Tab navigacija tarp paprastų ir AI receptų */}
        <div className="mt-8 flex border-b border-stone-200">
          <Link
            href="/my-recipes"
            className="border-b-2 border-transparent px-4 py-3 text-sm font-semibold text-stone-500 hover:text-stone-900"
          >
            Išsaugoti receptai
          </Link>
          <Link
            href="/my-ai-recipes"
            className="border-b-2 border-orange-700 px-4 py-3 text-sm font-bold text-orange-700"
          >
            Mano AI receptai
          </Link>
        </div>

        <h1 className="mt-6 text-4xl font-bold tracking-tight">Mano AI receptai</h1>
        <p className="mt-2 text-stone-600">
          Čia saugomi receptai, kuriuos Gemini AI pritaikė pagal jūsų pageidavimus.
        </p>

        {loading ? (
          <p role="status" className="mt-8">Įkeliami AI receptai…</p>
        ) : !user ? (
          <p className="mt-8">
            Norėdami matyti savo išsaugotus AI receptus,{" "}
            <Link href="/auth" className="font-semibold text-orange-700 underline">
              prisijunkite
            </Link>
            .
          </p>
        ) : recipes.length === 0 && !error ? (
          <div className="mt-8 rounded-2xl bg-white p-8 text-center ring-1 ring-stone-200">
            <p className="text-lg font-semibold text-stone-800">Dar neišsaugojote jokių AI receptų</p>
            <p className="mt-2 text-sm text-stone-500">
              Atidarykite bet kurį receptą, naudokite „AI recepto gelbėtoją“ ir paspauskite „💾 Išsaugoti pritaikytą receptą“.
            </p>
            <Link
              href="/"
              className="mt-5 inline-block rounded-xl bg-orange-700 px-6 py-3 font-semibold text-white hover:bg-orange-800"
            >
              Ieškoti receptų
            </Link>
          </div>
        ) : (
          <ul className="mt-8 space-y-6">
            {recipes.map((recipe) => (
              <li
                key={recipe.id}
                className="overflow-hidden rounded-2xl bg-white p-6 shadow-sm ring-1 ring-stone-200 sm:p-8"
              >
                <div className="flex flex-wrap items-start justify-between gap-4 border-b border-stone-100 pb-4">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-widest text-orange-700">
                      Originalus patiekalas
                    </span>
                    <h2 className="mt-1 text-2xl font-bold text-stone-900">
                      {recipe.original_recipe_id ? (
                        <Link
                          href={`/recipes/${recipe.original_recipe_id}`}
                          className="hover:text-orange-700 hover:underline"
                        >
                          {recipe.original_recipe_name} ↗
                        </Link>
                      ) : (
                        recipe.original_recipe_name
                      )}
                    </h2>
                    <p className="mt-1 text-xs text-stone-400">
                      Išsaugota: {formatDate(recipe.created_at)}
                    </p>
                  </div>

                  <button
                    type="button"
                          onClick={removeAiRecipe(recipe.id)}
                    disabled={removingId !== null}
                    className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
                  >
                    {removingId === recipe.id ? "Šalinama…" : "🗑 Pašalinti"}
                  </button>
                </div>

                {/* Parametrai (jei yra) */}
                <div className="mt-4 flex flex-wrap gap-2 text-xs font-medium text-stone-600">
                  {recipe.time_minutes && (
                    <span className="rounded-full bg-stone-100 px-3 py-1">
                      ⏱ {recipe.time_minutes} min.
                    </span>
                  )}
                  {recipe.servings && (
                    <span className="rounded-full bg-stone-100 px-3 py-1">
                      👥 {recipe.servings} {recipe.servings === 1 ? "žmogus" : "žmonės"}
                    </span>
                  )}
                  {recipe.priority && (
                    <span className="rounded-full bg-orange-100 px-3 py-1 text-orange-800">
                      🎯 {recipe.priority}
                    </span>
                  )}
                </div>

                {/* Vartotojo prašymas */}
                <div className="mt-4 rounded-xl bg-stone-50 p-4 ring-1 ring-stone-200/60">
                  <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                    Jūsų prašymas:
                  </p>
                  <p className="mt-1 text-sm italic text-stone-700">
                    „{recipe.user_request}“
                  </p>
                </div>

                {/* AI atsakymas */}
                <div className="mt-4 rounded-xl border border-orange-200 bg-orange-50/70 p-5">
                  <p className="mb-2 text-xs font-bold uppercase tracking-widest text-orange-700">
                    AI pritaikytas receptas
                  </p>
                  <div className="whitespace-pre-line text-sm leading-relaxed text-stone-800">
                    {recipe.ai_result}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}

        {error && <p role="alert" className="mt-5 text-red-700">{error}</p>}
      </div>
    </main>
  );
}
