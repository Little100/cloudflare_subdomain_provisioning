-- 用户表
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  github_id INTEGER UNIQUE NOT NULL,
  github_username TEXT NOT NULL,
  avatar_url TEXT,
  email TEXT,
  is_admin INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- 子域名表
CREATE TABLE IF NOT EXISTS subdomains (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  subdomain TEXT NOT NULL,
  domain TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  reject_reason TEXT,
  reviewed_at TEXT,
  reviewed_by INTEGER,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(subdomain, domain),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- DNS 记录表
CREATE TABLE IF NOT EXISTS dns_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  subdomain_id INTEGER NOT NULL,
  cf_record_id TEXT NOT NULL,
  record_type TEXT NOT NULL,
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  ttl INTEGER DEFAULT 1,
  priority INTEGER,
  proxied INTEGER DEFAULT 0,
  comment TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (subdomain_id) REFERENCES subdomains(id) ON DELETE CASCADE
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_subdomains_user_id ON subdomains(user_id);
CREATE INDEX IF NOT EXISTS idx_subdomains_domain ON subdomains(domain);
CREATE INDEX IF NOT EXISTS idx_subdomains_status ON subdomains(status);
CREATE INDEX IF NOT EXISTS idx_dns_records_subdomain_id ON dns_records(subdomain_id);
CREATE INDEX IF NOT EXISTS idx_users_github_id ON users(github_id);
