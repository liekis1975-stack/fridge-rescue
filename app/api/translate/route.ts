import { GoogleGenAI, Type } from '@google/genai'

export const runtime = 'nodejs'

const MODEL = 'gemini-3.8-flash'
const GEMINI_TIMEOUT_MS = 15000

type Ingredient = { name: string; measure: string }

type TranslateRequest = {
  mealName: string
  ingredients: Ingredient[]
  instructions: string
}

type TranslateResponse = {
  title: string
  ingredients: { measure: string; ingredient: string }[]
  instructions: string
}

function isTranslateRequest(body: unknown): body is TranslateRequest {
  if (!body || typeof body !== 'object') return false
  const value = body as Record<string, unknown>
  if (typeof value.mealName !== 'string' || !value.mealName.trim()) return false
  if (typeof value.instructions !== 'string' || !value.instructions.trim()) return false
  if (!Array.isArray(value.ingredients)) return false

  return value.ingredients.every((ingredient) => {
    if (!ingredient || typeof ingredient !== 'object') return false
    const item = ingredient as Record<string, unknown>
    return typeof item.name === 'string' && typeof item.measure === 'string'
  })
}

function parseTranslation(text: string): TranslateResponse | null {
  try {
    const value: unknown = JSON.parse(text.trim())
    if (!value || typeof value !== 'object') return null
    const result = value as Record<string, unknown>
    if (
      typeof result.title !== 'string' ||
      typeof result.instructions !== 'string' ||
      !Array.isArray(result.ingredients) ||
      !result.ingredients.every((item) => {
        if (!item || typeof item !== 'object') return false
        const ingredient = item as Record<string, unknown>
        return typeof ingredient.measure === 'string' &&
          typeof ingredient.ingredient === 'string' &&
          ingredient.ingredient.trim() !== ''
      })
    ) return null

    return {
      title: result.title,
      ingredients: result.ingredients as { measure: string; ingredient: string }[],
      instructions: result.instructions,
    }
  } catch {
    return null
  }
}

function buildPrompt(data: TranslateRequest): string {
  const ingredientList = data.ingredients
    .map((ingredient, index) => `${index + 1}. Pavadinimas: ${ingredient.name} | Kiekis ir vienetas: ${ingredient.measure || '(nenurodyta)'}`)
    .join('\n')

  return `Išversk pateiktą receptą į natūralią lietuvių kalbą.
Nekeisk ingredientų kiekių, matavimo vienetų ar gaminimo prasmės.
Nepridėk naujų ingredientų.
Jei ingrediento tekstas neįprastas, vis tiek išversk jo pavadinimą kiek įmanoma natūraliau.
Ingredientų kiekius ir matavimo vienetus palik tokius, kokie pateikti.

Grąžink tik struktūruotą JSON objektą, be Markdown ir be papildomo teksto, tiksliai tokios struktūros:
{"title":"...","ingredients":[{"measure":"originalus kiekis","ingredient":"lietuviškas pavadinimas"}],"instructions":"..."}

Svarbu: ingredients masyve turi būti lygiai ${data.ingredients.length} objektų, tokia pačia tvarka kaip pateikta. Į measure nukopijuok originalų kiekį ir matavimo vienetą nekeisdamas nė vieno simbolio. Į ingredient įrašyk tik išverstą pavadinimą.

=== RECEPTO PAVADINIMAS ===
${data.mealName}

=== INGREDIENTAI ===
${ingredientList}

=== GAMINIMO INSTRUKCIJA ===
${data.instructions}`
}

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return Response.json({ error: 'Serverio konfigūracijos klaida: nerastas AI API raktas.' }, { status: 500 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Netinkamas užklausos formatas.' }, { status: 400 })
  }

  if (!isTranslateRequest(body)) {
    return Response.json({ error: 'Trūksta recepto vertimui reikalingų duomenų.' }, { status: 400 })
  }

  try {
    const ai = new GoogleGenAI({ apiKey })
    const response = await Promise.race([
      ai.models.generateContent({
        model: MODEL,
        contents: buildPrompt(body),
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              ingredients: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    measure: { type: Type.STRING },
                    ingredient: { type: Type.STRING },
                  },
                  required: ['measure', 'ingredient'],
                },
              },
              instructions: { type: Type.STRING },
            },
            required: ['title', 'ingredients', 'instructions'],
          },
        },
      }),
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Gemini request timed out')), GEMINI_TIMEOUT_MS)
      }),
    ])
    const translation = parseTranslation(response.text ?? '')

    if (!translation || translation.ingredients.length !== body.ingredients.length) {
      return Response.json({ error: 'Gemini grąžino netinkamą vertimo formatą.' }, { status: 502 })
    }

    return Response.json({
      title: translation.title,
      ingredients: translation.ingredients.map((ingredient, index) => ({
        measure: body.ingredients[index].measure,
        ingredient: ingredient.ingredient,
      })),
      instructions: translation.instructions,
    })
  } catch (error) {
    console.error('Gemini recipe translation failed:', error)
    return Response.json({ error: 'Vertimo paslauga laikinai nepasiekiama.' }, { status: 502 })
  }
}