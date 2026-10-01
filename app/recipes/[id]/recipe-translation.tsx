"use client";

import { useState } from "react";
import Image from "next/image";
import type { MealDetails } from "@/lib/themealdb";
import { useDevMode } from "@/lib/dev-mode-context";
import SaveRecipeButton from "./save-recipe-button";
import AiAdaptForm from "./ai-adapt-form";

type Translation = {
  title: string;
  ingredients: { measure: string; ingredient: string }[];
  instructions: string;
};

export default function RecipeTranslation({ meal }: { meal: MealDetails }) {
  const { recordLog } = useDevMode();
  const [translation, setTranslation] = useState<Translation | null>(null);
  const [showOriginal, setShowOriginal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const title = translation && !showOriginal ? translation.title : meal.strMeal;
  const instructions = translation && !showOriginal ? translation.instructions : meal.instructions;
  const ingredients = meal.ingredients.map((ingredient, index) => ({
    ...ingredient,
    name: translation && !showOriginal ? translation.ingredients[index].ingredient : ingredient.name,
  }));

  async function handleTranslate() {
    if (loading) return;
    setLoading(true);
    setError("");

    const startTime = performance.now();
    let httpStatus: number | string = "Tinklo klaida";
    let success = false;

    try {
      const response = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mealName: meal.strMeal,
          ingredients: meal.ingredients,
          instructions: meal.instructions,
        }),
        signal: AbortSignal.timeout(20000),
      });
      httpStatus = response.status;
      const data: Partial<Translation> & { error?: string } = await response.json();

      if (
        !response.ok ||
        typeof data.title !== "string" ||
        typeof data.instructions !== "string" ||
        !Array.isArray(data.ingredients) ||
        data.ingredients.length !== meal.ingredients.length
      ) {
        throw new Error(data.error ?? "Translation failed");
      }

      setTranslation({
        title: data.title,
        ingredients: data.ingredients,
        instructions: data.instructions,
      });
      setShowOriginal(false);
      success = true;
    } catch {
      setError("Nepavyko išversti recepto. Rodomas originalas.");
    } finally {
      setLoading(false);
      recordLog({
        system: "Gemini",
        endpoint: "/api/translate",
        method: "POST",
        status: httpStatus,
        success,
        durationMs: Math.round(performance.now() - startTime),
        path: "Fridge Rescue → Gemini",
        timestamp: new Date().toLocaleTimeString("lt-LT"),
      });
    }
  }

  return (
    <>
      <div className="mt-8 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-stone-200 md:grid md:grid-cols-2">
        <Image src={meal.strMealThumb} alt={title} width={600} height={600} className="aspect-square h-full w-full object-cover" />
        <div className="p-6 sm:p-8">
          <p className="text-sm font-bold uppercase tracking-widest text-orange-700">Receptas #{meal.idMeal}</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
          <div className="mt-5 flex flex-wrap gap-2 text-sm">
            {meal.category && <span className="rounded-full bg-orange-100 px-3 py-1">{meal.category}</span>}
            {meal.area && <span className="rounded-full bg-orange-100 px-3 py-1">{meal.area}</span>}
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            {!translation ? (
              <button type="button" onClick={handleTranslate} disabled={loading} className="rounded-xl bg-orange-700 px-4 py-2 font-semibold text-white hover:bg-orange-800 disabled:cursor-not-allowed disabled:opacity-60">
                {loading ? "Verčiama…" : "🌐 Išversti į lietuvių kalbą"}
              </button>
            ) : showOriginal ? (
              <button type="button" onClick={() => setShowOriginal(false)} className="rounded-xl border border-orange-700 px-4 py-2 font-semibold text-orange-700 hover:bg-orange-50">
                Rodyti vertimą
              </button>
            ) : (
              <button type="button" onClick={() => setShowOriginal(true)} className="rounded-xl border border-orange-700 px-4 py-2 font-semibold text-orange-700 hover:bg-orange-50">
                Rodyti originalą
              </button>
            )}
          </div>
          {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
          <SaveRecipeButton mealId={meal.idMeal} title={meal.strMeal} imageUrl={meal.strMealThumb} />
        </div>
      </div>
      <div className="mt-8 grid gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-stone-200">
          <h2 className="text-2xl font-bold">Ingredientai</h2>
          <ul className="mt-4 space-y-3">
            {ingredients.map((ingredient, index) => (
              <li key={index} className="border-b border-stone-100 pb-3 last:border-0 last:pb-0">
                {ingredient.measure && <span className="font-semibold">{ingredient.measure} </span>}{ingredient.name}
              </li>
            ))}
          </ul>
        </section>
        <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-stone-200">
          <h2 className="text-2xl font-bold">Gaminimo instrukcija</h2>
          <p className="mt-4 whitespace-pre-line leading-7 text-stone-700">{instructions}</p>
        </section>
      </div>
      <AiAdaptForm
        mealId={meal.idMeal}
        mealName={meal.strMeal}
        ingredients={meal.ingredients}
        instructions={meal.instructions}
      />
    </>
  );
}