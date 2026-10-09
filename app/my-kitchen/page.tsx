"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import type { Session, User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { useDevMode } from "@/lib/dev-mode-context";

type KitchenItem = {
  id: number;
  item_name: string;
  created_at: string;
};

export default function MyKitchenPage() {
  const supabase = useMemo(() => createClient(), []);
  const { recordLog } = useDevMode();
  const recordLogRef = useRef(recordLog);
  const [user, setUser] = useState<User | null>(null);
  const [items, setItems] = useState<KitchenItem[]>([]);
  const [itemName, setItemName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [removingId, setRemovingId] = useState<number | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    recordLogRef.current = recordLog;
  }, [recordLog]);

  useEffect(() => {
    let active = true;

    async function loadItems(session: Session | null) {
      const currentUser = session?.user ?? null;
      if (active) {
        setUser(currentUser);
        setError("");
      }

      if (!currentUser) {
        if (active) {
          setItems([]);
          setLoading(false);
        }
        return;
      }

      if (active) setLoading(true);
      const startTime = performance.now();
      let status: number | string = "Tinklo klaida";
      let success = false;

      try {
        const result = await supabase
          .from("kitchen_items")
          .select("id, item_name, created_at")
          .order("created_at", { ascending: false });
        status = result.status;
        if (result.error) throw result.error;
        success = true;
        if (active) setItems(result.data ?? []);
      } catch (cause) {
        console.error("Failed to load kitchen items:", cause);
        if (active) {
          setItems([]);
          setError("Nepavyko įkelti produktų. Patikrinkite Supabase ryšį ir duomenų bazę.");
        }
      } finally {
        recordLogRef.current({
          system: "Supabase",
          endpoint: "/rest/v1/kitchen_items",
          method: "GET",
          status,
          success,
          durationMs: Math.round(performance.now() - startTime),
          path: "Fridge Rescue → Supabase",
          timestamp: new Date().toLocaleTimeString("lt-LT"),
        });
        if (active) setLoading(false);
      }
    }

    void supabase.auth.getSession()
      .then(({ data, error: sessionError }) => {
        if (sessionError) throw sessionError;
        return loadItems(data.session);
      })
      .catch((cause: unknown) => {
        console.error("Failed to get Supabase session:", cause);
        if (active) {
          setError("Nepavyko patikrinti prisijungimo. Patikrinkite Supabase ryšį.");
          setLoading(false);
        }
      });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "INITIAL_SESSION") return;
      window.setTimeout(() => {
        if (active) void loadItems(session);
      }, 0);
    });

    return () => {
      active = false;
      void subscription.unsubscribe();
    };
  }, [supabase]);

  async function handleAddItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = itemName.trim();
    if (!user || !name || saving) return;

    setSaving(true);
    setError("");
    const startTime = performance.now();
    let status: number | string = "Tinklo klaida";
    let success = false;

    try {
      const result = await supabase
        .from("kitchen_items")
        .insert({ item_name: name })
        .select("id, item_name, created_at")
        .single();
      status = result.status;
      if (result.error) throw result.error;
      success = true;
      setItems((current) => [result.data, ...current]);
      setItemName("");
    } catch (cause) {
      console.error("Failed to add kitchen item:", cause);
      setError("Nepavyko pridėti produkto. Pabandykite dar kartą.");
    } finally {
      recordLog({
        system: "Supabase",
        endpoint: "/rest/v1/kitchen_items",
        method: "POST",
        status,
        success,
        durationMs: Math.round(performance.now() - startTime),
        path: "Fridge Rescue → Supabase",
        timestamp: new Date().toLocaleTimeString("lt-LT"),
      });
      setSaving(false);
    }
  }

  function removeItem(itemId: number) {
    return async function handleRemoveItem() {
      if (!user || removingId !== null) return;

      setRemovingId(itemId);
      setError("");
      const startTime = performance.now();
      let status: number | string = "Tinklo klaida";
      let success = false;

      try {
        const result = await supabase
          .from("kitchen_items")
          .delete()
          .eq("id", itemId);
        status = result.status;
        if (result.error) throw result.error;
        success = true;
        setItems((current) => current.filter((item) => item.id !== itemId));
      } catch (cause) {
        console.error("Failed to remove kitchen item:", cause);
        setError("Nepavyko pašalinti produkto. Pabandykite dar kartą.");
      } finally {
        recordLog({
          system: "Supabase",
          endpoint: "/rest/v1/kitchen_items",
          method: "DELETE",
          status,
          success,
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
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <Link href="/" className="font-semibold text-orange-700 hover:underline">← Grįžti į paiešką</Link>
          <nav aria-label="Pagrindinė navigacija" className="flex flex-wrap gap-4 text-sm font-semibold text-orange-700">
            <Link href="/my-recipes" className="hover:underline">Mano receptai</Link>
            <Link href="/my-ai-recipes" className="hover:underline">Mano AI receptai</Link>
          </nav>
        </div>

        <h1 className="text-4xl font-bold tracking-tight">Mano virtuvė</h1>
        <p className="mt-3 max-w-xl text-stone-600">Išsaugokite turimus produktus ir patikrinkite, ko reikės receptui.</p>

        {loading ? (
          <p role="status" className="mt-8 text-stone-700">Įkeliami produktai…</p>
        ) : !user ? (
          <p className="mt-8 rounded-xl bg-white p-6">
            Norėdami naudotis savo virtuve, <Link href="/auth" className="font-semibold text-orange-700 underline">prisijunkite</Link>.
          </p>
        ) : (
          <>
            <form onSubmit={handleAddItem} className="mt-8 flex max-w-2xl flex-col gap-3 sm:flex-row">
              <label htmlFor="kitchen-item" className="sr-only">Produkto pavadinimas</label>
              <input
                id="kitchen-item"
                type="text"
                value={itemName}
                onChange={(event) => setItemName(event.target.value)}
                placeholder="Pavyzdžiui, pomidorai"
                maxLength={100}
                required
                disabled={saving}
                className="min-w-0 flex-1 rounded-xl border border-stone-300 bg-white px-4 py-3 outline-orange-600"
              />
              <button
                type="submit"
                disabled={saving || !itemName.trim()}
                className="rounded-xl bg-orange-700 px-7 py-3 font-semibold text-white hover:bg-orange-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "Pridedama…" : "Pridėti"}
              </button>
            </form>

            {items.length === 0 ? (
              <p className="mt-8 rounded-xl bg-white p-6">Sąrašas tuščias. Pridėkite turimus produktus.</p>
            ) : (
              <ul className="mt-8 max-w-2xl divide-y divide-stone-200 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-stone-200">
                {items.map((item) => (
                  <li key={item.id} className="flex items-center justify-between gap-4 px-5 py-4">
                    <span className="font-medium">{item.item_name}</span>
                    <button
                      type="button"
                      onClick={removeItem(item.id)}
                      disabled={removingId !== null}
                      className="shrink-0 text-sm font-semibold text-red-700 hover:underline disabled:opacity-50"
                    >
                      {removingId === item.id ? "Šalinama…" : "Pašalinti"}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}

        {error && <p role="alert" className="mt-5 text-red-700">{error}</p>}
      </div>
    </main>
  );
}
