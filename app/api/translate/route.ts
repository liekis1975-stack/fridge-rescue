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
  ingredients: string[]
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
  const cleanedText = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
  const candidates = [cleanedText]
  const objectStart = cleanedText.indexOf('{')
  const objectEnd = cleanedText.lastIndexOf('}')
  if (objectStart >= 0 && objectEnd > objectStart) {
    candidates.push(cleanedText.slice(objectStart, objectEnd + 1))
  }

  for (const candidate of candidates) {
    try {
      const value: unknown = JSON.parse(candidate)
      if (!value || typeof value !== 'object') continue
      const result = value as Record<string, unknown>
      const ingredientValues = Array.isArray(result.ingredients)
        ? result.ingredients
        : result.ingredientNames
      if (
        typeof result.title !== 'string' ||
        typeof result.instructions !== 'string' ||
        !Array.isArray(ingredientValues) ||
        !ingredientValues.every((name) => typeof name === 'string')
      ) continue

      return {
        title: result.title,
        ingredients: ingredientValues,
        instructions: result.instructions,
      }
    } catch {
      // Pabandome kitą galimą JSON fragmentą.
    }
  }

  return null
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
{"title":"...","ingredients":["..."],"instructions":"..."}

Svarbu: ingredients masyve turi būti lygiai ${data.ingredients.length} elementų, tokia pačia tvarka kaip pateikta. Į ingredients įrašyk tik išverstus pavadinimus, be kiekių ir matavimo vienetų. Kiekiai ir vienetai bus išsaugoti programoje.

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
                items: { type: Type.STRING },
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

    if (
      !translation ||
      translation.ingredients.length !== body.ingredients.length ||
      translation.ingredients.some((ingredient) => !ingredient.trim())
    ) {
      return Response.json({ error: 'Gemini grąžino netinkamą vertimo formatą.' }, { status: 502 })
    }

    return Response.json(translation)
  } catch (error) {
    console.error('Gemini recipe translation failed:', error)
    return Response.json({ error: 'Vertimo paslauga laikinai nepasiekiama.' }, { status: 502 })
  }
}