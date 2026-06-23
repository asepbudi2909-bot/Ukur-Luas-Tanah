import { hashPassword, createToken } from '../_auth_utils';

export const onRequestPost: PagesFunction<{ DB: D1Database; JWT_SECRET: string }> = async (context) => {
  const { request, env } = context;
  const { username, password } = await request.json() as any;
  const secret = env.JWT_SECRET || 'fallback-secret-for-dev';

  if (!username || !password) {
    return new Response(JSON.stringify({ error: 'Username and password required' }), { status: 400 });
  }

  const hashedPassword = await hashPassword(password);

  const user = await env.DB.prepare('SELECT * FROM users WHERE username = ? AND password = ?')
    .bind(username, hashedPassword)
    .first() as any;

  if (!user) {
    // Check if it's the initial admin login with plain text password (only for the very first time if not hashed yet)
    const rawUser = await env.DB.prepare('SELECT * FROM users WHERE username = ? AND password = ?')
      .bind(username, password)
      .first() as any;

    if (rawUser && rawUser.username === 'admin') {
      // Auto upgrade admin password to hash
      await env.DB.prepare('UPDATE users SET password = ? WHERE id = ?')
        .bind(hashedPassword, rawUser.id)
        .run();

      const token = await createToken({ id: rawUser.id, username: rawUser.username, role: rawUser.role }, secret);
      return new Response(JSON.stringify({ token, user: { id: rawUser.id, username: rawUser.username, role: rawUser.role } }));
    }

    return new Response(JSON.stringify({ error: 'Invalid credentials' }), { status: 401 });
  }

  const token = await createToken({ id: user.id, username: user.username, role: user.role }, secret);

  return new Response(JSON.stringify({ token, user: { id: user.id, username: user.username, role: user.role } }));
};
