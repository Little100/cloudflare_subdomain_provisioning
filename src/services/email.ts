import type { Env } from '../types';

/**
 * SMTP 邮件发送服务
 * 使用 MailChannels API（Cloudflare Workers 可直接调用）
 * 或者通过外部 SMTP 中继（如 QQ 邮箱）
 *
 * 在 Workers 环境中无法直接使用 TCP socket 连接 SMTP，
 * 因此通过 MailChannels 免费 API 或自建 SMTP HTTP 网关发送。
 *
 * 如果配置了 SMTP_HOST，则使用外部 SMTP HTTP API 网关；
 * 否则尝试 MailChannels（Cloudflare Workers 原生支持）。
 */

interface EmailOptions {
  to: string;
  toName?: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * 通过 MailChannels API 发送邮件（Cloudflare Workers 免费集成）
 * 无需额外配置，仅需域名 SPF 记录包含 _mailchannels
 */
async function sendViaMailChannels(
  env: Env,
  options: EmailOptions
): Promise<boolean> {
  const fromEmail = env.SMTP_FROM || `noreply@${getDomainFromEnv(env)}`;
  const fromName = env.SMTP_FROM_NAME || env.SITE_NAME || 'SubDomain Hub';

  try {
    const response = await fetch('https://api.mailchannels.net/tx/v1/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        personalizations: [
          {
            to: [{ email: options.to, name: options.toName || options.to }],
          },
        ],
        from: { email: fromEmail, name: fromName },
        subject: options.subject,
        content: [
          ...(options.text ? [{ type: 'text/plain', value: options.text }] : []),
          { type: 'text/html', value: options.html },
        ],
      }),
    });

    return response.status === 202 || response.ok;
  } catch (err) {
    console.error('MailChannels send error:', err);
    return false;
  }
}

/**
 * 通过外部 SMTP HTTP API 发送（需要自建网关或使用 Resend/Mailgun 等）
 * 这里提供通用 HTTP POST 接口支持
 */
async function sendViaSmtpGateway(
  env: Env,
  options: EmailOptions
): Promise<boolean> {
  const fromEmail = env.SMTP_FROM || env.SMTP_USER || '';
  const fromName = env.SMTP_FROM_NAME || env.SITE_NAME || 'SubDomain Hub';

  // 使用 SMTP_HOST 作为 HTTP API 端点
  // 支持格式: https://your-smtp-relay.example.com/send
  const endpoint = env.SMTP_HOST!;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${btoa(`${env.SMTP_USER}:${env.SMTP_PASS}`)}`,
      },
      body: JSON.stringify({
        from: `${fromName} <${fromEmail}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text || '',
      }),
    });

    return response.ok;
  } catch (err) {
    console.error('SMTP gateway send error:', err);
    return false;
  }
}

function getDomainFromEnv(env: Env): string {
  const domains = env.DOMAINS?.split(',');
  return domains?.[0]?.trim() || 'example.com';
}

/**
 * 发送邮件（自动选择可用的发送方式）
 */
export async function sendEmail(
  env: Env,
  options: EmailOptions
): Promise<boolean> {
  if (env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS) {
    return sendViaSmtpGateway(env, options);
  }

  // 默认使用 MailChannels
  return sendViaMailChannels(env, options);
}

// ==================== 邮件模板 ====================

export function buildApprovalEmail(
  subdomain: string,
  domain: string,
  siteName: string,
  siteUrl: string
): EmailOptions {
  const fqdn = `${subdomain}.${domain}`;
  return {
    to: '', // 由调用方填入
    subject: `✅ 您的子域名 ${fqdn} 已通过审核 - ${siteName}`,
    html: `
<!DOCTYPE html>
<html><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f8f9fa;padding:40px 0;">
<div style="max-width:520px;margin:0 auto;background:white;border-radius:12px;padding:40px;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
  <h2 style="color:#16a34a;margin:0 0 16px;">✅ 审核通过</h2>
  <p style="color:#333;font-size:15px;line-height:1.6;">
    恭喜！您申请的子域名 <strong style="font-family:monospace;background:#f0fdf4;padding:2px 8px;border-radius:4px;">${fqdn}</strong> 已通过管理员审核。
  </p>
  <p style="color:#333;font-size:15px;line-height:1.6;">
    您现在可以登录管理面板，为您的子域名添加 DNS 记录了。
  </p>
  <div style="text-align:center;margin:28px 0;">
    <a href="${siteUrl}" style="background:#4f46e5;color:white;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:600;">
      前往管理面板
    </a>
  </div>
  <p style="color:#999;font-size:12px;margin-top:28px;border-top:1px solid #eee;padding-top:16px;">
    此邮件由 ${siteName} 自动发送，请勿直接回复。
  </p>
</div>
</body></html>`,
    text: `恭喜！您的子域名 ${fqdn} 已通过审核。请登录 ${siteUrl} 管理 DNS 记录。`,
  };
}

export function buildRejectionEmail(
  subdomain: string,
  domain: string,
  reason: string,
  siteName: string,
  siteUrl: string
): EmailOptions {
  const fqdn = `${subdomain}.${domain}`;
  return {
    to: '',
    subject: `❌ 您的子域名 ${fqdn} 审核未通过 - ${siteName}`,
    html: `
<!DOCTYPE html>
<html><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f8f9fa;padding:40px 0;">
<div style="max-width:520px;margin:0 auto;background:white;border-radius:12px;padding:40px;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
  <h2 style="color:#dc2626;margin:0 0 16px;">❌ 审核未通过</h2>
  <p style="color:#333;font-size:15px;line-height:1.6;">
    很抱歉，您申请的子域名 <strong style="font-family:monospace;background:#fef2f2;padding:2px 8px;border-radius:4px;">${fqdn}</strong> 未通过管理员审核。
  </p>
  <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:16px;margin:16px 0;">
    <p style="color:#991b1b;font-size:14px;margin:0;"><strong>拒绝原因：</strong></p>
    <p style="color:#991b1b;font-size:14px;margin:8px 0 0;">${reason}</p>
  </div>
  <p style="color:#333;font-size:15px;line-height:1.6;">
    您可以登录管理面板重新申请其他子域名。
  </p>
  <div style="text-align:center;margin:28px 0;">
    <a href="${siteUrl}" style="background:#4f46e5;color:white;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:600;">
      前往管理面板
    </a>
  </div>
  <p style="color:#999;font-size:12px;margin-top:28px;border-top:1px solid #eee;padding-top:16px;">
    此邮件由 ${siteName} 自动发送，请勿直接回复。
  </p>
</div>
</body></html>`,
    text: `很抱歉，您的子域名 ${fqdn} 审核未通过。原因：${reason}。请登录 ${siteUrl} 重新申请。`,
  };
}

export function buildNewRequestNotifyEmail(
  username: string,
  subdomain: string,
  domain: string,
  siteName: string,
  siteUrl: string
): EmailOptions {
  const fqdn = `${subdomain}.${domain}`;
  return {
    to: '',
    subject: `📋 新的子域名申请: ${fqdn} - ${siteName}`,
    html: `
<!DOCTYPE html>
<html><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f8f9fa;padding:40px 0;">
<div style="max-width:520px;margin:0 auto;background:white;border-radius:12px;padding:40px;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
  <h2 style="color:#4f46e5;margin:0 0 16px;">📋 新的子域名申请</h2>
  <p style="color:#333;font-size:15px;line-height:1.6;">
    用户 <strong>${username}</strong> 申请了子域名
    <strong style="font-family:monospace;background:#eef2ff;padding:2px 8px;border-radius:4px;">${fqdn}</strong>，
    等待您的审核。
  </p>
  <div style="text-align:center;margin:28px 0;">
    <a href="${siteUrl}" style="background:#4f46e5;color:white;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:600;">
      前往审核
    </a>
  </div>
</div>
</body></html>`,
    text: `用户 ${username} 申请了子域名 ${fqdn}，请登录 ${siteUrl} 审核。`,
  };
}
