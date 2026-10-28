async page => {
  const checks = [], db = new Map(), results = new Map()
  const assert = (condition, label) => { if (!condition) throw new Error(label); checks.push(label) }
  const ids = { 'learner-a@example.test': '11111111-1111-4111-8111-111111111111', 'learner-b@example.test': '22222222-2222-4222-8222-222222222222' }
  const makeUser = email => ({ id: ids[email], email, aud: 'authenticated', role: 'authenticated', app_metadata: { provider: 'email', providers: ['email'] }, user_metadata: {}, created_at: new Date().toISOString() })
  const token = email => [Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url'), Buffer.from(JSON.stringify({ sub: ids[email], email, role: 'authenticated', aud: 'authenticated', exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url'), 'testing-only'].join('.')
  await page.route('**/*.supabase.co/**', async route => {
    const req = route.request(), url = new URL(req.url()), body = req.postDataJSON()
    let claims = {}
    try { claims = JSON.parse(Buffer.from(req.headers().authorization?.split('.')[1] ?? '', 'base64url').toString()) } catch {}
    const email = Object.keys(ids).find(email => ids[email] === claims.sub)
    const owner = email ? ids[email] : null
    let payload = null
    if (url.pathname.endsWith('/token')) { const user = makeUser(body.email); payload = { access_token: token(body.email), refresh_token: 'test-refresh', token_type: 'bearer', expires_in: 3600, user } }
    else if (url.pathname.endsWith('/user')) payload = email ? makeUser(email) : null
    else if (url.pathname.endsWith('/logout')) payload = {}
    else if (url.pathname.endsWith('/rpc/save_learning_session')) {
      assert(!!owner, 'only authenticated session writes')
      const previous = db.get(body.p_id)
      assert(!previous || previous.owner === owner, 'session remains owned by its original account')
      db.set(body.p_id, { ...previous, owner, id: body.p_id, title: body.p_title, language: body.p_language, study_day: '2026-10-28', duration_seconds: body.p_seconds, sentence_count: previous?.sentence_count ?? 0, points: previous?.points ?? 0, correct_words: previous?.correct_words ?? 0, total_words: previous?.total_words ?? 0, completed: body.p_completed, updated_at: new Date().toISOString() })
    } else if (url.pathname.endsWith('/rpc/submit_learning_sentence')) {
      const session = db.get(body.p_session)
      assert(session?.owner === owner, 'sentence write uses the signed-in account')
      const key = `${body.p_session}:${body.p_index}`, previous = results.get(key)
      const delta = Math.max(body.p_correct, previous?.correct ?? 0) - (previous?.correct ?? 0)
      session.points += delta; session.correct_words += delta
      if (!previous) { session.sentence_count++; session.total_words += body.p_total }
      results.set(key, { correct: Math.max(body.p_correct, previous?.correct ?? 0) })
    } else if (url.pathname.endsWith('/learning_sessions')) {
      assert(url.searchParams.get('user_id') === `eq.${owner}`, 'statistics query explicitly filters the signed-in user')
      payload = [...db.values()].filter(row => row.owner === owner)
    } else throw new Error(`Unexpected endpoint ${url.pathname}`)
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(payload) })
  })
  await page.goto('http://127.0.0.1:5173/#/practice/en')
  await page.getByRole('textbox', { name: '我的听写内容', exact: true }).fill('I took a different route to the library this morning.')
  await page.getByRole('button', { name: '检查本句', exact: true }).click()
  assert(db.size === 0, 'guest practice does not upload statistics')
  const login = async email => {
    await page.getByRole('banner').getByRole('button', { name: '邮箱登录', exact: true }).click()
    await page.getByRole('textbox', { name: '邮箱', exact: true }).fill(email)
    await page.getByLabel('密码', { exact: true }).fill('Test-only-password-2026')
    await page.getByRole('button', { name: '登录', exact: true }).click()
    await page.getByRole('button', { name: '退出登录', exact: true }).waitFor()
  }
  await login('learner-a@example.test')
  await page.getByRole('button', { name: '检查本句', exact: true }).click()
  await page.waitForFunction(() => document.querySelector('.answer-actions')?.textContent.includes('学习记录已同步'))
  assert([...db.values()][0].points === 10, 'correct words earn points')
  await page.getByRole('button', { name: '检查本句', exact: true }).click()
  await page.waitForTimeout(250)
  assert([...db.values()][0].points === 10, 'rechecking does not duplicate points')
  await page.getByRole('link', { name: '学习面板', exact: true }).click()
  await page.getByText('累计 10 分', { exact: true }).waitFor()
  assert(await page.getByRole('heading', { name: 'Lv.1 Beginner' }).isVisible(), 'dashboard displays actual level and points')
  await page.setViewportSize({ width: 390, height: 844 })
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'mobile dashboard has no horizontal overflow')
  await page.screenshot({ path: 'output/account-dashboard-mobile.png', fullPage: true })
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.screenshot({ path: 'output/account-dashboard-desktop.png', fullPage: true })
  await page.getByRole('button', { name: '退出登录', exact: true }).click()
  await page.getByRole('heading', { name: '让每一次练习留下积累', exact: true }).waitFor()
  await login('learner-b@example.test')
  await page.getByText('累计 0 分', { exact: true }).waitFor()
  assert(!await page.getByText('累计 10 分', { exact: true }).isVisible(), 'next account never sees previous account statistics')
  await page.getByRole('button', { name: '退出登录', exact: true }).click()
  await page.unroute('**/*.supabase.co/**')
  return { checks: checks.length, details: checks }
}
