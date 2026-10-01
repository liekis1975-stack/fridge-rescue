import { GoogleGenAI } from '@google/genai'

export const runtime = 'nodejs'

const MODEL = 'gemini-3.8-flash'
const MAX_USER_REQUEST_LENGTH = 500

const VALID_TIME_VALUES = [15, 30, 60] as const
const VALID_SERVINGS_VALUES = [1, 2, 4] as const
const VALID_PRIORITY_VALUES = ['paprasčiau', 'pigiau', 'sveikiau', 'originalas'] as const

type TimeOption = (typeof VALID_TIME_VALUES)[number]
type ServingsOption = (typeof VALID_SERVINGS_VALUES)[number]
type PriorityOption = (typeof VALID_PRIORITY_VALUES)[number]

type Ingredient = { name: string; measure: string }

type AdaptRequest = {
  mealName: string
  ingredients: Ingredient[]
  instructions: string
  userRequest: string
  timeMinutes: TimeOption
  servings: ServingsOption
  priority: PriorityOption
}

const PRIORITY_LABELS: Record<PriorityOption, string> = {
  paprasčiau: 'Paprasčiau – supaprastink techniką ir ingredientus',
  pigiau: 'Pigiau – naudok pigesnius ingredientų pakaitalus',
  sveikiau: 'Sveikiau – sumažink riebalus, cukrų, naudok sveikesnius produktus',
  originalas: 'Kuo panašiau į originalą – išlaikyk originalius skonius ir techniką',
}

function buildPrompt(data: AdaptRequest): string {
  const ingredientList = data.ingredients
    .map((i) => `- ${i.measure ? i.measure + ' ' : ''}${i.name}`)
    .join('\n')

  return `Tu esi kulinarijos pagalbininkas. Vartotojas nori pritaikyti receptą pagal savo situaciją.

=== ORIGINALUS RECEPTAS ===
${data.mealName}

=== INGREDIENTAI ===
${ingredientList}

=== GAMINIMO INSTRUKCIJA ===
${data.instructions.slice(0, 2000)}

=== VARTOTOJO SITUACIJA ===
${data.userRequest}

=== TURIMAS LAIKAS ===
${data.timeMinutes} minučių

=== ŽMONIŲ SKAIČIUS ===
${data.servings} ${data.servings === 1 ? 'žmogus' : 'žmonės'}

=== PRIORITETAS ===
${PRIORITY_LABELS[data.priority]}

Pritaikyk šį receptą atsižvelgdamas į visą aukščiau pateiktą informaciją. Laikykis šių taisyklių:
- Aiškiai nurodyk, kokie ingredientai keičiami ir kuo.
- Pakoreguok kiekius pagal nurodytą žmonių skaičių (${data.servings} ${data.servings === 1 ? 'žmogus' : 'žmonės'}).
- Pritaikyk gaminimo eigą, kad ji tilptų į ${data.timeMinutes} minučių.
- Atsižvelk į pasirinktą prioritetą: ${PRIORITY_LABELS[data.priority]}.
- Pateik aiškią pritaikytą gaminimo eigą žingsnis po žingsnio.
- Rašyk lietuviškai, aiškiai ir glaustai.
- Nenaudok perteklinio teksto, įžangų ar baigiamųjų frazių.`
}

function isValidAdaptRequest(body: unknown): body is AdaptRequest {
  if (!body || typeof body !== 'object') return false
  const b = body as Record<string, unknown>

  const mealNameOk = typeof b.mealName === 'string' && b.mealName.trim() !== ''
  const ingredientsOk = Array.isArray(b.ingredients)
  const instructionsOk = typeof b.instructions === 'string'
  const userRequestOk = typeof b.userRequest === 'string' && b.userRequest.trim() !== ''
  const timeOk = (VALID_TIME_VALUES as readonly unknown[]).includes(b.timeMinutes)
  const servingsOk = (VALID_SERVINGS_VALUES as readonly unknown[]).includes(b.servings)
  const priorityOk = (VALID_PRIORITY_VALUES as readonly unknown[]).includes(b.priority)

  return mealNameOk && ingredientsOk && instructionsOk && userRequestOk && timeOk && servingsOk && priorityOk
}

export function getGeminiErrorMessage(error: unknown): { error: string; status: number } {
  const errStr = String(error)
  const errMessage =
    typeof error === 'object' && error !== null && 'message' in error
      ? String((error as { message: unknown }).message)
      : ''
  const errStatus =
    typeof error === 'object' && error !== null && 'status' in error
      ? Number((error as { status: unknown }).status)
      : undefined

  const fullText = `${errStr} ${errMessage}`.toLowerCase()

  // 1. Neteisingas arba neveikiantis API raktas (400, 401, 403, API_KEY_INVALID)
  if (
    errStatus === 400 ||
    errStatus === 401 ||
    errStatus === 403 ||
    fullText.includes('api_key_invalid') ||
    fullText.includes('api key not valid') ||
    fullText.includes('invalid api key') ||
    fullText.includes('permission_denied') ||
    fullText.includes('unauthenticated')
  ) {
    return {
      error: 'AI autentifikacija nepavyko.',
      status: 401,
    }
  }

  // 2. Limitas (429 / RESOURCE_EXHAUSTED / Quota)
  if (
    errStatus === 429 ||
    fullText.includes('429') ||
    fullText.includes('resource_exhausted') ||
    fullText.includes('quota') ||
    fullText.includes('rate limit')
  ) {
    return {
      error: 'Pasiektas AI naudojimo limitas. Bandykite vėliau.',
      status: 429,
    }
  }

  // 3. Serveris perkrautas (503 / UNAVAILABLE)
  if (
    errStatus === 503 ||
    fullText.includes('503') ||
    fullText.includes('unavailable') ||
    fullText.includes('overloaded') ||
    fullText.includes('high demand')
  ) {
    return {
      error: 'Gemini šiuo metu perkrautas. Bandykite po kelių minučių.',
      status: 503,
    }
  }

  // 4. Bendras Gemini API ar tinklo gedimas
  return {
    error: 'AI paslauga laikinai nepasiekiama.',
    status: 502,
  }
}

export async function POST(request: Request) {
  // 1. Patikrinti API raktą
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return Response.json(
      { error: 'Serverio konfigūracijos klaida: nerastas AI API raktas.' },
      { status: 500 },
    )
  }

  // 2. Nuskaityti ir patikrinti užklausos kūną
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json(
      { error: 'Netinkamas užklausos formatas. Laukiamas JSON.' },
      { status: 400 },
    )
  }

  if (!isValidAdaptRequest(body)) {
    return Response.json(
      { error: 'Trūksta privalomų laukų arba neleistinos reikšmės: mealName, ingredients, instructions, userRequest, timeMinutes, servings, priority.' },
      { status: 400 },
    )
  }

  if (body.userRequest.trim().length > MAX_USER_REQUEST_LENGTH) {
    return Response.json(
      { error: `Prašymas per ilgas. Maksimalus ilgis: ${MAX_USER_REQUEST_LENGTH} simbolių.` },
      { status: 400 },
    )
  }

  // 3. Sudaryti promptą ir kreiptis į Gemini
  const prompt = buildPrompt(body)
  console.log('--- /api/ai prompt ---\n', prompt, '\n--- end prompt ---')

  try {
    const ai = new GoogleGenAI({ apiKey })
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: prompt,
    })

    return Response.json({ answer: response.text ?? '' })
  } catch (error) {
    console.error('Gemini /api/ai failed:', error)
    const errorInfo = getGeminiErrorMessage(error)

    return Response.json(
      { error: errorInfo.error },
      { status: errorInfo.status },
    )
  }
}
