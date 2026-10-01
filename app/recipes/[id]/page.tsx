import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getMealById } from "@/lib/themealdb";
import SaveRecipeButton from "./save-recipe-button";
import AiAdaptForm from "./ai-adapt-form";

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
        <div className="mt-8 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-stone-200 md:grid md:grid-cols-2">
          <Image src={meal.strMealThumb} alt={meal.strMeal} width={600} height={600} className="aspect-square h-full w-full object-cover" />
          <div className="p-6 sm:p-8">
            <p className="text-sm font-bold uppercase tracking-widest text-orange-700">Receptas #{meal.idMeal}</p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">{meal.strMeal}</h1>
            <div className="mt-5 flex flex-wrap gap-2 text-sm">
              {meal.category && <span className="rounded-full bg-orange-100 px-3 py-1">{meal.category}</span>}
              {meal.area && <span className="rounded-full bg-orange-100 px-3 py-1">{meal.area}</span>}
            </div>
            <SaveRecipeButton mealId={meal.idMeal} title={meal.strMeal} imageUrl={meal.strMealThumb} />
          </div>
        </div>
        <div className="mt-8 grid gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
          <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-stone-200">
            <h2 className="text-2xl font-bold">Ingredientai</h2>
            <ul className="mt-4 space-y-3">
              {meal.ingredients.map((ingredient, index) => (
                <li key={index} className="border-b border-stone-100 pb-3 last:border-0 last:pb-0">
                  {ingredient.measure && <span className="font-semibold">{ingredient.measure} </span>}{ingredient.name}
                </li>
              ))}
            </ul>
          </section>
          <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-stone-200">
            <h2 className="text-2xl font-bold">Gaminimo instrukcija</h2>
            <p className="mt-4 whitespace-pre-line leading-7 text-stone-700">{meal.instructions}</p>
          </section>
        </div>
        <AiAdaptForm
          mealId={meal.idMeal}
          mealName={meal.strMeal}
          ingredients={meal.ingredients}
          instructions={meal.instructions}
        />
      </article>
    </main>
  );
}
