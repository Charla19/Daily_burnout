import './env.js'

const key = process.env.XAI_API_KEY?.trim()
export const aiReady = Boolean(key?.startsWith('xai-'))

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

async function xaiRequest(path, payload, timeoutMs = 45000) {
  if (!aiReady) throw new Error('Grok is not configured with an xAI key')
  const response = await fetch(`https://api.x.ai/v1/${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(timeoutMs),
  })
  if (!response.ok) {
    const raw = await response.text()
    let detail
    try { detail = JSON.parse(raw) } catch { detail = null }
    throw new Error(`Grok request failed (${response.status}): ${String(detail?.error?.message || detail?.message || raw || 'Unknown API error').slice(0, 240)}`)
  }
  return response.json()
}

async function text(system, prompt, maxOutputTokens = 320) {
  const result = await xaiRequest('responses', {
    model: process.env.XAI_TEXT_MODEL || 'grok-4.7',
    input: [{ role: 'system', content: system }, { role: 'user', content: prompt }],
    max_output_tokens: maxOutputTokens,
    store: false,
  })
  const output = result.output?.flatMap((item) => item.type === 'message' ? item.content || [] : []).filter((item) => item.type === 'output_text').map((item) => item.text).join('\n').trim()
  if (!output) throw new Error('Grok returned no text')
  return output
}

export async function generateSatire(form) {
  const backup = fallbackSatire(form)
  if (!aiReady || !form.aiConsent) return backup
  try {
    const answer = await text(
      'You write Daily Burnout, a fictional workplace satire app. Be sharp, dry, funny, specific and humane. Roast office rituals, never the person. No diagnosis, medical advice, motivational clichés, emojis, long dashes, or corporate jargon. English only. Return only valid JSON with keys title, message, managerNote, oracleLines (array of exactly three short strings).',
      JSON.stringify({ energy: form.energy, focus: form.focus, pressure: form.pressure, ...form.funAnswers, note: form.note.slice(0, 240) }),
      500,
    )
    const parsed = JSON.parse(answer.replace(/^```(?:json)?\s*|\s*```$/g, ''))
    if (typeof parsed.title !== 'string' || typeof parsed.message !== 'string' || typeof parsed.managerNote !== 'string' || !Array.isArray(parsed.oracleLines) || parsed.oracleLines.length < 3) throw new Error('Grok returned incomplete satire')
    return { title: parsed.title.slice(0, 110), message: parsed.message.slice(0, 700), managerNote: parsed.managerNote.slice(0, 700), oracleLines: parsed.oracleLines.slice(0, 3).map((line) => String(line).slice(0, 160)), source: 'grok' }
  } catch (error) {
    console.error('Grok satire fallback:', error.message)
    return backup
  }
}

export async function generateChallenge() {
  if (!aiReady) throw new Error('Grok is not configured with an xAI key')
  const answer = await text('Write one absurd, visual office-themed image challenge for a short break. Sharp and funny, not mean. English only. One sentence, at most 150 characters. No title, quote marks, emojis, or introduction.', 'Invent today’s challenge. Avoid generic coffee mugs and boring meetings.', 100)
  return answer.replace(/^['"\s]+|['"\s]+$/g, '').slice(0, 180)
}

export async function generateImage(prompt) {
  const result = await xaiRequest('images/generations', {
    model: process.env.XAI_IMAGE_MODEL || 'grok-imagine-image-2.0',
    prompt: `Playful editorial illustration for an anti-burnout office break room. Bold flat ink, black, white and vermilion red only. Slightly absurd, expressive, visually clear. No words, letters, logos, gradients or generic AI glow. Scene: ${prompt.slice(0, 500)}`,
    aspect_ratio: '1:1',
    quality: 'low',
    response_format: 'b64_json',
    n: 1,
  }, 90000)
  const encoded = result.data?.[0]?.b64_json
  if (!encoded) throw new Error('Grok returned no image')
  const bytes = Buffer.from(encoded, 'base64')
  if (bytes.length > 7_000_000) throw new Error('Generated image is too large')
  return { bytes, contentType: result.data[0].mime_type || 'image/jpeg' }
}
