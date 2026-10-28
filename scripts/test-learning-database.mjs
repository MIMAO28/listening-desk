import { PGlite } from '@electric-sql/pglite'
import { readFile } from 'node:fs/promises'
import assert from 'node:assert/strict'
const db = new PGlite()
await db.exec(`create role anon; create role authenticated; create schema auth; create table auth.users(id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true),'')::uuid $$;
grant usage on schema auth to authenticated, anon; grant execute on function auth.uid() to authenticated, anon;
insert into auth.users values ('11111111-1111-4111-8111-111111111111'),('22222222-2222-4222-8222-222222222222');`)
await db.exec(await readFile('supabase/migrations/202610280001_learning.sql', 'utf8'))
const a = '11111111-1111-4111-8111-111111111111', b = '22222222-2222-4222-8222-222222222222', session = '33333333-3333-4333-8333-333333333333'
const login = async id => { await db.exec(`reset role; set role authenticated; set request.jwt.claim.sub='${id}';`) }
await login(a)
await db.query('select public.save_learning_session($1,$2,$3,$4)', [session, 'Private lesson', 'en-US', 10])
await db.query('select public.submit_learning_sentence($1,0,3,5)', [session])
await db.query('select public.submit_learning_sentence($1,0,3,5)', [session])
let rows = (await db.query('select points,sentence_count from public.learning_sessions')).rows
assert.deepEqual(rows, [{ points: 3, sentence_count: 1 }])
await db.query('select public.submit_learning_sentence($1,0,5,5)', [session])
assert.equal((await db.query('select points from public.learning_sessions')).rows[0].points, 5)
await assert.rejects(db.query('update public.learning_sessions set points=999'))
await assert.rejects(db.query('select public.submit_learning_sentence($1,0,6,5)', [session]))
await login(b)
assert.equal((await db.query('select * from public.learning_sessions')).rows.length, 0)
assert.equal((await db.query('select * from public.sentence_results')).rows.length, 0)
await assert.rejects(db.query('select public.save_learning_session($1,$2,$3,$4)', [session, 'Hijack', 'en-US', 100]))
await assert.rejects(db.query('select public.submit_learning_sentence($1,1,5,5)', [session]))
await db.exec('reset role; set role anon;')
await assert.rejects(db.query('select * from public.learning_sessions'))
await assert.rejects(db.query('select public.save_learning_session($1,$2,$3,$4)', [session, 'Guest', 'en-US', 10]))
await db.close()
console.log('Database verified: migration, own records, duplicate-safe points, improved answer, two-user isolation, no direct writes, no anonymous access.')
