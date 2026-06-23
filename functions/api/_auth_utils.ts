import { SignJWT, jwtVerify } from 'jose';

export async function createToken(payload: any, secret: string) {
  const secretKey = new TextEncoder().encode(secret);
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(secretKey);
}

export async function verifyToken(token: string, secret: string) {
  try {
    const secretKey = new TextEncoder().encode(secret);
    const { payload } = await jwtVerify(token, secretKey);
    return payload;
  } catch (e) {
    return null;
  }
}

export async function hashPassword(password: string) {
  // Simple SHA-256 as requested. For better security, salt should be added.
  // Using a fixed salt for now to improve over no salt without changing schema.
  const salt = 'heron-mapper-salt-2024';
  const msgUint8 = new TextEncoder().encode(password + salt);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function getAuth(request: Request, secret: string) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.split(' ')[1];
  return await verifyToken(token, secret);
}
