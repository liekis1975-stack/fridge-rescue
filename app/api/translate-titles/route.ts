import { GoogleGenAI } from '@google/genai'

export const runtime = 'nodejs'

const MODEL = 'gemini-3.8-flash'
const MAX_TITLES = 50

function parseTitles(text: string): string[] | null {
  const jsonText = text.trim().replace(/^```json\s*/i, '').replace(/\s*```$/, '')
  try {
    const value: unknown = JSON.parse(jsonText)
    if (!Array.isArray(value) || !value.every((title) => typeof title === 'string')) return null
    return value
  } catch {
    return null
  }
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

  const titles = body && typeof body === 'object' && Array.isArray((body as { titles?: unknown }).titles)
    ? (body as { titles: unknown[] }).titles
    : null
  if (!titles || titles.length === 0 || titles.length > MAX_TITLES || !titles.every((title) => typeof title === 'string' && title.trim())) {
    return Response.json({ error: 'Neteisingas receptų pavadinimų sąrašas.' }, { status: 400 })
  }

  const prompt = `Išversk šiuos receptų pavadinimus į taisyklingą, natūralią lietuvių kalbą.
Grąžink tik JSON masyvą su išverstais pavadinimais, be Markdown ir be papildomo teksto.
Išlaikyk tą pačią tvarką ir tiksliai ${titles.length} elementų.
Nepridėk naujų pavadinimų ir nekeisk receptų prasmės.

${titles.map((title, index) => `${index + 1}. ${title}`).join('\n')}`

  try {
    const ai = new GoogleGenAI({ apiKey })
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: prompt,
    })
    const translatedTitles = parseTitles(response.text ?? '')

    if (!translatedTitles || translatedTitles.length !== titles.length || translatedTitles.some((title) => !title.trim())) {
      return Response.json({ error: 'Gemini grąžino netinkamą pavadinimų vertimo formatą.' }, { status: 502 })
    }

    return Response.json({ titles: translatedTitles })
  } catch (error) {
    console.error('Gemini recipe title translation failed:', error)
    return Response.json({ error: 'Vertimo paslauga laikinai nepasiekiama.' }, { status: 502 })
  }
}