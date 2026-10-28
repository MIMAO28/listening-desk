async page => {
  const checks = [], requests = []
  const check = (condition, label) => { if (!condition) throw new Error(label); checks.push(label) }
  const email = 'link-learner@example.test', user = { id: '66666666-6666-4666-8666-666666666666', email, aud: 'authenticated', role: 'authenticated', app_metadata: { provider: 'email' }, user_metadata: {}, identities: [{ provider: 'email' }], created_at: new Date().toISOString() }
  const tokenHash = 'a'.repeat(64)
  const jwt = [Buffer.from('{"alg":"HS256","typ":"JWT"}').toString('base64url'), Buffer.from(JSON.stringify({ sub: user.id, email, aud: 'authenticated', role: 'authenticated', exp: Math.floor(Date.now()/1000)+3600 })).toString('base64url'), 'testing-only'].join('.')
  const session = { access_token: jwt, refresh_token: 'test-refresh', token_type: 'bearer', expires_in: 3600, user }
  await page.route('**/*.supabase.co/**', async route => {
    const req = route.request(), url = new URL(req.url()), body = req.postDataJSON()
    requests.push({ path: url.pathname, body })
    let response = {}, status = 200
    if (url.pathname.endsWith('/signup')) response = { user, session: null }
    else if (url.pathname.endsWith('/verify')) {
      if (body.token_hash !== tokenHash) { status = 403; response = { error_code: 'otp_expired', msg: 'Token has expired or is invalid' } }
      else response = session
    } else if (url.pathname.endsWith('/user')) response = { user }
    else if (url.pathname.endsWith('/learning_sessions')) response = []
    await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(response) })
  })
  await page.goto('http://127.0.0.1:5173/#/practice/en')
  await page.getByRole('banner').getByRole('button', { name: '邮箱登录', exact: true }).click()
  await page.getByRole('button', { name: '创建账号', exact: true }).click()
  await page.getByRole('textbox', { name: '邮箱', exact: true }).fill(email)
  await page.getByLabel('密码', { exact: true }).fill('Test-password-only')
  await page.getByRole('button', { name: '注册并发送确认邮件', exact: true }).click()
  await page.getByRole('heading', { name: '请到邮箱确认注册', exact: true }).waitFor()
  check(await page.getByRole('textbox', { name: '邮箱验证码', exact: true }).count() === 0, 'signup has no code entry')
  check(await page.getByRole('button', { name: /秒后可重发/ }).isDisabled(), 'resend has a cooldown')
  await page.getByRole('button', { name: '关闭账号窗口', exact: true }).click()
  await page.goto(`http://127.0.0.1:5173/#/auth/confirm?token_hash=${tokenHash}&type=email`)
  await page.getByRole('button', { name: '确认邮箱并登录', exact: true }).waitFor()
  check(!page.url().includes(tokenHash), 'one-time link credential is removed from URL')
  check(!requests.some(r => r.path.endsWith('/verify')), 'opening a link does not auto-consume it')
  await page.getByRole('button', { name: '确认邮箱并登录', exact: true }).click()
  await page.getByRole('heading', { name: '注册确认成功', exact: true }).waitFor()
  check(requests.some(r => r.path.endsWith('/verify') && r.body.type === 'email' && r.body.token_hash === tokenHash), 'button verifies exact email token hash')
  check(await page.getByRole('button', { name: '退出登录', exact: true }).isVisible(), 'confirming signs in on this device')
  await page.getByRole('button', { name: '退出登录', exact: true }).click()
  await page.goto(`http://127.0.0.1:5173/#/auth/confirm?token_hash=${tokenHash}&type=recovery`)
  await page.getByRole('button', { name: '确认邮箱，继续找回密码', exact: true }).click()
  await page.getByRole('heading', { name: '设置新密码', exact: true }).waitFor()
  await page.getByLabel('密码', { exact: true }).fill('Another-test-password')
  await page.getByRole('button', { name: '保存新密码', exact: true }).click()
  await page.getByRole('dialog').waitFor({ state: 'hidden' })
  check(requests.some(r => r.path.endsWith('/verify') && r.body.type === 'recovery'), 'recovery link opens new password form without a code')
  await page.getByRole('button', { name: '退出登录', exact: true }).click()
  await page.goto(`http://127.0.0.1:5173/#/auth/confirm?token_hash=${'b'.repeat(64)}&type=email`)
  await page.getByRole('button', { name: '确认邮箱并登录', exact: true }).click()
  await page.getByText('确认链接已失效或已使用。若已确认过，请直接登录；否则重新发送邮件。', { exact: true }).waitFor()
  check(true, 'expired or used links give a clear next step')
  await page.setViewportSize({ width: 390, height: 844 })
  check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'mobile confirmation fits viewport')
  return { checks: checks.length, details: checks }
}
