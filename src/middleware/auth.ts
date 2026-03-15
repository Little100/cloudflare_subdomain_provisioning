import { Context, Next } from 'hono';
import { getCookie } from 'hono/cookie';
import type { Env, User, JwtPayload } from '../types';
import { findUserById } from '../db/queries';

// ==================== JWT Helpers ====================

async function getSigningKey(secret: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

function base64UrlEncode(data: ArrayBuffer | Uint8Array): string {
  const bytes = data instanceof ArrayBuffer ? new Uint8Array(data) : data;
  let binary = '';
  for (const b of bytes) {
    binary += String.fromCharCode(b);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecode(str: string): Uint8Array {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  const binary = atob(str);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export async function signJwt(payload: JwtPayload, secret: string): Promise<string> {
  const header = { alg: 'HS256', typ: 'JWT' };
  const encoder = new TextEncoder();

  const headerB64 = base64UrlEncode(encoder.encode(JSON.stringify(header)));
  const payloadB64 = base64UrlEncode(encoder.encode(JSON.stringify(payload)));
  const signingInput = `${headerB64}.${payloadB64}`;

  const key = await getSigningKey(secret);
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(signingInput));

  return `${signingInput}.${base64UrlEncode(signature)}`;
}

export async function verifyJwt(token: string, secret: string): Promise<JwtPayload | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [headerB64, payloadB64, signatureB64] = parts;
    const signingInput = `${headerB64}.${payloadB64}`;

    const key = await getSigningKey(secret);
    const encoder = new TextEncoder();
    const signature = base64UrlDecode(signatureB64);

    const valid = await crypto.subtle.verify(
      'HMAC',
      key,
      signature,
      encoder.encode(signingInput)
    );

    if (!valid) return null;

    const payload = JSON.parse(
      new TextDecoder().decode(base64UrlDecode(payloadB64))
    ) as JwtPayload;

    // 检查过期
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

// ==================== Auth Middleware ====================

type Variables = {
  user: User;
};

export async function authMiddleware(c: Context<{ Bindings: Env; Variables: Variables }>, next: Next) {
  const token = getCookie(c, 'session');

  if (!token) {
    return c.json({ error: '未登录，请先通过 GitHub 登录' }, 401);
  }

  const env = c.env;
  const payload = await verifyJwt(token, env.JWT_SECRET);
  if (!payload) {
    return c.json({ error: '会话已过期，请重新登录' }, 401);
  }

  const user = await findUserById(env.DB, payload.sub);
  if (!user) {
    return c.json({ error: '用户不存在' }, 401);
  }

  c.set('user', user);
  await next();
}

export async function optionalAuthMiddleware(
  c: Context<{ Bindings: Env; Variables: Variables }>,
  next: Next
) {
  const token = getCookie(c, 'session');

  if (token) {
    const env = c.env;
    const payload = await verifyJwt(token, env.JWT_SECRET);
    if (payload) {
      const user = await findUserById(env.DB, payload.sub);
      if (user) {
        c.set('user', user);
      }
    }
  }

  await next();
}

export async function adminMiddleware(
  c: Context<{ Bindings: Env; Variables: Variables }>,
  next: Next
) {
  const user = c.get('user');
  if (!user || !user.is_admin) {
    return c.json({ error: '需要管理员权限' }, 403);
  }
  await next();
}
