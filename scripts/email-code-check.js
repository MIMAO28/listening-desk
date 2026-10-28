async page => {
  const checks = []
  const check = (condition, label) => { if (!condition) throw new Error(label); checks.push(label) }
  const email = 'otp-learner@example.test', user = { id: '55555555-5555-4555-8555-555555555555', email, aud: 'authenticated', role: 'authenticated', app_metadata: { provider: 'email' }, user_metadata: {}, created_at: new Date().toISOString() }
  const jwt = [Buffer.from('{"alg":"HS256","typ":"JWT"}').toString('base64url'), Buffer.from(JSON.stringify({ sub: user.id, email, aud: 'authenticated', role: 'authenticated', exp: Math.floor(Date.now()/1000)+3600 })).toString('base64url'), 'testing-only'].join('.')
  const session = { access_token: jwt, refresh_token: 'test-refresh', token_type: 'bearer', expires_in: 3600, user }
  const requests = []
  await page.route('**/*.supabase.co/**', async route => {
    const req = route.request(), url = new URL(req.url()), body = req.postDataJSON()
    requests.push({ path: url.pathname, type: body?.type })
    let response = {}, status = 200
    if (url.pathname.endsWith('/signup')) response = { user, session: null }
    else if (url.pathname.endsWith('/verify')) {
      if (body.token !== '123456') { status = 403; response = { error_code: 'otp_expired', msg: 'Token has expired or is invalid' } }
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
  await page.getByRole('button', { name: '注册', exact: true }).click()
  await page.getByRole('heading', { name: '输入邮箱验证码', exact: true }).waitFor()
  check(await page.getByRole('button', { name: /秒后可重发/ }).isDisabled(), 'resend is initially limited by cooldown')
  await page.getByRole('textbox', { name: '邮箱验证码', exact: true }).fill('000000')
  await page.getByRole('button', { name: '验证邮箱', exact: true }).click()
  await page.getByText('验证码错误或已失效，请检查最新邮件，或重新发送。', { exact: true }).waitFor()
  check(true, 'invalid or expired code gives a readable Chinese error')
  await page.getByRole('textbox', { name: '邮箱验证码', exact: true }).fill('123456')
  await page.getByRole('button', { name: '验证邮箱', exact: true }).click()
  await page.getByRole('button', { name: '退出登录', exact: true }).waitFor()
  check(!await page.getByRole('dialog').isVisible(), 'signup OTP verifies and signs in without navigating to a confirmation URL')
  await page.getByRole('button', { name: '退出登录', exact: true }).click()
  await page.getByRole('banner').getByRole('button', { name: '邮箱登录', exact: true }).click()
  await page.getByRole('button', { name: '忘记密码', exact: true }).click()
  await page.getByRole('textbox', { name: '邮箱', exact: true }).fill(email)
  await page.getByRole('button', { name: '发送找回验证码', exact: true }).click()
  await page.getByRole('heading', { name: '验证邮箱，找回密码', exact: true }).waitFor()
  await page.getByRole('textbox', { name: '邮箱验证码', exact: true }).fill('123456')
  await page.getByRole('button', { name: '验证邮箱', exact: true }).click()
  await page.getByRole('heading', { name: '设置新密码', exact: true }).waitFor()
  await page.getByLabel('密码', { exact: true }).fill('Another-test-password')
  await page.getByRole('button', { name: '保存新密码', exact: true }).click()
  await page.getByRole('dialog').waitFor({ state: 'hidden' })
  check(requests.some(r => r.path.endsWith('/verify') && r.type === 'recovery'), 'password recovery uses its own recovery code type')
  check(!requests.some(r => r.path.endsWith('/verify') && r.type === 'signup'), 'signup uses the current email OTP verification type')
  check(page.url().startsWith('http://127.0.0.1:5173/'), 'all verification steps stay on the application origin')
  await page.getByRole('button', { name: '退出登录', exact: true }).click()
  return { checks: checks.length, details: checks }
}
