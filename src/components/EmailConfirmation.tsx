import { useEffect, useRef, useState } from 'react'
import { accountClient, accountError } from '../lib/account.ts'
import { readEmailAction } from '../lib/emailConfirmation.ts'

export function EmailConfirmation({ onLogin }: { onLogin: () => void }) {
  const [action, setAction] = useState(() => readEmailAction(location.hash))
  const [status, setStatus] = useState<'ready' | 'busy' | 'success' | 'error'>('ready')
  const [error, setError] = useState('')
  const busy = useRef(false)
  useEffect(() => {
    const capture = () => {
      if (location.hash.startsWith('#/auth/confirm?')) {
        setAction(readEmailAction(location.hash)); setStatus('ready'); setError('')
        // Keep the one-time credential out of history and referrers.
        history.replaceState(null, '', `${location.pathname}#/auth/confirm`)
      }
    }
    capture(); window.addEventListener('hashchange', capture)
    return () => window.removeEventListener('hashchange', capture)
  }, [])
  const confirm = async () => {
    if (!action || busy.current) return
    busy.current = true; setStatus('busy'); setError('')
    try {
      const client = await accountClient()
      const { error } = await client.auth.verifyOtp({ token_hash: action.tokenHash, type: action.type })
      if (error) throw error
      setStatus('success')
    } catch (error) { setStatus('error'); setError(accountError(error)) }
    finally { busy.current = false }
  }
  return <main className="learning-page email-confirm-page"><section className="email-confirm-card">
    <h1>{status === 'success' ? action?.type === 'recovery' ? '邮箱已验证' : '注册确认成功' : action?.type === 'recovery' ? '验证邮箱，设置新密码' : '确认你的邮箱'}</h1>
    {status === 'success' ? <><p>{action?.type === 'recovery' ? '请在弹出的窗口设置新密码。' : '邮箱确认已完成，你已登录，可以开始练习。'}</p>{action?.type === 'recovery' ? <button className="primary-button" onClick={onLogin}>继续设置新密码</button> : <a className="primary-button" href="#/dashboard">进入学习面板</a>}</>
      : !action ? <><p>确认链接不完整，或页面已刷新。请重新打开邮件中的按钮；若之前已经确认，请直接登录。</p><button className="primary-button" onClick={onLogin}>返回登录</button></>
      : <><p>点击下方按钮完成{action.type === 'recovery' ? '身份验证，然后设置新密码' : '邮箱确认并登录'}，无需输入验证码。</p>
        {error && <div className="alert error" role="alert">{error}</div>}
        <button className="primary-button" disabled={status === 'busy'} onClick={() => void confirm()}>{status === 'busy' ? '确认中…' : action.type === 'recovery' ? '确认邮箱，继续找回密码' : '确认邮箱并登录'}</button>
        {status === 'error' && <button className="text-button" onClick={onLogin}>已确认过？直接登录</button>}
      </>}
  </section></main>
}
