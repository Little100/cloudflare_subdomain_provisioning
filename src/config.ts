import type { Env, DomainConfig } from './types';

// Zone ID 缓存（Worker 实例生命周期内有效）
const zoneIdCache = new Map<string, string>();

export function getDomainNames(env: Env): string[] {
  if (!env.DOMAINS) return [];
  return env.DOMAINS.split(',').map((d) => d.trim().toLowerCase()).filter(Boolean);
}

export async function getDomainConfigs(env: Env): Promise<DomainConfig[]> {
  const names = getDomainNames(env);
  const configs: DomainConfig[] = [];

  for (const domain of names) {
    const zoneId = await resolveZoneId(env.CF_API_TOKEN, domain);
    if (zoneId) {
      configs.push({ domain, zoneId });
    }
  }

  return configs;
}

async function resolveZoneId(apiToken: string, domain: string): Promise<string | null> {
  if (zoneIdCache.has(domain)) {
    return zoneIdCache.get(domain)!;
  }

  try {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/zones?name=${encodeURIComponent(domain)}&status=active`,
      {
        headers: {
          Authorization: `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const data = (await response.json()) as {
      success: boolean;
      result: Array<{ id: string; name: string }>;
    };

    if (data.success && data.result.length > 0) {
      const zoneId = data.result[0].id;
      zoneIdCache.set(domain, zoneId);
      return zoneId;
    }
  } catch (err) {
    console.error(`Failed to resolve zone ID for ${domain}:`, err);
  }

  return null;
}

export async function getZoneIdForDomain(env: Env, domain: string): Promise<string | null> {
  return resolveZoneId(env.CF_API_TOKEN, domain);
}

export function getBannedPrefixes(env: Env): string[] {
  if (!env.BANNED_PREFIXES) return [];
  return env.BANNED_PREFIXES.split(',').map((p) => p.trim().toLowerCase());
}

export function getMaxSubdomains(env: Env): number {
  return parseInt(env.MAX_SUBDOMAINS_PER_USER || '1', 10);
}

export function getMaxRecords(env: Env): number {
  return parseInt(env.MAX_RECORDS_PER_SUBDOMAIN || '20', 10);
}

export function getAdminUsers(env: Env): string[] {
  if (!env.ADMIN_USERS) return [];
  return env.ADMIN_USERS.split(',').map((u) => u.trim().toLowerCase());
}

export function isSmtpConfigured(env: Env): boolean {
  return !!(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS);
}
