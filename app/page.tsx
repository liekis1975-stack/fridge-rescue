"use client";

import { useRef, useState, type FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import type { MealSummary } from "@/lib/themealdb";
import { useDevMode } from "@/lib/dev-mode-context";
import AuthStatus from "./auth-status";

type SearchType = "ingredient" | "name";

export default function Home() {
  const { recordLog } = useDevMode();
  const [searchType, setSearchType] = useState<SearchType>("ingredient");
  const [query, setQuery] = useState("");
  const [meals, setMeals] = useState<MealSummary[] | null>(null);
  const [searchedFor, setSearchedFor] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const requestInProgress = useRef(false);

  async function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (requestInProgress.current) return;

    const selectedType = new FormData(event.currentTarget).get("searchType");
    const value = query.trim();
    if (!value) {
      setError("Įveskite ingredientą arba patiekalo pavadinimą.");
      setMeals(null);
      return;
    }

    requestInProgress.current = true;
    setLoading(true);
    setError("");
    setMeals(null);
    setSearchedFor("");

    const startTime = performance.now();
    let httpStatus: number | string = "Tinklo klaida";
    let isSuccess = false;

    try {
      const params = new URLSearchParams({ type: selectedType === "name" ? "name" : "ingredient", query: value });
      const response = await fetch(`/api/search?${params}`);
      httpStatus = response.status;
      isSuccess = response.ok;

      const data: { meals?: MealSummary[]; error?: string } = await response.json();
      if (!response.ok || !data.meals) {
        throw new Error(data.error || "Nepavyko gauti receptų. Pabandykite dar kartą.");
      }
      isSuccess = true;
      setMeals(data.meals);
      setSearchedFor(value);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Nepavyko gauti receptų. Pabandykite dar kartą.";
      setError(message);
    } finally {
      const durationMs = Math.round(performance.now() - startTime);
      recordLog({
        system: "TheMealDB",
        endpoint: "/api/search",
        method: "GET",
        status: httpStatus,
        success: isSuccess,
        durationMs,
        path: "TheMealDB → Fridge Rescue",
        timestamp: new Date().toLocaleTimeString("lt-LT"),
      });
      requestInProgress.current = false;
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-orange-50 px-5 py-12 text-stone-900 sm:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 flex flex-wrap items-center justify-end gap-5">
          <Link href="/my-recipes" className="text-sm font-semibold text-orange-700 hover:underline">Mano receptai</Link>
          <Link href="/my-ai-recipes" className="text-sm font-semibold text-orange-700 hover:underline">Mano AI receptai</Link>
          <AuthStatus />
        </div>
        <p className="mb-3 text-sm font-bold uppercase tracking-widest text-orange-700">Fridge Rescue</p>
        <h1 className="max-w-2xl text-4xl font-bold tracking-tight sm:text-5xl">Ką gaminsime iš to, ką turite?</h1>
        <p className="mt-4 max-w-xl text-lg text-stone-600">Raskite receptų pagal ingredientą arba patiekalo pavadinimą.</p>

        <form onSubmit={handleSearch} className="mt-8 max-w-2xl">
          <fieldset disabled={loading} className="flex flex-wrap gap-2">
            <legend className="mb-3 text-sm font-semibold text-stone-700">Ieškoti pagal</legend>
            <label className={`cursor-pointer rounded-full px-4 py-2 text-sm font-semibold ${searchType === "ingredient" ? "bg-orange-700 text-white" : "bg-white text-stone-700 ring-1 ring-stone-300"}`}>
              <input type="radio" name="searchType" value="ingredient" checked={searchType === "ingredient"} onChange={() => { setSearchType("ingredient"); setMeals(null); setError(""); }} className="sr-only" />
              Ingredientą
            </label>
            <label className={`cursor-pointer rounded-full px-4 py-2 text-sm font-semibold ${searchType === "name" ? "bg-orange-700 text-white" : "bg-white text-stone-700 ring-1 ring-stone-300"}`}>
              <input type="radio" name="searchType" value="name" checked={searchType === "name"} onChange={() => { setSearchType("name"); setMeals(null); setError(""); }} className="sr-only" />
              Patiekalo pavadinimą
            </label>
          </fieldset>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <label htmlFor="query" className="sr-only">{searchType === "ingredient" ? "Ingredientas" : "Patiekalo pavadinimas"}</label>
            <input id="query" name="query" type="search" placeholder={searchType === "ingredient" ? "Pavyzdžiui, chicken" : "Pavyzdžiui, pasta"} value={query} onChange={(event) => { setQuery(event.target.value); setError(""); }} disabled={loading} maxLength={100} className="min-w-0 flex-1 rounded-xl border border-stone-300 bg-white px-4 py-3 outline-orange-600" />
            <button type="submit" disabled={loading} className="rounded-xl bg-orange-700 px-7 py-3 font-semibold text-white hover:bg-orange-800 disabled:cursor-not-allowed disabled:opacity-60">{loading ? "Ieškoma…" : "Ieškoti"}</button>
          </div>
        </form>
        <p className="mt-2 text-sm text-stone-500">Paieškos žodį rašykite angliškai.</p>

        {loading && <p role="status" className="mt-8 text-stone-700">Ieškoma receptų…</p>}
        {error && <p role="alert" className="mt-8 text-red-700">{error}</p>}
        {meals !== null && !loading && !error && (
          <section className="mt-12" aria-label="Paieškos rezultatai">
            <h2 className="mb-6 text-2xl font-bold">Receptai pagal „{searchedFor}“</h2>
            {meals.length > 0 ? (
              <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {meals.map((meal) => (
                  <li key={meal.idMeal} className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-stone-200">
                    <Link href={`/recipes/${meal.idMeal}`} className="block h-full transition hover:bg-orange-50 focus-visible:outline-2 focus-visible:outline-orange-700">
                      <Image src={meal.strMealThumb} alt={meal.strMeal} width={400} height={300} className="aspect-[4/3] w-full object-cover" />
                      <div className="p-5">
                        <h3 className="text-xl font-semibold">{meal.strMeal}</h3>
                        <p className="mt-2 text-sm text-stone-500">Recepto ID: {meal.idMeal}</p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : <p className="rounded-xl bg-white p-6 text-stone-600">Receptų nerasta. Pabandykite kitą paieškos žodį.</p>}
          </section>
        )}
      </div>
    </main>
  );
}
