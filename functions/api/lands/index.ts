import { getAuth } from '../_auth_utils';

export const onRequestGet: PagesFunction<{ DB: D1Database; JWT_SECRET: string }> = async (context) => {
  const secret = context.env.JWT_SECRET || 'fallback-secret-for-dev';
  const payload = await getAuth(context.request, secret);
  if (!payload) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

  const { results } = await context.env.DB.prepare('SELECT * FROM lands WHERE user_id = ? ORDER BY created_at DESC')
    .bind(payload.id)
    .all();

  // Parse JSON fields
  const parsedResults = results.map((land: any) => ({
    ...land,
    points: JSON.parse(land.points),
    manual_triangle_configs: land.manual_triangle_configs ? JSON.parse(land.manual_triangle_configs) : []
  }));

  return new Response(JSON.stringify(parsedResults));
};

export const onRequestPost: PagesFunction<{ DB: D1Database; JWT_SECRET: string }> = async (context) => {
  const secret = context.env.JWT_SECRET || 'fallback-secret-for-dev';
  const payload = await getAuth(context.request, secret);
  if (!payload) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

  const data = await context.request.json() as any;
  const id = data.id || crypto.randomUUID();

  // If updating, verify ownership
  if (data.id) {
    const existing = await context.env.DB.prepare('SELECT user_id FROM lands WHERE id = ?')
      .bind(data.id)
      .first() as any;

    if (existing && existing.user_id !== payload.id) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
    }
  }

  await context.env.DB.prepare(`
    INSERT INTO lands (id, user_id, name, date, points, scale_pixel_ratio, notes, manual_triangle_configs)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      date = excluded.date,
      points = excluded.points,
      scale_pixel_ratio = excluded.scale_pixel_ratio,
      notes = excluded.notes,
      manual_triangle_configs = excluded.manual_triangle_configs
    WHERE lands.user_id = ?
  `)
  .bind(
    id,
    payload.id,
    data.name,
    data.date,
    JSON.stringify(data.points),
    data.scale_pixel_ratio,
    data.notes || null,
    JSON.stringify(data.manual_triangle_configs || []),
    payload.id
  )
  .run();

  return new Response(JSON.stringify({ success: true, id }));
};

export const onRequestDelete: PagesFunction<{ DB: D1Database; JWT_SECRET: string }> = async (context) => {
  const secret = context.env.JWT_SECRET || 'fallback-secret-for-dev';
  const payload = await getAuth(context.request, secret);
  if (!payload) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

  const url = new URL(context.request.url);
  const id = url.searchParams.get('id');

  if (!id) return new Response(JSON.stringify({ error: 'ID required' }), { status: 400 });

  await context.env.DB.prepare('DELETE FROM lands WHERE id = ? AND user_id = ?')
    .bind(id, payload.id)
    .run();

  return new Response(JSON.stringify({ success: true }));
};
