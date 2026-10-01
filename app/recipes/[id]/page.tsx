import Link from "next/link";
import { notFound } from "next/navigation";
import { getMealById } from "@/lib/themealdb";
import RecipeTranslation from "./recipe-translation";

type RecipePageProps = { params: Promise<{ id: string }> };

export default async function RecipePage({ params }: RecipePageProps) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();

  let meal;
  try {
    meal = await getMealById(id);
  } catch {
    return <main className="min-h-screen bg-orange-50 px-5 py-12 text-stone-900"><div className="mx-auto max-w-5xl"><Link href="/" className="text-orange-700 underline">← Grįžti į paiešką</Link><p role="alert" className="mt-8">Nepavyko gauti recepto. Pabandykite dar kartą.</p></div></main>;
  }
  if (!meal) notFound();

  return (
    <main className="min-h-screen bg-orange-50 px-5 py-12 text-stone-900 sm:px-8">
      <article className="mx-auto max-w-5xl">
        <Link href="/" className="font-semibold text-orange-700 hover:underline">← Grįžti į paiešką</Link>
        <RecipeTranslation meal={meal} />
      </article>
    </main>
  );
}
