export type MealSummary = { idMeal: string; strMeal: string; strMealThumb: string };

export type MealDetails = MealSummary & {
  category: string;
  area: string;
  instructions: string;
  ingredients: { name: string; measure: string }[];
};

export async function searchMealsByIngredient(ingredient: string): Promise<MealSummary[]> {
  const url = new URL("https://www.themealdb.com/api/json/v1/1/filter.php");
  url.searchParams.set("i", ingredient);
  return fetchMealSummaries(url);
}

export async function searchMealsByName(name: string): Promise<MealSummary[]> {
  const url = new URL("https://www.themealdb.com/api/json/v1/1/search.php");
  url.searchParams.set("s", name);
  const meals = await fetchMealSummaries(url);
  return meals.map(({ idMeal, strMeal, strMealThumb }) => ({ idMeal, strMeal, strMealThumb }));
}

async function fetchMealSummaries(url: URL): Promise<MealSummary[]> {
  const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error("TheMealDB request failed");

  const data: unknown = await response.json();
  if (!data || typeof data !== "object" || !("meals" in data)) throw new Error("Invalid TheMealDB response");
  const meals = data.meals;
  if (meals === null) return [];
  if (!Array.isArray(meals)) throw new Error("Invalid meals list");
  return meals.filter((meal): meal is MealSummary =>
    meal !== null && typeof meal === "object" &&
    typeof meal.idMeal === "string" && typeof meal.strMeal === "string" &&
    typeof meal.strMealThumb === "string" && meal.strMealThumb.startsWith("https://www.themealdb.com/")
  );
}

export async function getMealById(id: string): Promise<MealDetails | null> {
  const url = new URL("https://www.themealdb.com/api/json/v1/1/lookup.php");
  url.searchParams.set("i", id);
  const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error("TheMealDB request failed");

  const data: unknown = await response.json();
  if (!data || typeof data !== "object" || !("meals" in data)) throw new Error("Invalid TheMealDB response");
  const meals = data.meals;
  if (meals === null) return null;
  if (!Array.isArray(meals) || !meals[0] || typeof meals[0] !== "object") throw new Error("Invalid meal details");

  const meal: Record<string, unknown> = meals[0];
  if (typeof meal.idMeal !== "string" || typeof meal.strMeal !== "string" ||
      typeof meal.strMealThumb !== "string" || !meal.strMealThumb.startsWith("https://www.themealdb.com/") ||
      typeof meal.strInstructions !== "string") throw new Error("Invalid meal details");

  const ingredients: MealDetails["ingredients"] = [];
  for (let number = 1; number <= 20; number++) {
    const name = meal[`strIngredient${number}`];
    const measure = meal[`strMeasure${number}`];
    if (typeof name === "string" && name.trim()) {
      ingredients.push({ name: name.trim(), measure: typeof measure === "string" ? measure.trim() : "" });
    }
  }

  return {
    idMeal: meal.idMeal,
    strMeal: meal.strMeal,
    strMealThumb: meal.strMealThumb,
    category: typeof meal.strCategory === "string" ? meal.strCategory : "",
    area: typeof meal.strArea === "string" ? meal.strArea : "",
    instructions: meal.strInstructions,
    ingredients,
  };
}
