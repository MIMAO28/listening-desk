import { useCallback, useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { accountClient, accountError } from '../lib/account.ts'

export function useAccount() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [recovery, setRecovery] = useState(false)
  useEffect(() => {
    let alive = true, unsubscribe: (() => void) | undefined
    const timeout = setTimeout(() => { if (alive) { setLoading(false); setError('账号服务连接较慢，可以先以游客练习。') } }, 12000)
    void accountClient().then(async client => {
      if (!alive) return
      const { data } = client.auth.onAuthStateChange((event, session) => {
        if (!alive) return
        setUser(session?.user ?? null)
        if (event === 'PASSWORD_RECOVERY') setRecovery(true)
      })
      unsubscribe = () => data.subscription.unsubscribe()
      const { data: current, error } = await client.auth.getSession()
      if (alive) { clearTimeout(timeout); if (error) setError(accountError(error)); else { setUser(current.session?.user ?? null); setError('') } setLoading(false) }
    }).catch(error => { if (alive) { setError(accountError(error)); setLoading(false) } })
    return () => { alive = false; clearTimeout(timeout); unsubscribe?.() }
  }, [])
  const logout = useCallback(async () => {
    const client = await accountClient()
    const { error } = await client.auth.signOut()
    if (error) throw error
    setUser(null)
  }, [])
  return { user, loading, error, recovery, finishRecovery: () => setRecovery(false), logout }
}
