let audioContext
let ambienceTimer
let activeNodes = new Set()
let sequence = 0

function context() {
  if (!audioContext) audioContext = new (window.AudioContext || window.webkitAudioContext)()
  if (audioContext.state === 'suspended') audioContext.resume()
  return audioContext
}

function tone(frequency, duration, volume, type = 'sine', delay = 0) {
  const ctx = context()
  const oscillator = ctx.createOscillator()
  const gain = ctx.createGain()
  const start = ctx.currentTime + delay
  oscillator.type = type
  oscillator.frequency.setValueAtTime(frequency, start)
  gain.gain.setValueAtTime(0.0001, start)
  gain.gain.exponentialRampToValueAtTime(volume, start + Math.min(0.45, duration / 3))
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration)
  oscillator.connect(gain).connect(ctx.destination)
  oscillator.start(start)
  oscillator.stop(start + duration + 0.02)
  activeNodes.add(oscillator)
  oscillator.onended = () => activeNodes.delete(oscillator)
}

export function playComicSound(kind = 'boop') {
  if (kind === 'nope') {
    tone(310, 0.2, 0.055, 'triangle')
    tone(210, 0.3, 0.05, 'triangle', 0.12)
  } else if (kind === 'win') {
    tone(392, 0.25, 0.045, 'sine')
    tone(523, 0.25, 0.045, 'sine', 0.16)
    tone(659, 0.42, 0.05, 'sine', 0.32)
  } else {
    tone(440, 0.18, 0.045, 'sine')
    tone(660, 0.3, 0.035, 'sine', 0.11)
  }
}

export function startAmbience() {
  stopAmbience()
  const chords = [[174.61, 220, 261.63], [164.81, 196, 261.63], [146.83, 220, 293.66], [174.61, 220, 261.63]]
  function playChord() {
    const notes = chords[sequence % chords.length]
    notes.forEach((note, index) => tone(note, 7.8, index === 0 ? 0.018 : 0.012, 'sine', index * 0.35))
    tone(notes[2] * 2, 2.2, 0.011, 'sine', 2.1)
    sequence += 1
  }
  playChord()
  ambienceTimer = window.setInterval(playChord, 8000)
}

export function stopAmbience() {
  if (ambienceTimer) window.clearInterval(ambienceTimer)
  ambienceTimer = undefined
  for (const node of activeNodes) {
    try { node.stop() } catch { /* Already stopped. */ }
  }
  activeNodes = new Set()
}
