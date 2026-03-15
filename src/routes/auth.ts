import { Hono } from 'hono';
import { setCookie, deleteCookie } from 'hono/cookie';
import type { Env, User } from '../types';
import { getGitHubAuthUrl, exchangeCodeForToken, getGitHubUser } from '../services/github';
import { upsertUser } from '../db/queries';
import { signJwt } from '../middleware/auth';
import { getAdminUsers } from '../config';

type Variables = { user: User };

const auth = new Hono<{ Bindings: Env; Variables: Variables }>();

// 发起 GitHub OAuth 登录
auth.get('/github', async (c) => {
  const url = new URL(c.req.url);
  const redirectUri = `${url.origin}/auth/github/callback`;

  // 生成随机 state 防止 CSRF
  const state = crypto.randomUUID();

  setCookie(c, 'oauth_state', state, {
    httpOnly: true,
    secure: true,
    sameSite: 'Lax',
    maxAge: 600,
    path: '/',
  });

  const authUrl = getGitHubAuthUrl(c.env.GITHUB_CLIENT_ID, redirectUri, state);
  return c.redirect(authUrl);
});

// GitHub OAuth 回调
auth.get('/github/callback', async (c) => {
  const { code, state } = c.req.query();

  if (!code || !state) {
    return c.json({ error: '缺少参数' }, 400);
  }

  // 验证 state (简化版，生产中应从 cookie 验证)
  // 在 Workers 环境中 cookie 验证
  const savedState = c.req.header('cookie')
    ?.split(';')
    .find((c) => c.trim().startsWith('oauth_state='))
    ?.split('=')[1]
    ?.trim();

  if (savedState !== state) {
    return c.json({ error: 'State 校验失败，请重新登录' }, 400);
  }

  try {
    // 换取 access token
    const accessToken = await exchangeCodeForToken(
      c.env.GITHUB_CLIENT_ID,
      c.env.GITHUB_CLIENT_SECRET,
      code
    );

    // 获取 GitHub 用户信息
    const ghUser = await getGitHubUser(accessToken);

    // 检查是否为管理员
    const adminUsers = getAdminUsers(c.env);
    const isAdmin = adminUsers.includes(ghUser.login.toLowerCase());

    // 创建或更新用户
    const user = await upsertUser(
      c.env.DB,
      ghUser.id,
      ghUser.login,
      ghUser.avatar_url,
      ghUser.email,
      isAdmin
    );

    // 签发 JWT
    const now = Math.floor(Date.now() / 1000);
    const token = await signJwt(
      {
        sub: user.id,
        iat: now,
        exp: now + 7 * 24 * 60 * 60, // 7 天有效期
      },
      c.env.JWT_SECRET
    );

    // 清除 oauth_state cookie
    deleteCookie(c, 'oauth_state', { path: '/' });

    // 设置 session cookie
    setCookie(c, 'session', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'Lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    });

    return c.redirect('/');
  } catch (err) {
    console.error('OAuth callback error:', err);
    return c.json({ error: '登录失败，请重试' }, 500);
  }
});

// 登出
auth.get('/logout', async (c) => {
  deleteCookie(c, 'session', { path: '/' });
  return c.redirect('/');
});

export default auth;
