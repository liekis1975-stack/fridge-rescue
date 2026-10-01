"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

export default function AuthStatus() {
  const supabase = useMemo(() => createClient(), []);
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setReady(true);
    });
    return () => subscription.unsubscribe();
  }, [supabase]);

  async function handleSignOut() {
    setError("");
    const { error: authError } = await supabase.auth.signOut({ scope: "local" });
    if (authError) setError("Nepavyko atsijungti. Pabandykite dar kartą.");
  }

  if (!ready) return <p className="text-sm text-stone-500">Tikrinama paskyra…</p>;

  const name = user?.user_metadata?.name;
  return (
    <div className="text-sm font-medium">
      {user ? (
        <div className="flex flex-wrap items-center gap-3">
          <span>Sveikas, {typeof name === "string" && name.trim() ? name : user.email}!</span>
          <button type="button" onClick={handleSignOut} className="text-orange-700 hover:underline">Atsijungti</button>
        </div>
      ) : <Link href="/auth" className="text-orange-700 hover:underline">Prisijungti / registruotis</Link>}
      {error && <p role="alert" className="mt-2 text-red-700">{error}</p>}
    </div>
  );
}
