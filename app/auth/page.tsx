"use client";

import { useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Mode = "register" | "login";

export default function AuthPage() {
  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;

    const trimmedName = name.trim();
    if (mode === "register" && !trimmedName) {
      setError("Įveskite vardą.");
      return;
    }

    setPending(true);
    setError("");
    setMessage("");

    try {
      if (mode === "register") {
        const { data, error: authError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { name: trimmedName } },
        });
        if (authError) throw authError;
        if (data.session) {
          router.push("/");
        } else {
          setMessage("Registracija gauta. Patikrinkite el. paštą ir patvirtinkite paskyrą, tada prisijunkite.");
        }
      } else {
        const { error: authError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (authError) throw authError;
        router.push("/");
      }
    } catch (cause) {
      const raw = cause instanceof Error ? cause.message : "";
      let friendly = "Nepavyko prisijungti. Pabandykite dar kartą.";

      if (raw.includes("Invalid login credentials")) {
        friendly = "Neteisingas el. paštas arba slaptažodis.";
      } else if (raw.includes("User already registered")) {
        friendly = "Vartotojas su šiuo el. paštu jau užregistruotas. Prisijunkite.";
      } else if (raw.includes("Email rate limit exceeded")) {
        friendly = "Laikinai viršytas el. laiškų siuntimo limitas. Pabandykite vėliau.";
      } else if (raw.includes("Password should be at least")) {
        friendly = "Slaptažodis turi būti bent 6 simbolių.";
      } else if (raw.includes("Email not confirmed")) {
        friendly = "El. paštas dar nepatvirtintas. Patikrinkite pašto dėžutę.";
      }

      setError(friendly);
    } finally {
      setPending(false);
    }
  }

  function changeMode(nextMode: Mode) {
    setMode(nextMode);
    setError("");
    setMessage("");
  }

  return (
    <main className="min-h-screen bg-orange-50 px-5 py-12 text-stone-900 sm:px-8">
      <div className="mx-auto max-w-md">
        <Link href="/" className="font-semibold text-orange-700 hover:underline">← Grįžti į paiešką</Link>
        <div className="mt-8 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-stone-200 sm:p-8">
          <p className="text-sm font-bold uppercase tracking-widest text-orange-700">Fridge Rescue</p>
          <h1 className="mt-3 text-3xl font-bold">{mode === "register" ? "Registracija" : "Prisijungimas"}</h1>
          <div className="mt-6 flex rounded-xl bg-orange-50 p-1" role="group" aria-label="Paskyros veiksmas">
            <button type="button" onClick={() => changeMode("login")} disabled={pending} className={`flex-1 rounded-lg px-3 py-2 font-semibold ${mode === "login" ? "bg-orange-700 text-white" : "text-stone-700"}`}>Prisijungti</button>
            <button type="button" onClick={() => changeMode("register")} disabled={pending} className={`flex-1 rounded-lg px-3 py-2 font-semibold ${mode === "register" ? "bg-orange-700 text-white" : "text-stone-700"}`}>Registruotis</button>
          </div>
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {mode === "register" && (
              <div>
                <label htmlFor="name" className="mb-1 block font-medium">Vardas</label>
                <input id="name" type="text" autoComplete="given-name" value={name} onChange={(event) => setName(event.target.value)} required maxLength={80} disabled={pending} className="w-full rounded-xl border border-stone-300 px-4 py-3 outline-orange-600" />
              </div>
            )}
            <div>
              <label htmlFor="email" className="mb-1 block font-medium">El. paštas</label>
              <input id="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required disabled={pending} className="w-full rounded-xl border border-stone-300 px-4 py-3 outline-orange-600" />
            </div>
            <div>
              <label htmlFor="password" className="mb-1 block font-medium">Slaptažodis</label>
              <input id="password" type="password" autoComplete={mode === "register" ? "new-password" : "current-password"} value={password} onChange={(event) => setPassword(event.target.value)} required minLength={6} disabled={pending} className="w-full rounded-xl border border-stone-300 px-4 py-3 outline-orange-600" />
            </div>
            <button type="submit" disabled={pending} className="w-full rounded-xl bg-orange-700 px-7 py-3 font-semibold text-white hover:bg-orange-800 disabled:opacity-60">{pending ? "Palaukite…" : mode === "register" ? "Registruotis" : "Prisijungti"}</button>
          </form>
          {error && <p role="alert" className="mt-4 text-red-700">{error}</p>}
          {message && <p role="status" className="mt-4 text-green-800">{message}</p>}
        </div>
      </div>
    </main>
  );
}
