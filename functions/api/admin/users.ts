import { getAuth, hashPassword } from '../_auth_utils';

export const onRequestGet: PagesFunction<{ DB: D1Database; JWT_SECRET: string }> = async (context) => {
  const secret = context.env.JWT_SECRET || 'fallback-secret-for-dev';
  const payload = await getAuth(context.request, secret);
  if (!payload || payload.role !== 'admin') {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const { results } = await context.env.DB.prepare('SELECT id, username, role, created_at FROM users').all();
  return new Response(JSON.stringify(results));
};

export const onRequestPost: PagesFunction<{ DB: D1Database; JWT_SECRET: string }> = async (context) => {
  const secret = context.env.JWT_SECRET || 'fallback-secret-for-dev';
  const payload = await getAuth(context.request, secret);
  if (!payload || payload.role !== 'admin') {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const { username, password, role } = await context.request.json() as any;
  if (!username || !password) {
    return new Response(JSON.stringify({ error: 'Username and password required' }), { status: 400 });
  }

  const hashedPassword = await hashPassword(password);
  const id = crypto.randomUUID();

  try {
    await context.env.DB.prepare('INSERT INTO users (id, username, password, role) VALUES (?, ?, ?, ?)')
      .bind(id, username, hashedPassword, role || 'user')
      .run();
    return new Response(JSON.stringify({ success: true, id }));
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
};

export const onRequestDelete: PagesFunction<{ DB: D1Database; JWT_SECRET: string }> = async (context) => {
  const secret = context.env.JWT_SECRET || 'fallback-secret-for-dev';
  const payload = await getAuth(context.request, secret);
  if (!payload || payload.role !== 'admin') {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const url = new URL(context.request.url);
  const id = url.searchParams.get('id');

  if (!id) return new Response(JSON.stringify({ error: 'ID required' }), { status: 400 });
  if (id === payload.id) return new Response(JSON.stringify({ error: 'Cannot delete yourself' }), { status: 400 });

  await context.env.DB.prepare('DELETE FROM users WHERE id = ?').bind(id).run();
  return new Response(JSON.stringify({ success: true }));
};
