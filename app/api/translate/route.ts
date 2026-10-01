import { GoogleGenAI } from '@google/genai'

export const runtime = 'nodejs'

const MODEL = 'gemini-3.8-flash'

type Ingredient = { name: string; measure: string }

type TranslateRequest = {
  mealName: string
  ingredients: Ingredient[]
  instructions: string
}

type TranslateResponse = {
  title: string
  ingredientNames: string[]
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
  const jsonText = text.trim().replace(/^```json\s*/i, '').replace(/\s*```$/, '')
  try {
    const value: unknown = JSON.parse(jsonText)
    if (!value || typeof value !== 'object') return null
    const result = value as Record<string, unknown>
    if (
      typeof result.title !== 'string' ||
      typeof result.instructions !== 'string' ||
      !Array.isArray(result.ingredientNames) ||
      !result.ingredientNames.every((name) => typeof name === 'string')
    ) return null

    return {
      title: result.title,
      ingredientNames: result.ingredientNames,
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

  return `Išversk šį receptą į taisyklingą, natūralią lietuvių kalbą.
Nekeisk ingredientų kiekių, matavimo vienetų ar gaminimo prasmės.
Nepridėk naujos informacijos ir nekurk naujų ingredientų.
Ingredientų pavadinimus ir gaminimo žingsnius išversk į lietuvių kalbą.

Grąžink tik JSON objektą, be Markdown ir be papildomo teksto, tiksliai tokios struktūros:
{"title":"...","ingredientNames":["..."],"instructions":"..."}

Svarbu: ingredientNames masyve turi būti lygiai ${data.ingredients.length} elementų, tokia pačia tvarka kaip pateikta. Į ingredientNames įrašyk tik išverstus pavadinimus, be kiekių ir matavimo vienetų. Kiekiai ir vienetai bus išsaugoti programoje.

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
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: buildPrompt(body),
    })
    const translation = parseTranslation(response.text ?? '')

    if (!translation || translation.ingredientNames.length !== body.ingredients.length) {
      return Response.json({ error: 'Gemini grąžino netinkamą vertimo formatą.' }, { status: 502 })
    }

    return Response.json(translation)
  } catch (error) {
    console.error('Gemini recipe translation failed:', error)
    return Response.json({ error: 'Vertimo paslauga laikinai nepasiekiama.' }, { status: 502 })
  }
}