import type { Env, User, Subdomain, DnsRecord, SubdomainStatus } from '../types';

// ==================== Users ====================

export async function findUserByGitHubId(db: D1Database, githubId: number): Promise<User | null> {
  return db
    .prepare('SELECT * FROM users WHERE github_id = ?')
    .bind(githubId)
    .first<User>();
}

export async function findUserById(db: D1Database, id: number): Promise<User | null> {
  return db
    .prepare('SELECT * FROM users WHERE id = ?')
    .bind(id)
    .first<User>();
}

export async function upsertUser(
  db: D1Database,
  githubId: number,
  githubUsername: string,
  avatarUrl: string | null,
  email: string | null,
  isAdmin: boolean
): Promise<User> {
  await db
    .prepare(
      `INSERT INTO users (github_id, github_username, avatar_url, email, is_admin)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(github_id) DO UPDATE SET
         github_username = excluded.github_username,
         avatar_url = excluded.avatar_url,
         email = excluded.email,
         is_admin = CASE WHEN excluded.is_admin = 1 THEN 1 ELSE users.is_admin END,
         updated_at = datetime('now')`
    )
    .bind(githubId, githubUsername, avatarUrl, email, isAdmin ? 1 : 0)
    .run();

  const user = await findUserByGitHubId(db, githubId);
  if (!user) throw new Error('Failed to upsert user');
  return user;
}

// ==================== Subdomains ====================

export async function getUserSubdomains(db: D1Database, userId: number): Promise<Subdomain[]> {
  const result = await db
    .prepare('SELECT * FROM subdomains WHERE user_id = ? ORDER BY created_at DESC')
    .bind(userId)
    .all<Subdomain>();
  return result.results;
}

export async function getSubdomainById(db: D1Database, id: number): Promise<Subdomain | null> {
  return db
    .prepare('SELECT * FROM subdomains WHERE id = ?')
    .bind(id)
    .first<Subdomain>();
}

export async function findSubdomain(
  db: D1Database,
  subdomain: string,
  domain: string
): Promise<Subdomain | null> {
  return db
    .prepare('SELECT * FROM subdomains WHERE subdomain = ? AND domain = ?')
    .bind(subdomain, domain)
    .first<Subdomain>();
}

export async function countUserSubdomains(db: D1Database, userId: number): Promise<number> {
  // 只计算未被拒绝的子域名（pending + approved）
  const result = await db
    .prepare('SELECT COUNT(*) as count FROM subdomains WHERE user_id = ? AND status != ?')
    .bind(userId, 'rejected')
    .first<{ count: number }>();
  return result?.count || 0;
}

export async function createSubdomain(
  db: D1Database,
  userId: number,
  subdomain: string,
  domain: string
): Promise<Subdomain> {
  await db
    .prepare('INSERT INTO subdomains (user_id, subdomain, domain) VALUES (?, ?, ?)')
    .bind(userId, subdomain, domain)
    .run();

  const record = await findSubdomain(db, subdomain, domain);
  if (!record) throw new Error('Failed to create subdomain');
  return record;
}

export async function deleteSubdomain(db: D1Database, id: number): Promise<void> {
  await db.prepare('DELETE FROM subdomains WHERE id = ?').bind(id).run();
}

// ==================== Review Workflow ====================

export async function approveSubdomain(
  db: D1Database,
  id: number,
  reviewedBy: number
): Promise<void> {
  await db
    .prepare(
      `UPDATE subdomains SET status = 'approved', reject_reason = NULL, reviewed_at = datetime('now'), reviewed_by = ? WHERE id = ?`
    )
    .bind(reviewedBy, id)
    .run();
}

export async function rejectSubdomain(
  db: D1Database,
  id: number,
  reviewedBy: number,
  reason: string
): Promise<void> {
  await db
    .prepare(
      `UPDATE subdomains SET status = 'rejected', reject_reason = ?, reviewed_at = datetime('now'), reviewed_by = ? WHERE id = ?`
    )
    .bind(reason, reviewedBy, id)
    .run();
}

export async function getPendingSubdomains(db: D1Database): Promise<(Subdomain & { github_username: string; email: string | null })[]> {
  const result = await db
    .prepare(
      `SELECT s.*, u.github_username, u.email FROM subdomains s
       JOIN users u ON s.user_id = u.id
       WHERE s.status = 'pending'
       ORDER BY s.created_at ASC`
    )
    .all<Subdomain & { github_username: string; email: string | null }>();
  return result.results;
}

// ==================== DNS Records ====================

export async function getSubdomainRecords(db: D1Database, subdomainId: number): Promise<DnsRecord[]> {
  const result = await db
    .prepare('SELECT * FROM dns_records WHERE subdomain_id = ? ORDER BY record_type, name')
    .bind(subdomainId)
    .all<DnsRecord>();
  return result.results;
}

export async function countSubdomainRecords(db: D1Database, subdomainId: number): Promise<number> {
  const result = await db
    .prepare('SELECT COUNT(*) as count FROM dns_records WHERE subdomain_id = ?')
    .bind(subdomainId)
    .first<{ count: number }>();
  return result?.count || 0;
}

export async function getDnsRecordById(db: D1Database, id: number): Promise<DnsRecord | null> {
  return db
    .prepare('SELECT * FROM dns_records WHERE id = ?')
    .bind(id)
    .first<DnsRecord>();
}

export async function createDnsRecordEntry(
  db: D1Database,
  subdomainId: number,
  cfRecordId: string,
  recordType: string,
  name: string,
  content: string,
  ttl: number,
  priority: number | null,
  proxied: boolean,
  comment: string | null
): Promise<DnsRecord> {
  const result = await db
    .prepare(
      `INSERT INTO dns_records (subdomain_id, cf_record_id, record_type, name, content, ttl, priority, proxied, comment)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(subdomainId, cfRecordId, recordType, name, content, ttl, priority, proxied ? 1 : 0, comment)
    .run();

  const id = result.meta.last_row_id;
  const record = await getDnsRecordById(db, id as number);
  if (!record) throw new Error('Failed to create DNS record entry');
  return record;
}

export async function updateDnsRecordEntry(
  db: D1Database,
  id: number,
  cfRecordId: string,
  recordType: string,
  name: string,
  content: string,
  ttl: number,
  priority: number | null,
  proxied: boolean,
  comment: string | null
): Promise<void> {
  await db
    .prepare(
      `UPDATE dns_records SET cf_record_id = ?, record_type = ?, name = ?, content = ?, ttl = ?, priority = ?, proxied = ?, comment = ?, updated_at = datetime('now')
       WHERE id = ?`
    )
    .bind(cfRecordId, recordType, name, content, ttl, priority, proxied ? 1 : 0, comment, id)
    .run();
}

export async function deleteDnsRecordEntry(db: D1Database, id: number): Promise<void> {
  await db.prepare('DELETE FROM dns_records WHERE id = ?').bind(id).run();
}

export async function deleteAllRecordsForSubdomain(db: D1Database, subdomainId: number): Promise<DnsRecord[]> {
  const records = await getSubdomainRecords(db, subdomainId);
  await db.prepare('DELETE FROM dns_records WHERE subdomain_id = ?').bind(subdomainId).run();
  return records;
}

// ==================== Admin ====================

export async function getAllSubdomains(db: D1Database): Promise<(Subdomain & { github_username: string; email: string | null })[]> {
  const result = await db
    .prepare(
      `SELECT s.*, u.github_username, u.email FROM subdomains s
       JOIN users u ON s.user_id = u.id
       ORDER BY s.created_at DESC`
    )
    .all<Subdomain & { github_username: string; email: string | null }>();
  return result.results;
}

export async function getAllUsers(db: D1Database): Promise<User[]> {
  const result = await db
    .prepare('SELECT * FROM users ORDER BY created_at DESC')
    .all<User>();
  return result.results;
}
