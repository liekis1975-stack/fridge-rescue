"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { Session, User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { useDevMode } from "@/lib/dev-mode-context";

type SavedRecipe = {
  id: number;
  user_id: string;
  meal_id: string;
  title: string;
  image_url: string;
  created_at: string;
};

export default function MyRecipesPage() {
  const supabase = useMemo(() => createClient(), []);
  const { recordLog } = useDevMode();
  const [user, setUser] = useState<User | null>(null);
  const [recipes, setRecipes] = useState<SavedRecipe[]>([]);
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
          .from("saved_recipes")
          .select("id, user_id, meal_id, title, image_url, created_at")
          .eq("user_id", currentUser.id)
          .order("created_at", { ascending: false });

        if (queryError) throw queryError;
        if (active) setRecipes(data ?? []);
      } catch (cause) {
        console.error("Failed to load saved recipes:", cause);
        if (active) {
          setRecipes([]);
          setError("Nepavyko įkelti išsaugotų receptų. Patikrinkite Supabase ryšį ir duomenų bazę.");
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

  function removeRecipe(recipeId: number) {
    return async function handleRemoveRecipe() {
      if (!user || removingId !== null) return;
    setRemovingId(recipeId);
    setError("");
    const startTime = performance.now();
    let httpStatus: number | string = "Tinklo klaida";
    let isSuccess = false;
    try {
      const { error: deleteError, status } = await supabase
        .from("saved_recipes")
        .delete()
        .eq("id", recipeId)
        .eq("user_id", user.id);
      httpStatus = status;
      isSuccess = !deleteError;
      if (deleteError) setError("Nepavyko pašalinti recepto. Pabandykite dar kartą.");
      else setRecipes((current) => current.filter((recipe) => recipe.id !== recipeId));
    } catch {
      setError("Nepavyko pašalinti recepto. Pabandykite dar kartą.");
      } finally {
        recordLog({
          system: "Supabase",
          endpoint: "/rest/v1/saved_recipes",
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

  return (
    <main className="min-h-screen bg-orange-50 px-5 py-12 text-stone-900 sm:px-8">
      <div className="mx-auto max-w-5xl">
        <Link href="/" className="font-semibold text-orange-700 hover:underline">← Grįžti į paiešką</Link>

        {/* Tab navigacija tarp paprastų ir AI receptų */}
        <div className="mt-8 flex border-b border-stone-200">
          <Link
            href="/my-recipes"
            className="border-b-2 border-orange-700 px-4 py-3 text-sm font-bold text-orange-700"
          >
            Išsaugoti receptai
          </Link>
          <Link
            href="/my-ai-recipes"
            className="border-b-2 border-transparent px-4 py-3 text-sm font-semibold text-stone-500 hover:text-stone-900"
          >
            Mano AI receptai
          </Link>
        </div>

        <h1 className="mt-6 text-4xl font-bold tracking-tight">Mano receptai</h1>
        {loading ? <p role="status" className="mt-8">Įkeliami receptai…</p> : !user ? (
          <p className="mt-8">Norėdami matyti savo receptus, <Link href="/auth" className="font-semibold text-orange-700 underline">prisijunkite</Link>.</p>
        ) : recipes.length === 0 && !error ? <p className="mt-8 rounded-xl bg-white p-6">Dar neišsaugojote receptų.</p> : (
          <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {recipes.map((recipe) => (
              <li key={recipe.id} className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-stone-200">
                <Link href={`/recipes/${recipe.meal_id}`} className="block hover:bg-orange-50">
                  <Image src={recipe.image_url} alt={recipe.title} width={400} height={300} className="aspect-[4/3] w-full object-cover" />
                  <div className="p-5"><h2 className="text-xl font-semibold">{recipe.title}</h2><p className="mt-2 text-sm text-stone-500">Recepto ID: {recipe.meal_id}</p></div>
                </Link>
                <div className="px-5 pb-5">
                  <button type="button" onClick={removeRecipe(recipe.id)} disabled={removingId !== null} className="text-sm font-semibold text-red-700 hover:underline disabled:opacity-50">{removingId === recipe.id ? "Šalinama…" : "Pašalinti"}</button>
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
