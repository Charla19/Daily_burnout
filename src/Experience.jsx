import { useEffect, useRef, useState } from 'react'
import { ArrowRight, ArrowUpRight, Check, Clock3, Heart, Image as ImageIcon, LogOut, Mail, Moon, Pause, Play, RotateCcw, Send, Sun, X } from 'lucide-react'
import './experience.css'

async function api(path, options = {}) {
  const response = await fetch(`/api${path}`, { credentials: 'include', headers: { 'Content-Type': 'application/json' }, ...options })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.error || 'That went sideways. Try again.')
  return data
}

const formatDate = (value, options = { month: 'short', day: 'numeric' }) => new Intl.DateTimeFormat('en', options).format(new Date(value))
const nav = [['today', 'The crash lab'], ['community', 'Break room'], ['escape', 'Escape hatch'], ['archive', 'Receipts']]

function Brand() {
  return <span className="db-brand"><span className="db-brand-mark">d<span>.</span></span><span>daily<br />burnout</span></span>
}

function Creature({ mood = 'fine', small = false }) {
  return <div className={`creature creature-${mood} ${small ? 'creature-small' : ''}`} aria-hidden="true"><span className="creature-eye creature-eye-left" /><span className="creature-eye creature-eye-right" /><span className="creature-mouth" /><span className="creature-blush creature-blush-left" /><span className="creature-blush creature-blush-right" /></div>
}

function Ticker() {
  return <div className="ticker" aria-hidden="true"><div className="ticker-track">{Array.from({ length: 4 }, (_, index) => <span key={index}>YOUR INBOX IS NOT YOUR BOSS <b>✳</b> TAKE FIVE BEFORE YOU BECOME A SPREADSHEET <b>✳</b> </span>)}</div></div>
}

function SignIn({ theme, toggleTheme }) {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function request(event) {
    event.preventDefault(); setBusy(true); setError('')
    try { await api('/auth/request', { method: 'POST', body: JSON.stringify({ email }) }); setSent(true) }
    catch (reason) { setError(reason.message) }
    finally { setBusy(false) }
  }
  async function verify(event) {
    event.preventDefault(); setBusy(true); setError('')
    try { await api('/auth/verify', { method: 'POST', body: JSON.stringify({ email, code }) }); window.location.reload() }
    catch (reason) { setError(reason.message) }
    finally { setBusy(false) }
  }
  return <div className="entry-page"><header className="entry-top"><Brand /><button className="icon-action" type="button" onClick={toggleTheme} aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>{theme === 'dark' ? <Sun /> : <Moon />}</button></header><main className="entry-main"><div className="entry-copy"><span className="eyebrow">THE UNOFFICIAL OFFICE EXIT</span><h1>Clock out.<br /><i>Mentally.</i></h1><p>For when “just one more thing” has become the entire job description.</p><div className="entry-creature"><Creature /><span className="handnote">I, too,<br />have tabs open.</span></div></div><section className="entry-form"><div className="entry-stamp">NO KPI<br />ZONE</div><span className="eyebrow">YOUR SECRET SIDE DOOR</span><h2>{sent ? 'Check your inbox.' : 'Come on in.'}</h2><p>{sent ? `A six-digit code is on its way to ${email}. It expires in 10 minutes.` : 'No password. No motivational poster. Just a tiny escape.'}</p>{sent ? <form onSubmit={verify}><label htmlFor="sign-code">Six-digit code</label><input id="sign-code" className="code-field" value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))} inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength="6" placeholder="000000" required /><button className="main-button" disabled={busy || code.length !== 6}>{busy ? 'Checking...' : 'Let me in'}<ArrowRight size={20} /></button><button className="plain-action" type="button" onClick={() => { setSent(false); setCode('') }}>Wrong email? Start again.</button></form> : <form onSubmit={request}><label htmlFor="sign-email">Email address</label><input id="sign-email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@somewhere.com" required /><button className="main-button" disabled={busy}>{busy ? 'Sending...' : 'Send me a code'}<ArrowRight size={20} /></button></form>}{error && <p className="inline-error" role="alert">{error}</p>}<small>Your check-ins are private. The jokes are public only when you post them.</small></section></main><Ticker /><footer className="entry-footer">WORK IS A JOKE. YOUR EXHAUSTION ISN'T.</footer></div>
}

function RangeField({ label, low, high, value, onChange }) {
  return <div className="range-field"><div className="range-head"><label htmlFor={label}>{label}</label><strong>{value}<small>/10</small></strong></div><input id={label} type="range" min="1" max="10" value={value} onChange={(event) => onChange(Number(event.target.value))} /><div className="range-captions"><span>{low}</span><span>{high}</span></div></div>
}

function CheckIn({ aiAvailable, onSaved }) {
  const [form, setForm] = useState({ energy: 5, focus: 5, pressure: 5, note: '', funAnswers: { fibs: 0, pcUrge: 5, deskJudge: '', variable: '', sigh: '' }, aiConsent: false })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }))
  const updateFun = (key, value) => setForm((current) => ({ ...current, funAnswers: { ...current.funAnswers, [key]: value } }))
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError('')
    try { const data = await api('/checkins', { method: 'POST', body: JSON.stringify(form) }); onSaved(data.checkin) }
    catch (reason) { setError(reason.message) }
    finally { setBusy(false) }
  }
  return <form className="checkin-form" onSubmit={submit}><div className="form-head"><span className="eyebrow">01 / THE HONEST BIT</span><span className="form-mark">CLASSIFIED<br />OFFICE NONSENSE</span></div><h2>How cooked<br />are we?</h2><p>Three numbers. Zero pretending everything is “fine.”</p><div className="range-grid"><RangeField label="Energy" low="Battery warning" high="Suspiciously awake" value={form.energy} onChange={(value) => update('energy', value)} /><RangeField label="Focus" low="17 tabs, no thoughts" high="Laser-ish" value={form.focus} onChange={(value) => update('focus', value)} /><RangeField label="Pressure" low="Almost human" high="Laptop out the window" value={form.pressure} onChange={(value) => update('pressure', value)} /></div><div className="form-divider"><span>OPTIONAL OFFICE EVIDENCE</span></div><div className="fun-fields"><RangeField label="Laptop launch urge" low="Still on desk" high="Window looks tempting" value={form.funAnswers.pcUrge} onChange={(value) => updateFun('pcUrge', value)} /><label>How many fake “I'm fine”s today?<input type="number" min="0" max="99" value={form.funAnswers.fibs} onChange={(event) => updateFun('fibs', event.target.value)} /></label><label>Which desk object is judging you?<input maxLength="80" value={form.funAnswers.deskJudge} onChange={(event) => updateFun('deskJudge', event.target.value)} placeholder="The printer knows." /></label><label>If you were a variable right now<select value={form.funAnswers.variable} onChange={(event) => updateFun('variable', event.target.value)}><option value="">Choose your bug</option><option value="null">null, emotionally unavailable</option><option value="404">404, brain not found</option><option value="NaN">NaN, don't ask</option><option value="undefined">undefined, fair enough</option><option value="true">true, but only in denial</option></select></label><label>Describe your most dramatic work sigh<input maxLength="240" value={form.funAnswers.sigh} onChange={(event) => updateFun('sigh', event.target.value)} placeholder="The one heard three desks over." /></label></div><label className="note-label" htmlFor="note">Anything actually on your mind? <span>Private</span></label><textarea id="note" rows="3" maxLength="500" value={form.note} onChange={(event) => update('note', event.target.value)} placeholder="No need to make it sound professional." />{aiAvailable && <label className="consent-line"><input type="checkbox" checked={form.aiConsent} onChange={(event) => update('aiConsent', event.target.checked)} /><span>Let Grok write my satirical report. My answers go to xAI; my email does not.</span></label>}{error && <p className="inline-error" role="alert">{error}</p>}<button className="main-button" disabled={busy}>{busy ? 'Consulting the office void...' : 'Predict my extremely fake crash'}<ArrowRight size={20} /></button><p className="form-fineprint">Satire, not a diagnosis. Your data stays in your private history.</p></form>
}

function Report({ today, onMail, mailBusy, mailError, onEscape }) {
  const [oracleOpen, setOracleOpen] = useState(false)
  const time = today.predicted_at ? formatDate(today.predicted_at, { hour: '2-digit', minute: '2-digit' }) : 'eventually'
  const lines = today.oracle_lines?.length ? today.oracle_lines : ['The meeting could have been silence.', 'Walk away from the glowing rectangle.', 'You may ignore one notification. As a treat.']
  return <div className="report-stack"><section className="forecast"><span className="eyebrow">YOUR COMPLETELY UNLICENSED FORECAST</span><div className="forecast-middle"><div><p>Estimated time your soul exits the spreadsheet</p><strong>{time}</strong></div><span className="forecast-stamp">PROBABLY<br />NOT SCIENCE</span></div><p className="forecast-fine">No actual predictions were harmed in the making of this joke.</p></section><article className="field-note"><span className="eyebrow">THE DAILY RECEIPT / {today.reset_source === 'grok' ? 'GROK EDITION' : 'HANDWRITTEN EDITION'}</span><h2>{today.reset_title}</h2><p>{today.reset_message}</p><div className="field-note-scratch" aria-hidden="true" /></article><div className="report-actions"><button className="outline-button" onClick={() => setOracleOpen((open) => !open)}>{oracleOpen ? 'Hide the oracle' : 'Consult the oracle'}<ArrowUpRight size={19} /></button><button className="outline-button" onClick={onEscape}>Emergency escape hatch<ArrowUpRight size={19} /></button></div>{oracleOpen && <section className="oracle-note"><span className="eyebrow">THE ORACLE OF DOING LESS</span><h3>Three commandments from the office void.</h3><ol>{lines.map((line, index) => <li key={index}>{line}</li>)}</ol></section>}<section className="manager-memo"><div><span className="eyebrow">FICTIONAL MANAGEMENT MEMO</span><h3>Even your imaginary boss has had enough.</h3><p>“{today.manager_note || today.reset_message}”</p></div><button className="memo-button" onClick={onMail} disabled={mailBusy || Boolean(today.email_sent_at)}>{today.email_sent_at ? <Check size={18} /> : <Mail size={18} />}{today.email_sent_at ? 'Sent to your inbox' : mailBusy ? 'Sending...' : 'Email me this nonsense'}</button>{mailError && <p className="inline-error" role="alert">{mailError}</p>}</section></div>
}

function Today({ today, aiAvailable, onSaved, onMail, mailBusy, mailError, onEscape }) {
  return <div className="screen today-screen"><div className="hero"><div className="hero-words"><span className="eyebrow">WELCOME TO YOUR 5-MINUTE MUTINY</span><h1>OFF DUTY.<br /><i>FOR A MINUTE.</i></h1><p>You survived another meeting that could have been a sentence. Now let's check the damage.</p><span className="hero-scribble">Scroll. Breathe. Mock the calendar.</span></div><div className="hero-art"><span className="orbit orbit-one" /><span className="orbit orbit-two" /><Creature mood={today ? 'relieved' : 'fine'} /><span className="orbit-note">STATUS:<br />STILL HUMAN</span></div></div><Ticker />{today ? <div className="today-content"><div className="section-intro"><span className="eyebrow">REPORT ISSUED</span><h2>You already filed<br />today's complaint.</h2><p>Here is the official unofficial result.</p></div><Report today={today} onMail={onMail} mailBusy={mailBusy} mailError={mailError} onEscape={onEscape} /></div> : <div className="today-content"><div className="section-intro"><span className="eyebrow">NO PERFORMANCE REVIEW HERE</span><h2>Tell the truth.<br />The printer won't.</h2><p>A tiny check-in with an unreasonable amount of personality.</p></div><CheckIn aiAvailable={aiAvailable} onSaved={onSaved} /></div>}</div>
}

function Community({ user, challenge, entries, artAvailable, refresh }) {
  const [answer, setAnswer] = useState('')
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const ownPost = entries.some((entry) => String(entry.user_id) === String(user.id))
  async function post(kind) {
    setBusy(kind); setError('')
    try {
      if (kind === 'art') await api('/challenge/image', { method: 'POST', body: JSON.stringify({ prompt: answer }) })
      else await api('/submissions', { method: 'POST', body: JSON.stringify({ response: answer }) })
      setAnswer(''); await refresh()
    } catch (reason) { setError(reason.message) }
    finally { setBusy('') }
  }
  async function appreciate(id) {
    setError('')
    try { await api(`/submissions/${id}/react`, { method: 'POST' }); await refresh() }
    catch (reason) { setError(reason.message) }
  }
  return <div className="screen community-screen"><div className="community-hero"><span className="eyebrow">THE BREAK ROOM / NO BAD IDEAS, JUST WEIRD ONES</span><h1>Corporate nonsense.<br /><i>Community edition.</i></h1><p>One prompt. One post a day. A suspiciously good reason to stop staring at your inbox.</p><div className="floating-asterisk" aria-hidden="true">✳</div></div><div className="community-layout"><section className="challenge-poster"><span className="poster-pin" aria-hidden="true" /><span className="eyebrow">TODAY'S ABSURD ASSIGNMENT</span><h2>{challenge?.prompt || 'The office void is thinking...'}</h2>{challenge?.image_url && <img src={challenge.image_url} alt="Illustration of today's absurd challenge" loading="lazy" />}<div className="poster-foot"><span>{challenge?.source === 'grok' ? 'INVENTED BY GROK' : 'CURATED CHAOS'}</span><span>{formatDate(new Date())}</span></div></section><section className="post-zone"><span className="eyebrow">ADD TO THE WALL</span><h2>Make it weird.</h2>{ownPost ? <p className="posted-state"><Check size={20} /> Your daily masterpiece is on the wall. Come back tomorrow.</p> : <><label htmlFor="answer">Your answer or image idea</label><textarea id="answer" rows="5" maxLength="400" value={answer} onChange={(event) => setAnswer(event.target.value)} placeholder="A photocopier takes over as interim CEO..." /><div className="post-buttons"><button className="main-button" disabled={Boolean(busy) || answer.trim().length < 2} onClick={() => post('text')}>{busy === 'text' ? 'Posting...' : 'Post words'}<Send size={18} /></button><button className="outline-button" disabled={Boolean(busy) || !artAvailable || answer.trim().length < 8} onClick={() => post('art')}>{busy === 'art' ? 'Making art...' : 'Make an image'}<ImageIcon size={18} /></button></div><small>{artAvailable ? 'Grok turns your idea into one image. One post per day, words or art.' : 'AI art will open when the Grok key is connected. Words work now.'}</small></>}{error && <p className="inline-error" role="alert">{error}</p>}</section></div><div className="wall-heading"><div><span className="eyebrow">PUBLIC OFFICE EVIDENCE</span><h2>The wall of weird.</h2></div><span>{entries.length} POST{entries.length === 1 ? '' : 'S'}</span></div><div className="post-wall">{entries.length ? entries.map((entry, index) => <article className="wall-post" key={entry.id} style={{ '--tilt': `${index % 2 ? 1.1 : -1.1}deg` }}><div className="post-meta"><span>{entry.author_name}</span><time>{formatDate(entry.created_at, { hour: '2-digit', minute: '2-digit' })}</time></div>{entry.image_url && <img src={entry.image_url} alt={`Generated illustration: ${entry.response}`} loading="lazy" />}<p>{entry.response}</p><button onClick={() => appreciate(entry.id)} disabled={entry.appreciated_by_me} aria-label={`${entry.appreciated_by_me ? 'Appreciated' : 'Appreciate'} ${entry.author_name}'s post`}><Heart size={19} fill={entry.appreciated_by_me ? 'currentColor' : 'none'} />{entry.appreciated_by_me ? 'APPRECIATED' : 'APPRECIATE'} <strong>{entry.reaction_count}</strong></button></article>) : <div className="empty-wall"><Creature small /><p>Be the first person brave enough to post office nonsense today.</p></div>}</div></div>
}

function Escape() {
  const [remaining, setRemaining] = useState(120)
  const [running, setRunning] = useState(false)
  const deadline = useRef(0)
  useEffect(() => {
    if (!running) return undefined
    const interval = setInterval(() => { const next = Math.max(0, Math.ceil((deadline.current - Date.now()) / 1000)); setRemaining(next); if (next === 0) setRunning(false) }, 250)
    return () => clearInterval(interval)
  }, [running])
  const start = () => { deadline.current = Date.now() + remaining * 1000; setRunning(true) }
  const pause = () => { setRemaining(Math.max(0, Math.ceil((deadline.current - Date.now()) / 1000))); setRunning(false) }
  const reset = () => { setRunning(false); setRemaining(120) }
  const display = `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, '0')}`
  return <div className="screen escape-screen"><div className="escape-copy"><span className="eyebrow">THE ESCAPE HATCH / TWO MINUTES ARE YOURS</span><h1>The work can<br /><i>wait two minutes.</i></h1><p>No productivity trick hiding in here. Just a timer, a strange little creature, and permission to stop.</p></div><div className={`escape-stage ${running ? 'is-running' : ''}`}><span className="stage-ring stage-ring-one" /><span className="stage-ring stage-ring-two" /><Creature mood="relieved" /><span className="stage-note note-one">INHALE.<br />THE SPREADSHEET<br />CAN'T FOLLOW.</span><span className="stage-note note-two">EXHALE.<br />YOUR CHAIR<br />UNDERSTANDS.</span></div><div className="escape-controls"><span className="eyebrow">TWO-MINUTE DESK THEATER</span><strong className="timer" aria-live="off">{display}</strong><div><button className="main-button" onClick={running ? pause : start} disabled={remaining === 0}>{running ? <Pause size={20} /> : <Play size={20} />}{running ? 'Pause the pause' : remaining === 120 ? 'Take my break' : 'Keep going'}</button><button className="icon-action" onClick={reset} aria-label="Reset timer"><RotateCcw size={21} /></button></div><p>{remaining === 0 ? 'Look at that. The company survived.' : 'No streak. No score. No one gets a notification.'}</p></div></div>
}

function Archive({ history }) {
  return <div className="screen archive-screen"><div className="archive-hero"><span className="eyebrow">THE RECEIPTS</span><h1>Proof you were<br /><i>here. Again.</i></h1><p>Your private archive of days you survived. Your employer does not get a copy.</p></div><div className="archive-list">{history.length ? history.map((item, index) => <article key={item.id} className="archive-item"><span className="archive-number">{String(index + 1).padStart(2, '0')}</span><div><time>{formatDate(item.created_at, { weekday: 'short', month: 'long', day: 'numeric' })}</time><h2>{item.reset_title}</h2><p>{item.note || item.reset_message}</p></div><span className="archive-energy">{item.energy}/10<br /><small>BATTERY</small></span></article>) : <div className="archive-empty"><Creature small /><h2>No receipts yet.</h2><p>Check in once, and your little paper trail begins.</p></div>}</div></div>
}

export default function Experience() {
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark')
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('today')
  const [today, setToday] = useState(null)
  const [history, setHistory] = useState([])
  const [challenge, setChallenge] = useState(null)
  const [entries, setEntries] = useState([])
  const [aiAvailable, setAiAvailable] = useState(false)
  const [artAvailable, setArtAvailable] = useState(false)
  const [mailBusy, setMailBusy] = useState(false)
  const [mailError, setMailError] = useState('')
  const [toast, setToast] = useState('')
  useEffect(() => { document.documentElement.dataset.theme = theme; localStorage.setItem('theme', theme) }, [theme])
  useEffect(() => { Promise.allSettled([api('/me'), api('/health')]).then(([account, health]) => { if (account.status === 'fulfilled') setUser(account.value.user); if (health.status === 'fulfilled') setAiAvailable(Boolean(health.value.ai)); setLoading(false) }) }, [])
  useEffect(() => { if (!user) return; api('/checkins').then((data) => { setToday(data.today); setHistory(data.history) }).catch((error) => setToast(error.message)); refresh() }, [user])
  async function refresh() { try { const data = await api('/community'); setChallenge(data.challenge); setEntries(data.entries); setArtAvailable(Boolean(data.artAvailable)) } catch (error) { setToast(error.message) } }
  function saved(checkin) { setToday(checkin); setHistory((items) => [checkin, ...items]) }
  async function sendMemo() { setMailBusy(true); setMailError(''); try { await api('/mail', { method: 'POST' }); setToday((item) => ({ ...item, email_sent_at: new Date().toISOString() })); setToast('Fictional management has entered your inbox.') } catch (error) { setMailError(error.message) } finally { setMailBusy(false) } }
  async function logout() { try { await api('/auth/logout', { method: 'POST' }); setUser(null); setToday(null); setHistory([]) } catch (error) { setToast(error.message) } }
  const toggleTheme = () => setTheme((current) => current === 'dark' ? 'light' : 'dark')
  if (loading) return <div className="boot-screen"><Creature small /><span>ESCAPING THE INBOX...</span></div>
  if (!user) return <SignIn theme={theme} toggleTheme={toggleTheme} />
  return <div className="db-app"><header className="app-header"><button className="brand-button" onClick={() => setTab('today')} aria-label="Daily Burnout home"><Brand /></button><nav className="desktop-nav" aria-label="Main navigation">{nav.map(([key, label]) => <button key={key} className={tab === key ? 'active' : ''} onClick={() => setTab(key)}>{label}</button>)}</nav><div className="header-actions"><button className="icon-action" onClick={toggleTheme} aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>{theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}</button><span className="user-avatar" title={user.email}>{user.email[0].toUpperCase()}</span><button className="icon-action signout" onClick={logout} aria-label="Sign out"><LogOut size={20} /></button></div></header><main className="app-main">{tab === 'today' && <Today today={today} aiAvailable={aiAvailable} onSaved={saved} onMail={sendMemo} mailBusy={mailBusy} mailError={mailError} onEscape={() => setTab('escape')} />}{tab === 'community' && <Community user={user} challenge={challenge} entries={entries} artAvailable={artAvailable} refresh={refresh} />}{tab === 'escape' && <Escape />}{tab === 'archive' && <Archive history={history} />}</main><footer className="app-footer"><span>DAILY BURNOUT © {new Date().getFullYear()}</span><span>MADE FOR HUMANS WITH TOO MANY TABS OPEN.</span></footer><nav className="mobile-nav" aria-label="Mobile navigation">{nav.map(([key, label]) => <button key={key} className={tab === key ? 'active' : ''} onClick={() => setTab(key)}>{label}</button>)}</nav>{toast && <div className="toast" role="status"><span>{toast}</span><button onClick={() => setToast('')} aria-label="Dismiss message"><X size={18} /></button></div>}</div>
}
