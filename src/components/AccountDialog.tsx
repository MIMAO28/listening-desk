import { useEffect, useRef, useState } from 'react'
import { accountClient, accountError } from '../lib/account.ts'
import { Icon } from './Icon.tsx'

type Mode = 'login' | 'signup' | 'signup-sent' | 'reset' | 'reset-sent' | 'password'
export function AccountDialog({ onClose, recovery = false, onRecovered }: { onClose: () => void; recovery?: boolean; onRecovered: () => void }) {
  const [mode, setMode] = useState<Mode>(recovery ? 'password' : 'login')
  const [email, setEmail] = useState(''), [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false), [message, setMessage] = useState(''), [error, setError] = useState('')
  const [cooldown, setCooldown] = useState(0), [unconfirmed, setUnconfirmed] = useState(false)
  const dialog = useRef<HTMLDialogElement>(null)
  const sent = mode === 'signup-sent' || mode === 'reset-sent'
  const redirect = `${location.origin}${location.pathname}`
  useEffect(() => { const node = dialog.current!; node.showModal(); return () => node.close() }, [])
  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setTimeout(() => setCooldown(value => Math.max(0, value - 1)), 1000)
    return () => clearTimeout(timer)
  }, [cooldown])
  const changeMode = (next: Mode) => { setMode(next); setError(''); setMessage(''); setPassword(''); setUnconfirmed(false) }
  const resend = async (kind: 'signup' | 'reset') => {
    if (busy || cooldown > 0) return
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setError('请填写有效邮箱地址。'); return }
    setBusy(true); setError(''); setMessage('')
    try {
      const client = await accountClient()
      const { error } = kind === 'reset' ? await client.auth.resetPasswordForEmail(email.trim(), { redirectTo: redirect })
        : await client.auth.resend({ type: 'signup', email: email.trim(), options: { emailRedirectTo: redirect } })
      if (error) throw error
      setCooldown(60); setMode(kind === 'reset' ? 'reset-sent' : 'signup-sent')
      setMessage(kind === 'reset' ? '已请求发送找回密码邮件。若邮箱已注册，请打开最新邮件中的“设置新密码”按钮。'
        : '已请求重新发送。请打开最新确认邮件；若邮箱已确认注册，请直接登录，不会重复发送注册邮件。')
    } catch (error) { setError(accountError(error)); setCooldown(60) }
    finally { setBusy(false) }
  }
  const submit = async (event: React.SubmitEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (sent) { await resend(mode === 'reset-sent' ? 'reset' : 'signup'); return }
    setBusy(true); setError(''); setMessage(''); setUnconfirmed(false)
    try {
      const client = await accountClient()
      if (mode === 'login') {
        const { error } = await client.auth.signInWithPassword({ email: email.trim(), password })
        if (error) throw error
        onClose()
      } else if (mode === 'signup') {
        const { data, error } = await client.auth.signUp({ email: email.trim(), password, options: { emailRedirectTo: redirect } })
        if (error) throw error
        if (data.session) onClose()
        else {
          setMode('signup-sent'); setPassword(''); setCooldown(60)
          setMessage(data.user?.identities?.length === 0
            ? '如果此邮箱已经注册，系统不会重复发送注册邮件。请直接登录，忘记密码时使用“找回密码”。'
            : '注册请求已提交。请打开邮箱，点击确认邮件中的“确认注册”按钮。无需输入验证码；未收到时检查垃圾邮件。')
        }
      } else if (mode === 'reset') {
        const { error } = await client.auth.resetPasswordForEmail(email.trim(), { redirectTo: redirect })
        if (error) throw error
        setMode('reset-sent'); setCooldown(60)
        setMessage('如果该邮箱已注册，你会收到找回密码邮件。点击邮件中的“设置新密码”按钮继续。')
      } else {
        const { error } = await client.auth.updateUser({ password })
        if (error) throw error
        onRecovered(); onClose()
      }
    } catch (error) {
      setError(accountError(error))
      const detail = error && typeof error === 'object' && 'message' in error ? String(error.message) : ''
      setUnconfirmed(/Email not confirmed/i.test(detail))
    } finally { setBusy(false) }
  }
  const title = sent ? mode === 'reset-sent' ? '查看找回密码邮件' : '请到邮箱确认注册'
    : mode === 'login' ? '登录练习台' : mode === 'signup' ? '创建账号' : mode === 'reset' ? '找回密码' : '设置新密码'
  return <dialog className="account-dialog" ref={dialog} onCancel={event => { event.preventDefault(); onClose() }} onClick={event => { if (event.target === dialog.current) onClose() }}>
    <div className="account-dialog-top"><h2>{title}</h2><button className="panel-icon-button" onClick={onClose} aria-label="关闭账号窗口"><Icon name="close" /></button></div>
    <p>{sent ? '打开邮件，点击醒目的确认按钮，再回到网站继续。' : '登录后，练习时长和得分会保存到你的账号。'}</p>
    <form onSubmit={submit}>
      {mode !== 'password' && <label>邮箱<input type="email" autoComplete="email" required value={email} maxLength={254} onChange={e => setEmail(e.target.value)} /></label>}
      {mode !== 'reset' && !sent && <><label>密码<input type="password" aria-describedby={mode !== 'login' ? 'password-help' : undefined} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required minLength={8} maxLength={128} value={password} onChange={e => setPassword(e.target.value)} /></label>{mode !== 'login' && <small id="password-help">至少 8 位，建议混合使用字母和数字。</small>}</>}
      {error && <div role="alert" className="alert error">{error}</div>}
      {message && <p role="status" className="account-message">{message}</p>}
      <button className="primary-button" disabled={busy || sent && cooldown > 0}>{busy ? '处理中…' : sent ? cooldown > 0 ? `${cooldown}秒后可重发` : '重新发送邮件' : mode === 'login' ? '登录' : mode === 'signup' ? '注册并发送确认邮件' : mode === 'reset' ? '发送找回密码邮件' : '保存新密码'}</button>
    </form>
    {mode !== 'password' && <div className="account-links"><button className="text-button" disabled={busy} onClick={() => changeMode(mode === 'signup' || sent ? 'login' : 'signup')}>{mode === 'signup' || sent ? '返回登录' : '创建账号'}</button>{mode === 'login' && <button className="text-button" disabled={busy} onClick={() => changeMode('reset')}>忘记密码</button>}{mode === 'reset' && <button className="text-button" onClick={() => changeMode('login')}>返回登录</button>}</div>}
    {mode === 'login' && unconfirmed && <button className="text-button" disabled={busy || cooldown > 0} onClick={() => void resend('signup')}>重发注册确认邮件</button>}
    <small>游客可直接练习。账号只保存材料标题和学习统计，不上传原文和听写内容。</small>
  </dialog>
}
