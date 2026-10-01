import { GoogleGenAI } from '@google/genai'

export const runtime = 'nodejs'

const model = 'gemini-3.8-flash'
const prompt = 'Parašyk vieną sakinį apie picą.'

export async function GET() {
  const apiKey = process.env.GEMINI_API_KEY

  if (!apiKey) {
    return Response.json(
      { error: 'GEMINI_API_KEY nerastas. Patikrinkite .env.local failą.' },
      { status: 500 },
    )
  }

  try {
    const ai = new GoogleGenAI({ apiKey })
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
    })

    return Response.json({
      model,
      prompt,
      answer: response.text ?? '',
    })
  } catch (error) {
    console.error('Gemini test failed:', error)

    return Response.json(
      {
        error: 'Gemini užklausa nepavyko. Patikrinkite API raktą, .env.local ir modelio pavadinimą.',
        model,
      },
      { status: 502 },
    )
  }
}
