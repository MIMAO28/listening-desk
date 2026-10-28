export type EmailAction = { tokenHash: string; type: 'email' | 'recovery' }
export function readEmailAction(hash: string): EmailAction | null {
  if (!hash.startsWith('#/auth/confirm?')) return null
  const params = new URLSearchParams(hash.slice(hash.indexOf('?') + 1))
  const tokenHash = params.get('token_hash') ?? ''
  const type = params.get('type')
  if (!/^[a-zA-Z0-9_-]{16,512}$/.test(tokenHash) || type !== 'email' && type !== 'recovery') return null
  return { tokenHash, type }
}
