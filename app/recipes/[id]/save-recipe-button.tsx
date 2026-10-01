"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { useDevMode } from "@/lib/dev-mode-context";

type Props = { mealId: string; title: string; imageUrl: string };

export default function SaveRecipeButton({ mealId, title, imageUrl }: Props) {
  const supabase = useMemo(() => createClient(), []);
  const { recordLog } = useDevMode();
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setSaved(false);
      setError("");
      setLoading(Boolean(session));
    });
    return () => subscription.unsubscribe();
  }, [supabase]);

  useEffect(() => {
    if (user === undefined) return;
    if (user === null) return;
    let active = true;
    async function checkSaved() {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!active) return;
      if (!currentUser || currentUser.id !== user?.id) {
        setUser(currentUser);
        setLoading(false);
        return;
      }
      const { data, error: queryError } = await supabase
        .from("saved_recipes")
        .select("id")
        .eq("user_id", currentUser.id)
        .eq("meal_id", mealId)
        .maybeSingle();
      if (!active) return;
      if (queryError) setError("Nepavyko patikrinti, ar receptas jau išsaugotas.");
      else setSaved(Boolean(data));
      setLoading(false);
    }
    void checkSaved();
    return () => { active = false; };
  }, [mealId, user, supabase]);

  async function saveRecipe() {
    if (loading || saved) return;
    setError("");
    setLoading(true);

    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) {
      setUser(null);
      setError("Norėdami išsaugoti receptą, prisijunkite.");
      setLoading(false);
      return;
    }

    const startTime = performance.now();
    let httpStatus: number | string = "Tinklo klaida";
    let isSuccess = false;
    try {
      const { error: insertError, status } = await supabase.from("saved_recipes").insert({
        meal_id: mealId,
        title,
        image_url: imageUrl,
      });
      httpStatus = status;
      isSuccess = !insertError;

      if (insertError?.code === "23505") setSaved(true);
      else if (insertError) setError("Nepavyko išsaugoti recepto. Patikrinkite, ar paruošta duomenų bazė.");
      else setSaved(true);
    } catch {
      setError("Nepavyko išsaugoti recepto. Patikrinkite, ar paruošta duomenų bazė.");
    } finally {
      recordLog({
        system: "Supabase",
        endpoint: "/rest/v1/saved_recipes",
        method: "POST",
        status: httpStatus,
        success: isSuccess,
        durationMs: Math.round(performance.now() - startTime),
        path: "Fridge Rescue → Supabase",
        timestamp: new Date().toLocaleTimeString("lt-LT"),
      });
      setLoading(false);
    }
  }

  return (
    <div className="mt-7">
      {loading ? <p className="text-sm text-stone-500">Tikrinama išsaugojimo būsena…</p> : user ? (
        <button type="button" onClick={saveRecipe} disabled={saved} className="rounded-xl bg-orange-700 px-5 py-3 font-semibold text-white hover:bg-orange-800 disabled:cursor-default disabled:bg-stone-500">
          {saved ? "❤️ Išsaugota" : "❤️ Išsaugoti"}
        </button>
      ) : <p className="text-sm text-stone-600"><Link href="/auth" className="font-semibold text-orange-700 underline">Prisijunkite</Link>, kad galėtumėte išsaugoti receptą.</p>}
      {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
    </div>
  );
}
