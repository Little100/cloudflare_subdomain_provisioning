import type { DnsRecordInput } from '../types';

const CF_API_BASE = 'https://api.cloudflare.com/client/v4';

interface CfApiResponse<T = unknown> {
  success: boolean;
  errors: Array<{ code: number; message: string }>;
  result: T;
}

interface CfDnsRecord {
  id: string;
  type: string;
  name: string;
  content: string;
  ttl: number;
  priority?: number;
  proxied: boolean;
  comment?: string;
}

function headers(apiToken: string): Record<string, string> {
  return {
    Authorization: `Bearer ${apiToken}`,
    'Content-Type': 'application/json',
  };
}

export async function createDnsRecord(
  apiToken: string,
  zoneId: string,
  record: DnsRecordInput & { fullName: string }
): Promise<CfDnsRecord> {
  const body: Record<string, unknown> = {
    type: record.type,
    name: record.fullName,
    content: record.content,
    ttl: record.ttl || 1,
    proxied: record.proxied ?? false,
  };

  if (record.priority !== undefined) {
    body.priority = record.priority;
  }
  if (record.comment) {
    body.comment = record.comment;
  }

  const response = await fetch(`${CF_API_BASE}/zones/${zoneId}/dns_records`, {
    method: 'POST',
    headers: headers(apiToken),
    body: JSON.stringify(body),
  });

  const data = (await response.json()) as CfApiResponse<CfDnsRecord>;
  if (!data.success) {
    throw new Error(`Cloudflare API error: ${data.errors.map((e) => e.message).join(', ')}`);
  }
  return data.result;
}

export async function updateDnsRecord(
  apiToken: string,
  zoneId: string,
  recordId: string,
  record: DnsRecordInput & { fullName: string }
): Promise<CfDnsRecord> {
  const body: Record<string, unknown> = {
    type: record.type,
    name: record.fullName,
    content: record.content,
    ttl: record.ttl || 1,
    proxied: record.proxied ?? false,
  };

  if (record.priority !== undefined) {
    body.priority = record.priority;
  }
  if (record.comment) {
    body.comment = record.comment;
  }

  const response = await fetch(
    `${CF_API_BASE}/zones/${zoneId}/dns_records/${recordId}`,
    {
      method: 'PUT',
      headers: headers(apiToken),
      body: JSON.stringify(body),
    }
  );

  const data = (await response.json()) as CfApiResponse<CfDnsRecord>;
  if (!data.success) {
    throw new Error(`Cloudflare API error: ${data.errors.map((e) => e.message).join(', ')}`);
  }
  return data.result;
}

export async function deleteDnsRecord(
  apiToken: string,
  zoneId: string,
  recordId: string
): Promise<void> {
  const response = await fetch(
    `${CF_API_BASE}/zones/${zoneId}/dns_records/${recordId}`,
    {
      method: 'DELETE',
      headers: headers(apiToken),
    }
  );

  const data = (await response.json()) as CfApiResponse;
  if (!data.success) {
    throw new Error(`Cloudflare API error: ${data.errors.map((e) => e.message).join(', ')}`);
  }
}

export async function listDnsRecords(
  apiToken: string,
  zoneId: string,
  nameFilter?: string
): Promise<CfDnsRecord[]> {
  const params = new URLSearchParams({ per_page: '100' });
  if (nameFilter) {
    params.set('name', nameFilter);
  }

  const response = await fetch(
    `${CF_API_BASE}/zones/${zoneId}/dns_records?${params.toString()}`,
    {
      method: 'GET',
      headers: headers(apiToken),
    }
  );

  const data = (await response.json()) as CfApiResponse<CfDnsRecord[]>;
  if (!data.success) {
    throw new Error(`Cloudflare API error: ${data.errors.map((e) => e.message).join(', ')}`);
  }
  return data.result;
}

/** 验证 API Token 是否有效 */
export async function verifyToken(apiToken: string): Promise<boolean> {
  const response = await fetch(`${CF_API_BASE}/user/tokens/verify`, {
    headers: headers(apiToken),
  });
  const data = (await response.json()) as CfApiResponse<{ status: string }>;
  return data.success && data.result.status === 'active';
}
