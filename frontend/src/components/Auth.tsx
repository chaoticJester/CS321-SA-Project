import { useState } from 'react'
import type { FormEvent } from 'react'
import { login } from '../api'
import type { Employee } from '../api'

type Mode = 'id' | 'email' | 'forgot' | 'signup'
export function Auth({ onSignIn }: { onSignIn: (employee: Employee) => void }) {
  const [mode, setMode] = useState<Mode>('id')
  const [identity, setIdentity] = useState('')
  const [password, setPassword] = useState('')
  const [attempts, setAttempts] = useState(0)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  function changeMode(next: Mode) { setMode(next); setMessage(''); setAttempts(0); setIdentity(''); setPassword('') }
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (mode === 'forgot') { setMessage('Demo: reset request received. No email is sent; use the demo credentials shown below.'); return }
    if (mode === 'signup') { setMessage('Demo: account request received. Use the demo credentials to explore the prototype.'); return }
    if (mode === 'email') { setMessage('The backend currently signs in with employee ID. Choose the Employee ID tab.'); return }
    setAttempts(0); setLoading(true); setMessage('')
    try {
      const session = await login(identity.trim(), password)
      onSignIn(session.employee)
    } catch (error) {
      setAttempts(n => n + 1)
      setMessage(error instanceof Error ? error.message : 'Unable to sign in')
    } finally {
      setLoading(false)
    }
  }
  const special = mode === 'forgot' || mode === 'signup'
  return <main className="auth-layout">
    <aside className="auth-brand">
      <div className="company auth-wordmark"><span className="auth-logo-mark"><img src={`${import.meta.env.BASE_URL}figma/requester-logo-top.svg`} alt="" /><img src={`${import.meta.env.BASE_URL}figma/requester-logo-bottom.svg`} alt="" /></span><strong>SA‑PR</strong></div>
      <div className="brand-title"><h1 lang="th">ระบบอนุมัติ<br />คำสั่งซื้อ</h1><p>PURCHASE REQUISITION<br />APPROVAL SYSTEM</p></div>
    </aside>
    <section className="auth-right" aria-label="Account access">
      <div className={`auth-card ${special ? 'special-card' : ''} ${attempts || loading ? 'state-card' : ''}`}>
        {!attempts && !loading && (special ? <header className="reset-heading"><h2>{mode === 'forgot' ? 'ลืมรหัสผ่าน' : 'ลงทะเบียนขอใช้งาน'}</h2><p>{mode === 'forgot' ? 'RESET YOUR PASSWORD' : 'REQUEST AN ACCOUNT'}</p></header> : <h2 className="auth-title">{mode === 'email' ? 'Sign in with Email address' : 'Sign in to your account'}</h2>)}
        {!special && !attempts && !loading && <div className="identity-tabs" data-mode={mode} aria-label="Sign-in method"><button type="button" aria-pressed={mode === 'id'} onClick={() => changeMode('id')}>รหัสพนักงาน / ID</button><button type="button" aria-pressed={mode === 'email'} onClick={() => changeMode('email')}>อีเมลบริษัท / Email</button></div>}
        {mode === 'forgot' && <p className="auth-intro">กรอกรหัสพนักงานหรืออีเมลบริษัท ระบบจะส่งลิงก์ตั้งรหัสผ่านใหม่ไปยังอีเมลของคุณ<br />We'll email a reset link to your registered address.</p>}
        {mode === 'signup' && <p className="auth-intro">กรอกอีเมลบริษัทเพื่อขอใช้งานระบบ<br />Request access from your procurement administrator.</p>}
        {attempts > 0 && <div className="login-alert" role="alert"><img src={`${import.meta.env.BASE_URL}figma/alert.svg`} alt="" /><div>รหัสพนักงานหรือรหัสผ่านไม่ถูกต้อง<small>Incorrect employee ID or password{attempts < 3 ? ` · ${3 - attempts} attempts left` : ' · Use the demo credentials below to retry'}</small></div></div>}
        <form key={mode} onSubmit={submit} className="auth-form auth-mode-panel">
          <label className="auth-field"><span>{mode === 'forgot' ? 'รหัสพนักงาน หรือ อีเมลบริษัท' : mode === 'email' || mode === 'signup' ? 'อีเมลบริษัท' : 'รหัสพนักงาน'}</span><small>{mode === 'forgot' ? 'EMPLOYEE ID OR EMAIL' : mode === 'email' || mode === 'signup' ? 'COMPANY EMAIL' : 'EMPLOYEE ID'}</small><input aria-label={mode === 'id' ? 'Employee ID' : mode === 'forgot' ? 'Employee ID or email' : 'Company email'} type={mode === 'email' || mode === 'signup' ? 'email' : 'text'} autoComplete="username" placeholder={special ? (mode === 'forgot' ? 'EMP-000000 / name@company.co.th' : 'somchai.k@company.co.th') : undefined} value={identity} onChange={e => setIdentity(e.target.value)} required disabled={loading} /></label>
          {!special && <label className="auth-field"><span>รหัสผ่าน</span><small>PASSWORD</small><input aria-label="Password" type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} required disabled={loading} /></label>}
          {!special && !attempts && !loading && <button className="text-button forgot" type="button" onClick={() => changeMode('forgot')}>ลืมรหัสผ่าน? / Forgot</button>}
          <button className="button primary auth-submit" type="submit" disabled={loading}>{loading ? <><img className="spinner" src={`${import.meta.env.BASE_URL}figma/spinner.svg`} alt="" />กำลังตรวจสอบสิทธิ์…</> : mode === 'forgot' ? 'ส่งลิงก์ตั้งรหัสผ่าน / SEND LINK' : mode === 'signup' ? 'ขอใช้งาน / REQUEST ACCESS' : attempts ? 'ลองอีกครั้ง / TRY AGAIN' : 'เข้าสู่ระบบ / SIGN IN'}</button>
        </form>
        {loading && <div className="login-log" role="status"><p>✓ CREDENTIALS ACCEPTED</p><p>✓ ROLE DETECTED / ตรวจสอบสิทธิ์แล้ว</p><p>… LOADING PURCHASE REQUISITION</p></div>}
        {message && <p className="auth-message" role="alert">{message}</p>}
        {special && <button className="text-button return-login" onClick={() => changeMode('id')}>ย้อนกลับไปหน้าเข้าสู่ระบบ</button>}
        {!special && !attempts && !loading && <><div className="no-account"><span>ยังไม่มีบัญชี?</span></div><button className="button signup" onClick={() => changeMode('signup')}>ลงทะเบียนขอใช้งาน / SIGN UP</button></>}
      </div>
      <details className="demo-help"><summary>Seeded accounts</summary><p>Requester: <strong>E0020</strong><br />Approver: <strong>E0018</strong> – <strong>E0002</strong><br />Passcode: <strong>123456</strong></p><p>Accounts are authenticated by the backend database.</p></details>
    </section>
  </main>
}
