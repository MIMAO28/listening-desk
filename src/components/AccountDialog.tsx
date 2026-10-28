import { useEffect, useRef, useState } from 'react'
import { accountClient, accountError } from '../lib/account.ts'
import { Icon } from './Icon.tsx'

export function AccountDialog({ onClose, recovery = false, onRecovered }: { onClose: () => void; recovery?: boolean; onRecovered: () => void }) {
  const [mode, setMode] = useState<'login' | 'signup' | 'reset' | 'password'>(recovery ? 'password' : 'login')
  const [email, setEmail] = useState(''), [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false), [message, setMessage] = useState(''), [error, setError] = useState('')
  const dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => { const node = dialog.current!; node.showModal(); return () => node.close() }, [])
  const changeMode = (next: typeof mode) => { setMode(next); setError(''); setMessage(''); setPassword('') }
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
        else setMessage('请查看邮箱中的确认邮件。确认后回来登录；没有收到时也请检查垃圾邮件。')
      } else if (mode === 'reset') {
        const { error } = await client.auth.resetPasswordForEmail(email.trim(), { redirectTo: redirect })
        if (error) throw error
        setMessage('如果该邮箱已注册且邮件服务可用，你会收到重设密码的邮件。')
      } else {
        const { error } = await client.auth.updateUser({ password })
        if (error) throw error
        onRecovered(); onClose()
      }
    } catch (error) { setError(accountError(error)) }
    finally { setBusy(false) }
  }
  return <dialog className="account-dialog" ref={dialog} onCancel={event => { event.preventDefault(); onClose() }} onClick={event => { if (event.target === dialog.current) onClose() }}>
    <div className="account-dialog-top"><h2>{mode === 'login' ? '登录练习台' : mode === 'signup' ? '创建账号' : mode === 'reset' ? '找回密码' : '设置新密码'}</h2><button className="panel-icon-button" onClick={onClose} aria-label="关闭账号窗口"><Icon name="close" /></button></div>
    <p>登录后，练习时长和得分会保存到你的账号。</p>
    <form onSubmit={submit}>
      {mode !== 'password' && <label>邮箱<input type="email" autoComplete="email" required value={email} maxLength={254} onChange={e => setEmail(e.target.value)} /></label>}
      {mode !== 'reset' && <label>密码<input type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required minLength={8} maxLength={128} value={password} onChange={e => setPassword(e.target.value)} /><small>{mode !== 'login' && '至少 8 位，建议混合使用字母和数字。'}</small></label>}
      {error && <div role="alert" className="alert error">{error}</div>}
      {message && <p role="status" className="account-message">{message}</p>}
      <button className="primary-button" disabled={busy}>{busy ? '处理中…' : mode === 'login' ? '登录' : mode === 'signup' ? '注册' : mode === 'reset' ? '发送重设邮件' : '保存新密码'}</button>
    </form>
    {mode !== 'password' && <div className="account-links"><button className="text-button" disabled={busy} onClick={() => changeMode(mode === 'signup' ? 'login' : 'signup')}>{mode === 'signup' ? '已有账号，登录' : '创建账号'}</button>{mode === 'login' && <button className="text-button" disabled={busy} onClick={() => changeMode('reset')}>忘记密码</button>}{mode === 'reset' && <button className="text-button" onClick={() => changeMode('login')}>返回登录</button>}</div>}
    <small>游客可直接练习。账号只保存材料标题和学习统计，不上传原文和听写内容。</small>
  </dialog>
}
