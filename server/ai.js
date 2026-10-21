import './env.js'

const accountId = process.env.CLOUDFLARE_ACCOUNT_ID?.trim()
const token = process.env.CLOUDFLARE_API_TOKEN?.trim()
export const aiReady = Boolean(accountId && token)

const fallback = [
  {
    title: 'Your inbox can wait in line.',
    message: 'The unread count is not a personality test. Shut one tab, drink some water, and let a non-urgent task enjoy being non-urgent.',
    managerNote: 'Dear valued human, after careful review, the committee has decided your brain is not a shared printer. Please stop feeding it everyone else’s emergencies.',
    oracleLines: ['Your calendar is not your legal guardian.', 'One less tab is a valid strategic plan.', 'A break is not a software bug.'],
  },
  {
    title: 'The spreadsheet will survive.',
    message: 'It has rows. It has columns. It has no feelings. You, inconveniently for the spreadsheet, do. Take a real pause.',
    managerNote: 'Your manager regrets to inform you that the phrase “quick call” has exceeded its annual quota. Please close your laptop for a moment.',
    oracleLines: ['The meeting could have been an email. The email could have been silence.', 'You owe no one a heroic reply time.', 'Go look at a thing that is not a screen.'],
  },
  {
    title: 'Out of office, in spirit.',
    message: 'You can care about your work and still refuse to become its emergency power supply. Step away before the cursor starts judging you.',
    managerNote: 'Following an extensive performance review of your chair, we recommend that its occupant stand up, stretch, and stop negotiating with a notification badge.',
    oracleLines: ['Your chair has seen enough.', 'Rest is allowed before the dramatic finale.', 'The only urgent thing here is a glass of water.'],
  },
]

export function fallbackSatire(form) {
  const pick = form.pressure >= 8 || form.energy <= 3 ? 1 : form.energy >= 7 ? 2 : 0
  return { ...fallback[pick], source: 'curated' }
}

async function workersAiRequest(model, payload, timeoutMs = 45000) {
  if (!aiReady) throw new Error('Cloudflare Workers AI is not configured')
  const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}/ai/run/${model}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(timeoutMs),
  })
  const data = await response.json().catch(() => null)
  if (!response.ok || !data?.success) {
    const detail = data?.errors?.[0]?.message || data?.error || `HTTP ${response.status}`
    const error = new Error(`Cloudflare Workers AI failed: ${String(detail).slice(0, 240)}`)
    error.aiProvider = true
    throw error
  }
  return data.result
}

async function text(system, prompt, maxOutputTokens = 320, schema = null) {
  const result = await workersAiRequest(process.env.CLOUDFLARE_TEXT_MODEL || '@cf/meta/llama-3.3-70b-instruct-fp8-fast', {
    messages: [{ role: 'system', content: system }, { role: 'user', content: prompt }],
    max_tokens: maxOutputTokens,
    temperature: 0.75,
    ...(schema ? { response_format: { type: 'json_schema', json_schema: schema } } : {}),
  })
  const raw = result?.response ?? result?.choices?.[0]?.message?.content
  const output = (typeof raw === 'string' ? raw : raw && typeof raw === 'object' ? JSON.stringify(raw) : '').trim()
  if (!output) throw new Error('Cloudflare returned no text')
  return output
}

export async function generateSatire(form) {
  const backup = fallbackSatire(form)
  if (!aiReady || !form.aiConsent) return backup
  try {
    const answer = await text(
      'You write Daily Burnout, a fictional workplace satire app for people taking a five-minute break. Your humor is dry, rude about office systems, and kind to the exhausted person. Use concrete absurd images and short punchlines. Example tone: "The calendar has eaten Thursday. Do not negotiate with it." Never mock coworkers or imply access to their private lives. Never give medical advice. Ban generic phrases such as meeting madness, Monday blues, boost morale, productivity, toxic, self-care, and you got this. No emojis, long dashes, hashtags, or corporate jargon. English only. Return only valid JSON with keys title (4 to 8 words), message (two short sentences, including one small real break action), managerNote (one fictional management memo joke), oracleLines (array of exactly three distinct short jokes).',
      JSON.stringify({ energy: form.energy, focus: form.focus, pressure: form.pressure, ...form.funAnswers, note: form.note.slice(0, 240) }),
      650,
      { type: 'object', properties: { title: { type: 'string' }, message: { type: 'string' }, managerNote: { type: 'string' }, oracleLines: { type: 'array', items: { type: 'string' }, minItems: 3, maxItems: 3 } }, required: ['title', 'message', 'managerNote', 'oracleLines'] },
    )
    const parsed = JSON.parse(answer.replace(/^```(?:json)?\s*|\s*```$/g, ''))
    if (typeof parsed.title !== 'string' || typeof parsed.message !== 'string' || typeof parsed.managerNote !== 'string' || !Array.isArray(parsed.oracleLines) || parsed.oracleLines.length < 3) throw new Error('Cloudflare returned incomplete satire')
    return { title: parsed.title.slice(0, 110), message: parsed.message.slice(0, 700), managerNote: parsed.managerNote.slice(0, 700), oracleLines: parsed.oracleLines.slice(0, 3).map((line) => String(line).slice(0, 160)), source: 'cloudflare' }
  } catch (error) {
    console.error('Workers AI satire fallback:', error.message)
    return backup
  }
}

export async function generateChallenge() {
  if (!aiReady) throw new Error('Cloudflare Workers AI is not configured')
  const answer = await text('Write one absurd visual office-themed image challenge for a short break. It must feature inanimate office objects behaving badly. Roast office systems, never real employees. No coworker names, private information, surveillance, or embarrassment. English only. One sentence, at most 150 characters. No title, quote marks, emojis, or introduction.', 'Invent today’s challenge. Avoid generic coffee mugs and boring meetings. Example tone: A stapler declares itself interim CEO and demands a smaller desk.', 100)
  return answer.replace(/^['"\s]+|['"\s]+$/g, '').slice(0, 180)
}

export async function generateImage(prompt) {
  const result = await workersAiRequest(process.env.CLOUDFLARE_IMAGE_MODEL || '@cf/black-forest-labs/flux-1-schnell', {
    prompt: `Playful editorial illustration for an anti-burnout office break room. Bold flat ink, black, white and vermilion red only. Slightly absurd, expressive, visually clear. No words, letters, logos, gradients or generic AI glow. Scene: ${prompt.slice(0, 500)}`,
    steps: 4,
  }, 90000)
  const encoded = result?.image
  if (!encoded) throw new Error('Cloudflare returned no image')
  const bytes = Buffer.from(encoded, 'base64')
  if (bytes.length > 7_000_000) throw new Error('Generated image is too large')
  return { bytes, contentType: 'image/jpeg' }
}
