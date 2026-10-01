import { searchMealsByIngredient, searchMealsByName } from "@/lib/themealdb";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const type = params.get("type");
  const query = params.get("query")?.trim();

  if ((type !== "ingredient" && type !== "name") || !query || query.length > 100) {
    return Response.json({ error: "Neteisinga paieškos užklausa." }, { status: 400 });
  }

  try {
    const meals = type === "ingredient"
      ? await searchMealsByIngredient(query)
      : await searchMealsByName(query);
    return Response.json({ meals });
  } catch {
    return Response.json(
      { error: "Receptų paslauga (TheMealDB) laikinai nepasiekiama. Pabandykite vėliau." },
      { status: 502 },
    );
  }
}
