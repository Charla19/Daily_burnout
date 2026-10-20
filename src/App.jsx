import { useEffect, useState } from 'react'
import { ArrowRight, Check, Menu, Moon, Sun, X } from 'lucide-react'

async function api(path, options = {}) {
  const response = await fetch(`/api${path}`, { credentials: 'include', headers: { 'Content-Type': 'application/json' }, ...options })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.error || 'Something went wrong. Please try again.')
  return data
}

const date = (value, options = { month: 'long', day: 'numeric' }) => new Intl.DateTimeFormat('en', options).format(new Date(value))
const Brand = () => <span className="brand"><span className="brand-symbol">d<span>.</span></span><span>daily burnout</span></span>

function SignIn({ toggleTheme, error: initialError }) {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(initialError)
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError('')
    try { await api('/auth/request', { method: 'POST', body: JSON.stringify({ email }) }); setSent(true) }
    catch (err) { setError(err.message) }
    finally { setBusy(false) }
  }
  async function verify(event) {
    event.preventDefault(); setBusy(true); setError('')
    try { await api('/auth/verify', { method: 'POST', body: JSON.stringify({ email, code }) }); window.location.reload() }
    catch (err) { setError(err.message) }
    finally { setBusy(false) }
  }
  return <div className="auth-layout"><section className="auth-editorial"><Brand /><div><p className="eyebrow">THE DAILY RESET</p><h1>Work is a lot.<br /><em>You are more.</em></h1><p>Two minutes to check in, call the chaos what it is, and make room for a better day.</p></div><span className="editorial-foot">LESS PERFORMANCE. MORE PERSPECTIVE.</span></section><section className="auth-side"><button className="appearance" onClick={toggleTheme} type="button">Change appearance</button><div className="auth-card"><p className="eyebrow">YOUR SPACE STARTS HERE</p><h2>{sent ? 'Enter your code.' : 'Welcome back.'}</h2><p>{sent ? `We sent a six-digit code to ${email}. It expires in 10 minutes.` : 'Sign in with your email. No password to remember.'}</p>{sent ? <><form onSubmit={verify}><label htmlFor="code">Six-digit code</label><input className="code-input" id="code" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength="6" required value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))} placeholder="000000" /><button className="button button-primary" disabled={busy || code.length !== 6}>{busy ? 'Checking…' : 'Verify and sign in'}<ArrowRight size={18} /></button></form><button className="text-button" onClick={() => { setSent(false); setCode('') }}>Use a different email</button></> : <form onSubmit={submit}><label htmlFor="email">Email address</label><input id="email" type="email" value={email} autoComplete="email" required placeholder="you@example.com" onChange={(event) => setEmail(event.target.value)} /><button className="button button-primary" disabled={busy}>{busy ? 'Sending…' : 'Send sign-in code'}<ArrowRight size={18} /></button></form>}{error && <p className="error" role="alert">{error}</p>}<small>Your answers stay private. Your day stays yours.</small></div><span className="auth-copy">DAILY BURNOUT © {new Date().getFullYear()}</span></section></div>
}

function CheckIn({ onSaved }) {
  const [form, setForm] = useState({ energy: 5, focus: 5, pressure: 5, note: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError('')
    try { const data = await api('/checkins', { method: 'POST', body: JSON.stringify(form) }); onSaved(data.checkin) }
    catch (err) { setError(err.message) }
    finally { setBusy(false) }
  }
  return <form onSubmit={submit} className="checkin"><p className="eyebrow">TODAY'S CHECK-IN</p><h2>How is the day<br /><em>really going?</em></h2><p className="muted">There are no good answers. Just honest ones.</p><div className="scales">{[['energy', 'Running on empty', 'Fully charged'], ['focus', 'All over the place', 'Clear headed'], ['pressure', 'Easy day', 'Too much']].map(([key, low, high]) => <div className="scale" key={key}><div><label htmlFor={key}>{key}</label><strong>{form[key]}/10</strong></div><input id={key} type="range" min="1" max="10" value={form[key]} onChange={(event) => setForm({ ...form, [key]: Number(event.target.value) })} /><div className="range-labels"><span>{low}</span><span>{high}</span></div></div>)}</div><label className="note-label" htmlFor="note">What is taking up space in your head? <span>Optional</span></label><textarea id="note" rows="3" maxLength="500" placeholder="One sentence is enough." value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} />{error && <p role="alert" className="error">{error}</p>}<button className="button button-primary submit" disabled={busy}>{busy ? 'Saving…' : 'See my daily reset'}<ArrowRight size={18} /></button></form>
}

function Today({ today, history, onSaved, goReset }) {
  return <div className="page"><div className="page-heading"><div><p className="eyebrow">{date(new Date(), { weekday: 'long', month: 'long', day: 'numeric' }).toUpperCase()}</p><h1>Take a breath.<br /><em>Start here.</em></h1></div><p>A two-minute ritual for the days that ask too much.</p></div><div className="today-grid"><section className="surface">{today ? <div className="done"><span className="done-icon"><Check size={28} /></span><p className="eyebrow">TODAY IS ON THE RECORD</p><h2>You showed up<br />for yourself.</h2><p>Your check-in is saved. Come back tomorrow for a new page.</p><button className="button button-primary" onClick={goReset}>Read your daily reset<ArrowRight size={18} /></button></div> : <CheckIn onSaved={onSaved} />}</section><aside className="today-aside"><div className="red-panel"><span>01</span><div><p className="eyebrow">NOT A DIAGNOSIS</p><h3>A little honesty goes a long way.</h3><p>This is a reflective space with a sense of humor. Take what helps. Leave what does not.</p></div></div><div className="recent"><h3>Recent check-ins</h3>{history.length ? history.slice(0, 3).map((entry) => <div className="recent-row" key={entry.id}><span>{date(entry.created_at)}</span><strong>{entry.reset_title}</strong></div>) : <p className="muted">Your story starts today.</p>}</div></aside></div></div>
}

function Reset({ today }) {
  return <div className="page"><div className="page-heading"><div><p className="eyebrow">YOUR DAILY RESET</p><h1>A better way<br /><em>through today.</em></h1></div><p>{date(new Date(), { month: 'long', day: 'numeric', year: 'numeric' })}</p></div>{today ? <div className="reset-grid"><article className="reset-note"><span className="eyebrow">A FIELD NOTE FOR TODAY</span><h2>{today.reset_title}</h2><p>{today.reset_message}</p><div className="note-signature">For the person behind the work.</div></article><div className="reset-side"><div className="score-card">{['energy', 'focus', 'pressure'].map((key) => <div key={key}><span>{key}</span><strong>{today[key]}<small>/10</small></strong></div>)}</div>{today.note && <div className="your-words"><span className="eyebrow">IN YOUR WORDS</span><p>“{today.note}”</p></div>}</div></div> : <div className="empty"><h2>Your reset is waiting.</h2><p>Complete today's check-in to see your note.</p></div>}</div>
}

function Archive({ history }) {
  return <div className="page"><div className="page-heading"><div><p className="eyebrow">YOUR HISTORY</p><h1>Every day<br /><em>counts.</em></h1></div><p>A record of showing up, especially on the hard days.</p></div><div className="archive">{history.length ? history.map((entry) => <article key={entry.id}><div className="archive-date"><strong>{date(entry.created_at, { day: '2-digit' })}</strong><span>{date(entry.created_at, { month: 'short', year: 'numeric' })}</span></div><div><h2>{entry.reset_title}</h2><p>{entry.note || entry.reset_message}</p></div><span className="archive-score">{entry.energy}/10 ENERGY</span></article>) : <div className="empty"><h2>Nothing here yet.</h2><p>Your check-ins will appear here.</p></div>}</div></div>
}

function Community({ challenge, entries, refresh }) {
  const [response, setResponse] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function submit(event) { event.preventDefault(); setBusy(true); setError(''); try { await api('/submissions', { method: 'POST', body: JSON.stringify({ response }) }); setResponse(''); await refresh() } catch (err) { setError(err.message) } finally { setBusy(false) } }
  async function react(id) { setError(''); try { await api(`/submissions/${id}/react`, { method: 'POST' }); await refresh() } catch (err) { setError(err.message) } }
  return <div className="page"><div className="page-heading"><div><p className="eyebrow">THE BREAK ROOM</p><h1>Make room for<br /><em>a little absurdity.</em></h1></div><p>One prompt a day. A few good answers. No productivity required.</p></div><div className="community-grid"><section className="prompt-card"><p className="eyebrow">TODAY'S PROMPT</p><h2>{challenge?.prompt || 'The prompt is on its way.'}</h2><form onSubmit={submit}><label htmlFor="answer">Your answer</label><textarea id="answer" value={response} onChange={(event) => setResponse(event.target.value)} required maxLength="400" rows="4" placeholder="Go on. Make it strange." /><button className="button button-dark" disabled={busy || !challenge}>{busy ? 'Posting…' : 'Post your answer'}<ArrowRight size={18} /></button></form></section><section className="responses"><div className="responses-heading"><h2>From the room</h2><span>{entries.length} responses</span></div>{error && <p className="error" role="alert">{error}</p>}{entries.length ? entries.map((entry) => <article key={entry.id} className="response"><div><strong>{entry.author_name}</strong><time>{date(entry.created_at)}</time></div><p>{entry.response}</p><button onClick={() => react(entry.id)} disabled={entry.appreciated_by_me}>{entry.appreciated_by_me ? "Appreciated" : "Appreciate"} <span>+{entry.reaction_count}</span></button></article>) : <p className="muted">Be the first to answer today's prompt.</p>}</section></div></div>
}

const tabs = [['today', 'Today'], ['reset', 'My reset'], ['community', 'Break room'], ['archive', 'Archive']]

export default function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark')
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tab, setTab] = useState('today')
  const [menu, setMenu] = useState(false)
  const [today, setToday] = useState(null)
  const [history, setHistory] = useState([])
  const [challenge, setChallenge] = useState(null)
  const [entries, setEntries] = useState([])
  useEffect(() => { document.documentElement.dataset.theme = theme; localStorage.setItem('theme', theme) }, [theme])
  useEffect(() => { (async () => { try { const data = await api('/me'); setUser(data.user) } catch { setUser(null) } setLoading(false) })() }, [])
  useEffect(() => { if (user) { api('/checkins').then((data) => { setToday(data.today); setHistory(data.history) }).catch((err) => setError(err.message)); refresh() } }, [user])
  async function refresh() { try { const data = await api('/community'); setChallenge(data.challenge); setEntries(data.entries) } catch (err) { setError(err.message) } }
  function saved(checkin) { setToday(checkin); setHistory((previous) => [checkin, ...previous]); setTab('reset') }
  async function logout() { await api('/auth/logout', { method: 'POST' }); setUser(null); setToday(null); setHistory([]) }
  function toggleTheme() { setTheme((current) => current === 'dark' ? 'light' : 'dark') }
  if (loading) return <div className="loading"><Brand /><p>Opening your space…</p></div>
  if (!user) return <SignIn toggleTheme={toggleTheme} error={error} />
  return <div className="app-shell"><aside className={`sidebar ${menu ? 'open' : ''}`}><div className="sidebar-brand"><Brand /><button className="mobile-only" aria-label="Close menu" onClick={() => setMenu(false)}><X size={22} /></button></div><div className="sidebar-main"><p className="nav-heading">YOUR SPACE</p><nav>{tabs.map(([key, label], index) => <button className={tab === key ? 'active' : ''} key={key} onClick={() => { setTab(key); setMenu(false) }}><span>0{index + 1}</span>{label}<ArrowRight size={16} /></button>)}</nav><div className="sidebar-quote"><span>DAILY REMINDER</span><p>You are allowed to be a person before you are useful.</p></div></div><div className="sidebar-footer"><button onClick={toggleTheme}>{theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}{theme === 'dark' ? 'Light mode' : 'Dark mode'}</button><button onClick={logout}>Sign out</button></div></aside>{menu && <button className="scrim" aria-label="Close menu" onClick={() => setMenu(false)} />}<div className="main-area"><header className="topbar"><button className="mobile-only" aria-label="Open menu" onClick={() => setMenu(true)}><Menu size={22} /></button><span className="mobile-brand"><Brand /></span><span className="topbar-title">{tabs.find(([key]) => key === tab)?.[1]}</span><span className="user-id"><span className="user-email">{user.email}</span><span className="avatar">{user.email[0].toUpperCase()}</span></span></header><main>{tab === 'today' && <Today today={today} history={history} onSaved={saved} goReset={() => setTab('reset')} />}{tab === 'reset' && <Reset today={today} />}{tab === 'archive' && <Archive history={history} />}{tab === 'community' && <Community challenge={challenge} entries={entries} refresh={refresh} />}</main><footer className="page-footer"><span>DAILY BURNOUT</span><span>A softer place to land.</span></footer></div><nav className="bottom-nav" aria-label="Mobile navigation">{tabs.map(([key, label]) => <button key={key} className={tab === key ? 'active' : ''} onClick={() => setTab(key)}>{label}</button>)}</nav>{error && <div className="toast" role="alert" onClick={() => setError('')}>{error}<X size={16} /></div>}</div>
}
