import { Hono } from 'hono';
import type { Env, User, DnsRecordInput } from '../types';
import { ALLOWED_RECORD_TYPES as RECORD_TYPES } from '../types';
import { authMiddleware, adminMiddleware } from '../middleware/auth';
import {
  getDomainNames,
  getBannedPrefixes,
  getMaxSubdomains,
  getMaxRecords,
  getZoneIdForDomain,
} from '../config';
import {
  getUserSubdomains,
  getSubdomainById,
  findSubdomain,
  countUserSubdomains,
  createSubdomain,
  deleteSubdomain,
  getSubdomainRecords,
  countSubdomainRecords,
  createDnsRecordEntry,
  getDnsRecordById,
  updateDnsRecordEntry,
  deleteDnsRecordEntry,
  deleteAllRecordsForSubdomain,
  getAllSubdomains,
  getAllUsers,
  approveSubdomain,
  rejectSubdomain,
  getPendingSubdomains,
  findUserById,
} from '../db/queries';
import {
  createDnsRecord as cfCreateDnsRecord,
  updateDnsRecord as cfUpdateDnsRecord,
  deleteDnsRecord as cfDeleteDnsRecord,
} from '../services/cloudflare';
import {
  sendEmail,
  buildApprovalEmail,
  buildRejectionEmail,
  buildNewRequestNotifyEmail,
} from '../services/email';

type Variables = { user: User };

const api = new Hono<{ Bindings: Env; Variables: Variables }>();

// 所有 API 路由需要认证
api.use('/*', authMiddleware);

// ==================== 用户信息 ====================

api.get('/me', (c) => {
  const user = c.get('user');
  return c.json({
    id: user.id,
    github_username: user.github_username,
    avatar_url: user.avatar_url,
    email: user.email,
    is_admin: !!user.is_admin,
    created_at: user.created_at,
  });
});

// ==================== 域名列表 ====================

api.get('/domains', (c) => {
  const domains = getDomainNames(c.env);
  return c.json({
    domains,
    max_subdomains: getMaxSubdomains(c.env),
    max_records: getMaxRecords(c.env),
    banned_prefixes: getBannedPrefixes(c.env),
    allowed_record_types: RECORD_TYPES,
  });
});

// ==================== 子域名管理 ====================

// 获取用户的子域名列表
api.get('/subdomains', async (c) => {
  const user = c.get('user');
  const subdomains = await getUserSubdomains(c.env.DB, user.id);
  return c.json({ subdomains });
});

// 注册新子域名（提交审核）
api.post('/subdomains', async (c) => {
  const user = c.get('user');
  const body = await c.req.json<{ subdomain: string; domain: string }>();

  const { subdomain, domain } = body;

  if (!subdomain || !domain) {
    return c.json({ error: '请提供子域名和域名' }, 400);
  }

  // 验证域名是否在可用列表中
  const domainNames = getDomainNames(c.env);
  if (!domainNames.includes(domain.toLowerCase())) {
    return c.json({ error: '该域名不可用' }, 400);
  }

  // 验证子域名格式
  const subdomainLower = subdomain.toLowerCase().trim();
  if (!/^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/.test(subdomainLower)) {
    return c.json({ error: '子域名格式无效，仅允许小写字母、数字和连字符，且不能以连字符开头或结尾' }, 400);
  }

  if (subdomainLower.length < 2) {
    return c.json({ error: '子域名长度至少为 2 个字符' }, 400);
  }

  // 检查是否为禁止的前缀
  const bannedPrefixes = getBannedPrefixes(c.env);
  if (bannedPrefixes.includes(subdomainLower)) {
    return c.json({ error: '该子域名前缀已被禁止使用' }, 400);
  }

  // 检查用户配额（pending + approved 计数）
  const currentCount = await countUserSubdomains(c.env.DB, user.id);
  const maxSubs = getMaxSubdomains(c.env);
  if (currentCount >= maxSubs) {
    return c.json({ error: `您已达到子域名数量上限 (${maxSubs})` }, 400);
  }

  // 检查子域名是否已被占用
  const existing = await findSubdomain(c.env.DB, subdomainLower, domain);
  if (existing) {
    return c.json({ error: '该子域名已被注册' }, 409);
  }

  // 创建子域名（状态为 pending）
  const newSubdomain = await createSubdomain(c.env.DB, user.id, subdomainLower, domain);

  // 尝试通知管理员
  try {
    const url = new URL(c.req.url);
    const siteName = c.env.SITE_NAME || 'SubDomain Hub';
    const notifyEmail = buildNewRequestNotifyEmail(
      user.github_username,
      subdomainLower,
      domain,
      siteName,
      url.origin
    );
    const adminList = await getAllUsers(c.env.DB);
    for (const admin of adminList.filter((u) => u.is_admin && u.email)) {
      notifyEmail.to = admin.email!;
      await sendEmail(c.env, notifyEmail).catch(() => {});
    }
  } catch {
    // 邮件通知失败不影响主流程
  }

  return c.json({
    subdomain: newSubdomain,
    message: '子域名申请已提交，请等待管理员审核',
  }, 201);
});

// 删除子域名
api.delete('/subdomains/:id', async (c) => {
  const user = c.get('user');
  const id = parseInt(c.req.param('id'), 10);

  const subdomain = await getSubdomainById(c.env.DB, id);
  if (!subdomain) {
    return c.json({ error: '子域名不存在' }, 404);
  }

  if (subdomain.user_id !== user.id && !user.is_admin) {
    return c.json({ error: '无权操作此子域名' }, 403);
  }

  // 如果已审核通过，先删除所有 Cloudflare DNS 记录
  if (subdomain.status === 'approved') {
    const zoneId = await getZoneIdForDomain(c.env, subdomain.domain);
    if (zoneId) {
      const records = await deleteAllRecordsForSubdomain(c.env.DB, subdomain.id);
      for (const record of records) {
        try {
          await cfDeleteDnsRecord(c.env.CF_API_TOKEN, zoneId, record.cf_record_id);
        } catch (err) {
          console.error(`Failed to delete CF record ${record.cf_record_id}:`, err);
        }
      }
    }
  }

  await deleteSubdomain(c.env.DB, id);
  return c.json({ success: true });
});

// ==================== DNS 记录管理 ====================

// 获取子域名的 DNS 记录
api.get('/subdomains/:id/records', async (c) => {
  const user = c.get('user');
  const id = parseInt(c.req.param('id'), 10);

  const subdomain = await getSubdomainById(c.env.DB, id);
  if (!subdomain) {
    return c.json({ error: '子域名不存在' }, 404);
  }

  if (subdomain.user_id !== user.id && !user.is_admin) {
    return c.json({ error: '无权查看此子域名' }, 403);
  }

  if (subdomain.status !== 'approved') {
    return c.json({ error: '子域名尚未通过审核，无法管理 DNS 记录' }, 403);
  }

  const records = await getSubdomainRecords(c.env.DB, subdomain.id);
  return c.json({
    records,
    subdomain: `${subdomain.subdomain}.${subdomain.domain}`,
    max_records: getMaxRecords(c.env),
    current_count: records.length,
  });
});

// 构建完整 DNS 名称
function buildFullName(name: string, subdomain: string, domain: string): string {
  const cleanName = name.trim().toLowerCase();
  const baseFqdn = `${subdomain}.${domain}`;

  if (!cleanName || cleanName === '@') {
    return baseFqdn;
  }
  return `${cleanName}.${baseFqdn}`;
}

// 创建 DNS 记录
api.post('/subdomains/:id/records', async (c) => {
  const user = c.get('user');
  const id = parseInt(c.req.param('id'), 10);
  const body = await c.req.json<DnsRecordInput>();

  const subdomain = await getSubdomainById(c.env.DB, id);
  if (!subdomain) {
    return c.json({ error: '子域名不存在' }, 404);
  }

  if (subdomain.user_id !== user.id && !user.is_admin) {
    return c.json({ error: '无权操作此子域名' }, 403);
  }

  if (subdomain.status !== 'approved') {
    return c.json({ error: '子域名尚未通过审核' }, 403);
  }

  // 验证记录类型
  if (!RECORD_TYPES.includes(body.type as any)) {
    return c.json({ error: `不支持的记录类型，允许: ${RECORD_TYPES.join(', ')}` }, 400);
  }

  // 验证内容
  if (!body.content || !body.content.trim()) {
    return c.json({ error: '记录内容不能为空' }, 400);
  }

  // 验证 A 记录的 IP 格式
  if (body.type === 'A') {
    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!ipv4Regex.test(body.content)) {
      return c.json({ error: 'A 记录需要有效的 IPv4 地址' }, 400);
    }
  }

  // 验证 AAAA 记录的 IPv6 格式
  if (body.type === 'AAAA') {
    const ipv6Regex = /^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/;
    if (!ipv6Regex.test(body.content)) {
      return c.json({ error: 'AAAA 记录需要有效的 IPv6 地址' }, 400);
    }
  }

  // MX 记录需要 priority
  if (body.type === 'MX' && (body.priority === undefined || body.priority === null)) {
    return c.json({ error: 'MX 记录需要设置优先级' }, 400);
  }

  // 检查记录数量限制
  const currentCount = await countSubdomainRecords(c.env.DB, subdomain.id);
  const maxRecords = getMaxRecords(c.env);
  if (currentCount >= maxRecords) {
    return c.json({ error: `已达到 DNS 记录数量上限 (${maxRecords})` }, 400);
  }

  // 构建完整名称
  const fullName = buildFullName(body.name || '@', subdomain.subdomain, subdomain.domain);

  // 获取 Zone ID（自动查找）
  const zoneId = await getZoneIdForDomain(c.env, subdomain.domain);
  if (!zoneId) {
    return c.json({ error: '域名配置错误，无法获取 Zone ID' }, 500);
  }

  try {
    // 在 Cloudflare 创建 DNS 记录
    const cfRecord = await cfCreateDnsRecord(c.env.CF_API_TOKEN, zoneId, {
      type: body.type,
      name: body.name || '@',
      content: body.content.trim(),
      ttl: body.ttl || 1,
      priority: body.priority,
      proxied: body.proxied ?? false,
      fullName,
    });

    // 保存到数据库
    const record = await createDnsRecordEntry(
      c.env.DB,
      subdomain.id,
      cfRecord.id,
      body.type,
      body.name || '@',
      body.content.trim(),
      body.ttl || 1,
      body.priority ?? null,
      body.proxied ?? false,
      body.comment ?? null
    );

    return c.json({ record }, 201);
  } catch (err: any) {
    return c.json({ error: `创建 DNS 记录失败: ${err.message}` }, 500);
  }
});

// 更新 DNS 记录
api.put('/subdomains/:id/records/:recordId', async (c) => {
  const user = c.get('user');
  const subId = parseInt(c.req.param('id'), 10);
  const recordId = parseInt(c.req.param('recordId'), 10);
  const body = await c.req.json<DnsRecordInput>();

  const subdomain = await getSubdomainById(c.env.DB, subId);
  if (!subdomain) {
    return c.json({ error: '子域名不存在' }, 404);
  }

  if (subdomain.user_id !== user.id && !user.is_admin) {
    return c.json({ error: '无权操作此子域名' }, 403);
  }

  if (subdomain.status !== 'approved') {
    return c.json({ error: '子域名尚未通过审核' }, 403);
  }

  const existingRecord = await getDnsRecordById(c.env.DB, recordId);
  if (!existingRecord || existingRecord.subdomain_id !== subdomain.id) {
    return c.json({ error: 'DNS 记录不存在' }, 404);
  }

  // 验证记录类型
  if (!RECORD_TYPES.includes(body.type as any)) {
    return c.json({ error: `不支持的记录类型` }, 400);
  }

  if (!body.content || !body.content.trim()) {
    return c.json({ error: '记录内容不能为空' }, 400);
  }

  const fullName = buildFullName(body.name || '@', subdomain.subdomain, subdomain.domain);

  const zoneId = await getZoneIdForDomain(c.env, subdomain.domain);
  if (!zoneId) {
    return c.json({ error: '域名配置错误' }, 500);
  }

  try {
    const cfRecord = await cfUpdateDnsRecord(
      c.env.CF_API_TOKEN,
      zoneId,
      existingRecord.cf_record_id,
      {
        type: body.type,
        name: body.name || '@',
        content: body.content.trim(),
        ttl: body.ttl || 1,
        priority: body.priority,
        proxied: body.proxied ?? false,
        fullName,
      }
    );

    await updateDnsRecordEntry(
      c.env.DB,
      recordId,
      cfRecord.id,
      body.type,
      body.name || '@',
      body.content.trim(),
      body.ttl || 1,
      body.priority ?? null,
      body.proxied ?? false,
      body.comment ?? null
    );

    const updated = await getDnsRecordById(c.env.DB, recordId);
    return c.json({ record: updated });
  } catch (err: any) {
    return c.json({ error: `更新 DNS 记录失败: ${err.message}` }, 500);
  }
});

// 删除 DNS 记录
api.delete('/subdomains/:id/records/:recordId', async (c) => {
  const user = c.get('user');
  const subId = parseInt(c.req.param('id'), 10);
  const recordId = parseInt(c.req.param('recordId'), 10);

  const subdomain = await getSubdomainById(c.env.DB, subId);
  if (!subdomain) {
    return c.json({ error: '子域名不存在' }, 404);
  }

  if (subdomain.user_id !== user.id && !user.is_admin) {
    return c.json({ error: '无权操作此子域名' }, 403);
  }

  const record = await getDnsRecordById(c.env.DB, recordId);
  if (!record || record.subdomain_id !== subdomain.id) {
    return c.json({ error: 'DNS 记录不存在' }, 404);
  }

  const zoneId = await getZoneIdForDomain(c.env, subdomain.domain);
  if (!zoneId) {
    return c.json({ error: '域名配置错误' }, 500);
  }

  try {
    await cfDeleteDnsRecord(c.env.CF_API_TOKEN, zoneId, record.cf_record_id);
  } catch (err: any) {
    console.error(`Failed to delete CF record:`, err);
  }

  await deleteDnsRecordEntry(c.env.DB, recordId);
  return c.json({ success: true });
});

// ==================== 管理员接口 ====================

api.get('/admin/subdomains', adminMiddleware, async (c) => {
  const subdomains = await getAllSubdomains(c.env.DB);
  return c.json({ subdomains });
});

api.get('/admin/pending', adminMiddleware, async (c) => {
  const pending = await getPendingSubdomains(c.env.DB);
  return c.json({ subdomains: pending });
});

api.get('/admin/users', adminMiddleware, async (c) => {
  const users = await getAllUsers(c.env.DB);
  return c.json({ users });
});

// 管理员审核通过
api.post('/admin/subdomains/:id/approve', adminMiddleware, async (c) => {
  const admin = c.get('user');
  const id = parseInt(c.req.param('id') || '0', 10);

  const subdomain = await getSubdomainById(c.env.DB, id);
  if (!subdomain) {
    return c.json({ error: '子域名不存在' }, 404);
  }

  if (subdomain.status !== 'pending') {
    return c.json({ error: '该子域名不在待审核状态' }, 400);
  }

  await approveSubdomain(c.env.DB, id, admin.id);

  // 发送通知邮件给用户
  try {
    const owner = await findUserById(c.env.DB, subdomain.user_id);
    if (owner?.email) {
      const url = new URL(c.req.url);
      const siteName = c.env.SITE_NAME || 'SubDomain Hub';
      const email = buildApprovalEmail(
        subdomain.subdomain,
        subdomain.domain,
        siteName,
        url.origin
      );
      email.to = owner.email;
      email.toName = owner.github_username;
      await sendEmail(c.env, email).catch(() => {});
    }
  } catch {
    // 不影响主流程
  }

  return c.json({ success: true, message: '已通过审核' });
});

// 管理员审核拒绝
api.post('/admin/subdomains/:id/reject', adminMiddleware, async (c) => {
  const admin = c.get('user');
  const id = parseInt(c.req.param('id') || '0', 10);
  const body = await c.req.json<{ reason: string }>();

  if (!body.reason || !body.reason.trim()) {
    return c.json({ error: '请填写拒绝原因' }, 400);
  }

  const subdomain = await getSubdomainById(c.env.DB, id);
  if (!subdomain) {
    return c.json({ error: '子域名不存在' }, 404);
  }

  if (subdomain.status !== 'pending') {
    return c.json({ error: '该子域名不在待审核状态' }, 400);
  }

  await rejectSubdomain(c.env.DB, id, admin.id, body.reason.trim());

  // 发送通知邮件给用户
  try {
    const owner = await findUserById(c.env.DB, subdomain.user_id);
    if (owner?.email) {
      const url = new URL(c.req.url);
      const siteName = c.env.SITE_NAME || 'SubDomain Hub';
      const email = buildRejectionEmail(
        subdomain.subdomain,
        subdomain.domain,
        body.reason.trim(),
        siteName,
        url.origin
      );
      email.to = owner.email;
      email.toName = owner.github_username;
      await sendEmail(c.env, email).catch(() => {});
    }
  } catch {
    // 不影响主流程
  }

  return c.json({ success: true, message: '已拒绝' });
});

// 管理员删除子域名
api.delete('/admin/subdomains/:id', adminMiddleware, async (c) => {
  const id = parseInt(c.req.param('id') || '0', 10);

  const subdomain = await getSubdomainById(c.env.DB, id);
  if (!subdomain) {
    return c.json({ error: '子域名不存在' }, 404);
  }

  if (subdomain.status === 'approved') {
    const zoneId = await getZoneIdForDomain(c.env, subdomain.domain);
    if (zoneId) {
      const records = await deleteAllRecordsForSubdomain(c.env.DB, subdomain.id);
      for (const record of records) {
        try {
          await cfDeleteDnsRecord(c.env.CF_API_TOKEN, zoneId, record.cf_record_id);
        } catch (err) {
          console.error(`Failed to delete CF record ${record.cf_record_id}:`, err);
        }
      }
    }
  }

  await deleteSubdomain(c.env.DB, id);
  return c.json({ success: true });
});

export default api;
