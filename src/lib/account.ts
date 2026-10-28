import { createClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'
import { assetUrl } from './assetUrl.ts'

let pending: Promise<SupabaseClient> | undefined
export function accountClient() {
  pending ??= (async () => {
    const response = await fetch(assetUrl('account-config.json'))
    if (!response.ok) throw new Error('账号服务尚未配置，请稍后重试。')
    const { url, publishableKey } = await response.json()
    if (typeof url !== 'string' || typeof publishableKey !== 'string' || !/^https:\/\/[a-z0-9]+\.supabase\.co$/.test(url) || !publishableKey.startsWith('sb_publishable_')) throw new Error('账号配置无效。')
    return createClient(url, publishableKey, { auth: { flowType: 'pkce', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
      global: { fetch: (input, init) => fetch(input, { ...init,
        signal: init?.signal ? AbortSignal.any([init.signal, AbortSignal.timeout(12000)]) : AbortSignal.timeout(12000),
        keepalive: init?.method === 'POST' && typeof init.body === 'string' && init.body.length < 32000 }) } })
  })().catch(error => { pending = undefined; throw error })
  return pending
}
export function accountError(error: unknown) {
  const message = error instanceof Error ? error.message : typeof error === 'object' && error && 'message' in error ? String(error.message) : ''
  if (/Invalid login credentials/i.test(message)) return '邮箱或密码不正确。'
  if (/Email not confirmed/i.test(message)) return '请先打开邮箱中的确认邮件，再回来登录。'
  if (/Email address not authorized/i.test(message)) return '网站发信服务尚未就绪，暂时无法向这个邮箱发送确认邮件。'
  if (/rate limit|over_email_send_rate_limit/i.test(message)) return '邮件发送过于频繁，请稍后重试。'
  if (/email.*invalid|invalid.*email/i.test(message)) return '请填写有效邮箱地址。'
  if (/signup.*disabled/i.test(message)) return '暂未开放注册，请联系网站维护者。'
  if (/smtp|email.*sending|unexpected_failure/i.test(message)) return '验证邮件未能发送，网站维护者需要检查邮件服务配置。'
  if (/Could not find|does not exist|PGRST202|permission denied/i.test(message)) return '学习数据库尚未就绪，请稍后重试。'
  if (/fetch|network|timeout|Failed to fetch/i.test(message)) return '暂时连不上账号服务，请检查网络后重试。'
  return message || '操作未完成，请稍后重试。'
}
