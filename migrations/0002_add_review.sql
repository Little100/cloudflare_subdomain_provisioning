-- 子域名表增加审核字段
ALTER TABLE subdomains ADD COLUMN status TEXT DEFAULT 'pending';
ALTER TABLE subdomains ADD COLUMN reject_reason TEXT;
ALTER TABLE subdomains ADD COLUMN reviewed_at TEXT;
ALTER TABLE subdomains ADD COLUMN reviewed_by INTEGER;

-- 索引
CREATE INDEX IF NOT EXISTS idx_subdomains_status ON subdomains(status);
