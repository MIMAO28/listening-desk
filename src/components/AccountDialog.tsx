import { useEffect, useRef, useState } from 'react'
import { accountClient, accountError } from '../lib/account.ts'
import { Icon } from './Icon.tsx'

export function AccountDialog({ onClose, recovery = false, onRecovered }: { onClose: () => void; recovery?: boolean; onRecovered: () => void }) {
  const [mode, setMode] = useState<'login' | 'signup' | 'reset' | 'password' | 'verify' | 'verify-reset'>(recovery ? 'password' : 'login')
  const [email, setEmail] = useState(''), [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false), [message, setMessage] = useState(''), [error, setError] = useState('')
  const [code, setCode] = useState(''), [cooldown, setCooldown] = useState(0)
  const dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => { const node = dialog.current!; node.showModal(); return () => node.close() }, [])
  const verifying = mode === 'verify' || mode === 'verify-reset'
  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setTimeout(() => setCooldown(value => Math.max(0, value - 1)), 1000)
    return () => clearTimeout(timer)
  }, [cooldown])
  const changeMode = (next: typeof mode) => { setMode(next); setError(''); setMessage(''); setPassword(''); setCode('') }
  const resend = async () => {
    if (busy || cooldown > 0) return
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setError('请填写有效邮箱地址。'); return }
    setBusy(true); setError('')
    try {
      const client = await accountClient()
      const { error } = mode === 'verify-reset' ? await client.auth.resetPasswordForEmail(email.trim())
        : await client.auth.resend({ type: 'signup', email: email.trim() })
      if (error) throw error
      setCooldown(60); setMessage('已请求重新发送，请使用最新邮件中的验证码，并检查垃圾邮件。')
    } catch (error) { setError(accountError(error)) }
    finally { setBusy(false) }
  }
  const submit = async (event: React.SubmitEvent<HTMLFormElement>) => {
    event.preventDefault(); setBusy(true); setError(''); setMessage('')
    try {
      const client = await accountClient()
      const redirect = `${location.origin}${location.pathname}`
      if (mode === 'login') {
        const { error } = await client.auth.signInWithPassword({ email: email.trim(), password })
        if (error) throw error
        onClose()
      } else if (mode === 'signup') {
        const { data, error } = await client.auth.signUp({ email: email.trim(), password, options: { emailRedirectTo: redirect } })
        if (error) throw error
        if (data.session) onClose()
        else { setMode('verify'); setPassword(''); setCooldown(60); setMessage('请从邮件中复制验证码，在下方填写。无需点击邮件里的外部确认链接。') }
      } else if (mode === 'reset') {
        const { error } = await client.auth.resetPasswordForEmail(email.trim(), { redirectTo: redirect })
        if (error) throw error
        setMode('verify-reset'); setCode(''); setCooldown(60)
        setMessage('如果该邮箱已注册，你会收到找回密码验证码。请在此填写；未收到时检查垃圾邮件。')
      } else if (verifying) {
        const { error } = await client.auth.verifyOtp({ email: email.trim(), token: code.replace(/\s/g, ''), type: mode === 'verify-reset' ? 'recovery' : 'email' })
        if (error) throw error
        if (mode === 'verify-reset') { setMode('password'); setCode(''); setMessage('邮箱已验证，请设置新密码。') }
        else onClose()
      } else {
        const { error } = await client.auth.updateUser({ password })
        if (error) throw error
        onRecovered(); onClose()
      }
    } catch (error) { setError(accountError(error)) }
    finally { setBusy(false) }
  }
  return <dialog className="account-dialog" ref={dialog} onCancel={event => { event.preventDefault(); onClose() }} onClick={event => { if (event.target === dialog.current) onClose() }}>
    <div className="account-dialog-top"><h2>{verifying ? mode === 'verify-reset' ? '验证邮箱，找回密码' : '输入邮箱验证码' : mode === 'login' ? '登录练习台' : mode === 'signup' ? '创建账号' : mode === 'reset' ? '找回密码' : '设置新密码'}</h2><button className="panel-icon-button" onClick={onClose} aria-label="关闭账号窗口"><Icon name="close" /></button></div>
    <p>{verifying ? '打开邮箱查看验证码，再回到这里输入。请勿把验证码发送给其他人。' : '登录后，练习时长和得分会保存到你的账号。'}</p>
    <form onSubmit={submit}>
      {mode !== 'password' && <label>邮箱<input type="email" autoComplete="email" required value={email} maxLength={254} onChange={e => setEmail(e.target.value)} /></label>}
      {mode !== 'reset' && !verifying && <><label>密码<input type="password" aria-describedby={mode !== 'login' ? 'password-help' : undefined} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required minLength={8} maxLength={128} value={password} onChange={e => setPassword(e.target.value)} /></label>{mode !== 'login' && <small id="password-help">至少 8 位，建议混合使用字母和数字。</small>}</>}
      {verifying && <label>邮箱验证码<input className="email-code" inputMode="numeric" autoComplete="one-time-code" required pattern="[0-9]{6,10}" minLength={6} maxLength={10} value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ''))} placeholder="输入邮件中的数字" /></label>}
      {error && <div role="alert" className="alert error">{error}</div>}
      {message && <p role="status" className="account-message">{message}</p>}
      <button className="primary-button" disabled={busy}>{busy ? '处理中…' : verifying ? '验证邮箱' : mode === 'login' ? '登录' : mode === 'signup' ? '注册' : mode === 'reset' ? '发送找回验证码' : '保存新密码'}</button>
    </form>
    {verifying ? <div className="account-links"><button className="text-button" disabled={busy || cooldown > 0} onClick={() => void resend()}>{cooldown > 0 ? `${cooldown}秒后可重发` : '重新发送验证码'}</button><button className="text-button" disabled={busy} onClick={() => changeMode('login')}>返回登录</button></div> : mode !== 'password' && <div className="account-links"><button className="text-button" disabled={busy} onClick={() => changeMode(mode === 'signup' ? 'login' : 'signup')}>{mode === 'signup' ? '已有账号，登录' : '创建账号'}</button>{mode === 'login' && <button className="text-button" disabled={busy} onClick={() => changeMode('reset')}>忘记密码</button>}{mode === 'reset' && <button className="text-button" onClick={() => changeMode('login')}>返回登录</button>}</div>}
    {mode === 'login' && <button className="text-button verify-entry" disabled={busy} onClick={() => changeMode('verify')}>已有注册验证码，继续验证</button>}
    <small>游客可直接练习。账号只保存材料标题和学习统计，不上传原文和听写内容。</small>
  </dialog>
}
