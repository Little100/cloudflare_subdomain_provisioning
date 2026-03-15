import { Hono } from 'hono';
import { html } from 'hono/html';
import type { Env, User } from '../types';
import { optionalAuthMiddleware } from '../middleware/auth';

type Variables = { user: User };

const pages = new Hono<{ Bindings: Env; Variables: Variables }>();

pages.use('/*', optionalAuthMiddleware);

pages.get('/', (c) => {
  const user = c.get('user');
  const siteName = c.env.SITE_NAME || 'SubDomain Hub';

  return c.html(renderPage(siteName, user));
});

function renderPage(siteName: string, user?: User) {
  return html`<!DOCTYPE html>
<html lang="zh-CN" data-theme="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${siteName}</title>
  <style>
    :root {
      --font-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;
      --font-mono: 'SF Mono', 'Fira Code', 'Fira Mono', 'Roboto Mono', monospace;
      --radius: 10px;
      --radius-sm: 6px;
      --transition: 0.2s ease;
    }

    [data-theme="dark"] {
      --bg-primary: #0a0a0f;
      --bg-secondary: #12121a;
      --bg-tertiary: #1a1a26;
      --bg-card: #14141e;
      --bg-hover: #1e1e2e;
      --bg-input: #1a1a26;
      --border: #2a2a3a;
      --border-hover: #3a3a5a;
      --text-primary: #e8e8f0;
      --text-secondary: #9898b0;
      --text-muted: #686880;
      --accent: #6366f1;
      --accent-hover: #818cf8;
      --accent-bg: rgba(99, 102, 241, 0.1);
      --accent-border: rgba(99, 102, 241, 0.3);
      --danger: #ef4444;
      --danger-hover: #f87171;
      --danger-bg: rgba(239, 68, 68, 0.1);
      --success: #22c55e;
      --success-bg: rgba(34, 197, 94, 0.1);
      --warning: #f59e0b;
      --warning-bg: rgba(245, 158, 11, 0.1);
      --pending-bg: rgba(139, 92, 246, 0.1);
      --pending: #8b5cf6;
      --shadow: 0 4px 24px rgba(0, 0, 0, 0.3);
      --shadow-sm: 0 2px 8px rgba(0, 0, 0, 0.2);
    }

    [data-theme="light"] {
      --bg-primary: #fafafa;
      --bg-secondary: #ffffff;
      --bg-tertiary: #f5f5f5;
      --bg-card: #ffffff;
      --bg-hover: #f0f0f5;
      --bg-input: #f5f5fa;
      --border: #e0e0e8;
      --border-hover: #c0c0d0;
      --text-primary: #1a1a2e;
      --text-secondary: #64648a;
      --text-muted: #9898b0;
      --accent: #4f46e5;
      --accent-hover: #6366f1;
      --accent-bg: rgba(79, 70, 229, 0.08);
      --accent-border: rgba(79, 70, 229, 0.2);
      --danger: #dc2626;
      --danger-hover: #ef4444;
      --danger-bg: rgba(220, 38, 38, 0.08);
      --success: #16a34a;
      --success-bg: rgba(22, 163, 74, 0.08);
      --warning: #d97706;
      --warning-bg: rgba(217, 119, 6, 0.08);
      --pending-bg: rgba(139, 92, 246, 0.08);
      --pending: #7c3aed;
      --shadow: 0 4px 24px rgba(0, 0, 0, 0.08);
      --shadow-sm: 0 2px 8px rgba(0, 0, 0, 0.04);
    }

    * { margin: 0; padding: 0; box-sizing: border-box; }
    html { scroll-behavior: smooth; }
    body {
      font-family: var(--font-sans);
      background: var(--bg-primary);
      color: var(--text-primary);
      line-height: 1.6;
      min-height: 100vh;
      transition: background var(--transition), color var(--transition);
    }
    a { color: var(--accent); text-decoration: none; transition: color var(--transition); }
    a:hover { color: var(--accent-hover); }

    .container { max-width: 960px; margin: 0 auto; padding: 0 24px; }

    .header {
      background: var(--bg-secondary);
      border-bottom: 1px solid var(--border);
      padding: 16px 0;
      position: sticky;
      top: 0;
      z-index: 100;
      backdrop-filter: blur(16px);
    }
    .header .container { display: flex; align-items: center; justify-content: space-between; }
    .logo { font-size: 20px; font-weight: 700; color: var(--text-primary); display: flex; align-items: center; gap: 10px; }
    .logo-icon { width: 32px; height: 32px; background: linear-gradient(135deg, var(--accent), #a855f7); border-radius: 8px; display: flex; align-items: center; justify-content: center; color: white; font-size: 16px; font-weight: 700; }
    .header-actions { display: flex; align-items: center; gap: 12px; }
    .user-info { display: flex; align-items: center; gap: 10px; padding: 6px 12px; background: var(--bg-tertiary); border-radius: var(--radius); border: 1px solid var(--border); }
    .user-avatar { width: 28px; height: 28px; border-radius: 50%; }
    .user-name { font-size: 14px; font-weight: 500; color: var(--text-primary); }

    .btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 10px 20px; border: 1px solid transparent; border-radius: var(--radius-sm); font-size: 14px; font-weight: 500; font-family: var(--font-sans); cursor: pointer; transition: all var(--transition); white-space: nowrap; text-decoration: none; }
    .btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-primary { background: var(--accent); color: white; border-color: var(--accent); }
    .btn-primary:hover:not(:disabled) { background: var(--accent-hover); border-color: var(--accent-hover); }
    .btn-secondary { background: var(--bg-tertiary); color: var(--text-primary); border-color: var(--border); }
    .btn-secondary:hover:not(:disabled) { background: var(--bg-hover); border-color: var(--border-hover); }
    .btn-danger { background: var(--danger-bg); color: var(--danger); border-color: transparent; }
    .btn-danger:hover:not(:disabled) { background: var(--danger); color: white; }
    .btn-success { background: var(--success-bg); color: var(--success); border-color: transparent; }
    .btn-success:hover:not(:disabled) { background: var(--success); color: white; }
    .btn-ghost { background: transparent; color: var(--text-secondary); border: none; padding: 8px; }
    .btn-ghost:hover { color: var(--text-primary); background: var(--bg-hover); }
    .btn-sm { padding: 6px 14px; font-size: 13px; }
    .btn-github { background: #24292e; color: white; border: none; padding: 12px 28px; font-size: 16px; border-radius: var(--radius); }
    .btn-github:hover { background: #373e47; }
    [data-theme="light"] .btn-github { background: #24292e; color: white; }

    .theme-toggle { width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; background: var(--bg-tertiary); border: 1px solid var(--border); color: var(--text-secondary); font-size: 18px; transition: all var(--transition); }
    .theme-toggle:hover { background: var(--bg-hover); color: var(--text-primary); border-color: var(--border-hover); }

    .card { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius); padding: 24px; transition: all var(--transition); }
    .card-hover:hover { border-color: var(--border-hover); box-shadow: var(--shadow-sm); }
    .card-title { font-size: 16px; font-weight: 600; margin-bottom: 16px; display: flex; align-items: center; justify-content: space-between; }

    .form-group { margin-bottom: 16px; }
    .form-label { display: block; font-size: 13px; font-weight: 500; color: var(--text-secondary); margin-bottom: 6px; }
    .form-input, .form-select { width: 100%; padding: 10px 14px; background: var(--bg-input); border: 1px solid var(--border); border-radius: var(--radius-sm); color: var(--text-primary); font-size: 14px; font-family: var(--font-sans); transition: all var(--transition); outline: none; }
    .form-input:focus, .form-select:focus { border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-bg); }
    .form-input::placeholder { color: var(--text-muted); }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .form-row-3 { display: grid; grid-template-columns: 140px 1fr 1fr; gap: 12px; }
    .form-inline { display: flex; align-items: flex-end; gap: 8px; }
    .form-inline .form-group { flex: 1; margin-bottom: 0; }
    .subdomain-input-group { display: flex; align-items: center; gap: 0; }
    .subdomain-input-group .form-input { border-radius: var(--radius-sm) 0 0 var(--radius-sm); border-right: none; text-align: right; }
    .subdomain-input-group .domain-suffix { padding: 10px 14px; background: var(--bg-tertiary); border: 1px solid var(--border); border-radius: 0 var(--radius-sm) var(--radius-sm) 0; color: var(--text-secondary); font-size: 14px; white-space: nowrap; font-family: var(--font-mono); }
    textarea.form-input { resize: vertical; min-height: 80px; }

    .table-wrap { overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; }
    th { text-align: left; padding: 10px 14px; font-size: 12px; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid var(--border); }
    td { padding: 12px 14px; font-size: 14px; border-bottom: 1px solid var(--border); color: var(--text-primary); }
    tr:last-child td { border-bottom: none; }
    tr:hover td { background: var(--bg-hover); }
    .mono { font-family: var(--font-mono); font-size: 13px; }

    .badge { display: inline-flex; align-items: center; padding: 2px 10px; border-radius: 999px; font-size: 12px; font-weight: 500; }
    .badge-type { background: var(--accent-bg); color: var(--accent); border: 1px solid var(--accent-border); }
    .badge-proxied { background: var(--warning-bg); color: var(--warning); }
    .badge-pending { background: var(--pending-bg); color: var(--pending); }
    .badge-approved { background: var(--success-bg); color: var(--success); }
    .badge-rejected { background: var(--danger-bg); color: var(--danger); }

    .hero { text-align: center; padding: 80px 0 60px; }
    .hero h1 { font-size: 48px; font-weight: 800; letter-spacing: -0.03em; background: linear-gradient(135deg, var(--accent), #a855f7, #ec4899); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; margin-bottom: 16px; }
    .hero p { font-size: 18px; color: var(--text-secondary); max-width: 520px; margin: 0 auto 32px; }
    .features { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin: 48px 0; }
    .feature-card { text-align: center; padding: 28px 20px; }
    .feature-icon { font-size: 32px; margin-bottom: 12px; }
    .feature-card h3 { font-size: 16px; font-weight: 600; margin-bottom: 6px; }
    .feature-card p { font-size: 13px; color: var(--text-secondary); }

    .dashboard { padding: 32px 0; }
    .section { margin-bottom: 32px; }
    .section-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
    .section-title { font-size: 22px; font-weight: 700; }
    .empty { text-align: center; padding: 48px 20px; color: var(--text-muted); }
    .empty-icon { font-size: 48px; margin-bottom: 12px; }

    .subdomain-card { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; margin-bottom: 8px; }
    .subdomain-info h4 { font-size: 16px; font-weight: 600; font-family: var(--font-mono); }
    .subdomain-info p { font-size: 13px; color: var(--text-secondary); margin-top: 2px; }
    .subdomain-actions { display: flex; gap: 8px; align-items: center; }

    .status-note { margin-top: 6px; padding: 10px 14px; border-radius: var(--radius-sm); font-size: 13px; }
    .status-note.pending { background: var(--pending-bg); color: var(--pending); }
    .status-note.rejected { background: var(--danger-bg); color: var(--danger); }

    .dns-header { display: flex; align-items: center; gap: 12px; margin-bottom: 24px; }
    .dns-header h2 { font-size: 22px; font-weight: 700; }
    .back-link { display: inline-flex; align-items: center; gap: 6px; color: var(--text-secondary); font-size: 14px; }
    .back-link:hover { color: var(--text-primary); }
    .record-form { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius); padding: 20px; margin-bottom: 24px; }
    .record-form-title { font-size: 14px; font-weight: 600; margin-bottom: 16px; color: var(--text-secondary); }

    /* Admin tabs */
    .tabs { display: flex; gap: 4px; margin-bottom: 20px; border-bottom: 1px solid var(--border); padding-bottom: 0; }
    .tab { padding: 10px 20px; cursor: pointer; font-size: 14px; font-weight: 500; color: var(--text-secondary); border-bottom: 2px solid transparent; transition: all var(--transition); background: none; border-top: none; border-left: none; border-right: none; font-family: var(--font-sans); }
    .tab:hover { color: var(--text-primary); }
    .tab.active { color: var(--accent); border-bottom-color: var(--accent); }
    .tab .tab-count { background: var(--danger); color: white; border-radius: 999px; padding: 0 7px; font-size: 11px; margin-left: 6px; }

    .modal-overlay { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.6); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 200; opacity: 0; pointer-events: none; transition: opacity 0.2s; }
    .modal-overlay.active { opacity: 1; pointer-events: auto; }
    .modal { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius); padding: 28px; max-width: 480px; width: 90%; box-shadow: var(--shadow); transform: scale(0.95); transition: transform 0.2s; }
    .modal-overlay.active .modal { transform: scale(1); }
    .modal h3 { font-size: 18px; font-weight: 600; margin-bottom: 12px; }
    .modal p { color: var(--text-secondary); font-size: 14px; margin-bottom: 20px; }
    .modal-actions { display: flex; gap: 10px; justify-content: flex-end; }

    .toast-container { position: fixed; top: 80px; right: 20px; z-index: 300; display: flex; flex-direction: column; gap: 8px; }
    .toast { padding: 12px 20px; border-radius: var(--radius-sm); font-size: 14px; font-weight: 500; box-shadow: var(--shadow); animation: slideIn 0.3s ease, fadeOut 0.3s ease 2.7s; animation-fill-mode: forwards; max-width: 380px; }
    .toast-success { background: var(--success); color: white; }
    .toast-error { background: var(--danger); color: white; }
    .toast-info { background: var(--accent); color: white; }
    @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
    @keyframes fadeOut { to { opacity: 0; transform: translateX(100%); } }

    .spinner { display: inline-block; width: 20px; height: 20px; border: 2px solid var(--border); border-top-color: var(--accent); border-radius: 50%; animation: spin 0.6s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .loading-center { display: flex; justify-content: center; padding: 40px; }

    .checkbox-label { display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 14px; color: var(--text-secondary); }
    .checkbox-label input[type="checkbox"] { width: 16px; height: 16px; accent-color: var(--accent); }

    .review-card { border-left: 3px solid var(--pending); }
    .review-card .review-meta { display: flex; gap: 16px; align-items: center; font-size: 13px; color: var(--text-secondary); margin-top: 4px; }

    @media (max-width: 768px) {
      .hero h1 { font-size: 32px; }
      .features { grid-template-columns: 1fr; }
      .form-row, .form-row-3 { grid-template-columns: 1fr; }
      .subdomain-card { flex-direction: column; gap: 12px; align-items: flex-start; }
      .user-name { display: none; }
    }

    ::-webkit-scrollbar { width: 8px; height: 8px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 4px; }
    ::-webkit-scrollbar-thumb:hover { background: var(--border-hover); }

    .fade-in { animation: fadeIn 0.3s ease; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }

    .footer { text-align: center; padding: 32px 0; color: var(--text-muted); font-size: 13px; border-top: 1px solid var(--border); margin-top: 48px; }
  </style>
</head>
<body>
  <header class="header">
    <div class="container">
      <a href="/" class="logo" onclick="navigate('home'); return false;">
        <div class="logo-icon">S</div>
        <span>${siteName}</span>
      </a>
      <div class="header-actions">
        <button class="theme-toggle" onclick="toggleTheme()" title="切换主题">
          <span id="theme-icon" style="display:flex;align-items:center;"></span>
        </button>
        <div id="header-user"></div>
      </div>
    </div>
  </header>

  <main id="app" class="container">
    <div class="loading-center"><div class="spinner"></div></div>
  </main>

  <div class="toast-container" id="toast-container"></div>

  <div class="modal-overlay" id="modal-overlay">
    <div class="modal" id="modal-content">
      <h3 id="modal-title">确认</h3>
      <p id="modal-message"></p>
      <div id="modal-body"></div>
      <div class="modal-actions" id="modal-actions">
        <button class="btn btn-secondary" onclick="closeModal()">取消</button>
        <button class="btn btn-danger" id="modal-confirm" onclick="confirmModal()">确认</button>
      </div>
    </div>
  </div>

  <script>
    const icons = {
      themeDark: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>',
      themeLight: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>',
      admin: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>',
      pending: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:4px;vertical-align:text-bottom"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>',
      approved: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:4px;vertical-align:text-bottom"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>',
      rejected: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:4px;vertical-align:text-bottom"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>',
      globe: '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>',
      tool: '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path></svg>',
      shield: '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>',
      mailbox: '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:var(--text-muted)"><path d="M22 6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6zm-2 0l-8 5-8-5"></path></svg>',
      clipboard: '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:var(--text-muted)"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg>',
      users: '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:var(--text-muted)"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>',
      edit: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>',
      trash: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>',
      plus: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>',
      user: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:4px;vertical-align:text-bottom"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>',
      calendar: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:4px;vertical-align:text-bottom"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>',
      email: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:4px;vertical-align:text-bottom"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>'
    };

    const state = {
      user: ${user ? `JSON.parse('${JSON.stringify({ id: user.id, github_username: user.github_username, avatar_url: user.avatar_url, is_admin: !!user.is_admin, email: user.email })}')` : 'null'},
      domains: [],
      subdomains: [],
      records: [],
      config: {},
      currentSubdomain: null,
      currentView: 'home',
      modalCallback: null,
      editingRecord: null,
      // Admin state
      adminTab: 'pending',
      adminPending: [],
      adminAll: [],
      adminUsers: [],
    };

    // ==================== API ====================
    async function api(path, opts = {}) {
      const res = await fetch('/api' + path, {
        headers: { 'Content-Type': 'application/json', ...opts.headers },
        ...opts,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '请求失败');
      return data;
    }

    // ==================== Toast ====================
    function toast(message, type = 'info') {
      const container = document.getElementById('toast-container');
      const el = document.createElement('div');
      el.className = 'toast toast-' + type;
      el.textContent = message;
      container.appendChild(el);
      setTimeout(() => el.remove(), 3200);
    }

    // ==================== Modal ====================
    function showModal(title, message, callback, opts = {}) {
      document.getElementById('modal-title').textContent = title;
      document.getElementById('modal-message').textContent = message;
      document.getElementById('modal-body').innerHTML = opts.bodyHtml || '';
      const actions = document.getElementById('modal-actions');
      const confirmBtn = document.getElementById('modal-confirm');
      confirmBtn.textContent = opts.confirmText || '确认';
      confirmBtn.className = 'btn ' + (opts.confirmClass || 'btn-danger');
      document.getElementById('modal-overlay').classList.add('active');
      state.modalCallback = callback;
    }

    function closeModal() {
      document.getElementById('modal-overlay').classList.remove('active');
      state.modalCallback = null;
    }

    function confirmModal() {
      if (state.modalCallback) state.modalCallback();
      closeModal();
    }

    // ==================== Theme ====================
    function getTheme() { return localStorage.getItem('theme') || 'dark'; }
    function setTheme(theme) {
      document.documentElement.setAttribute('data-theme', theme);
      localStorage.setItem('theme', theme);
      document.getElementById('theme-icon').innerHTML = theme === 'dark' ? icons.themeDark : icons.themeLight;
    }
    function toggleTheme() { setTheme(getTheme() === 'dark' ? 'light' : 'dark'); }

    // ==================== Navigation ====================
    function navigate(view, data) {
      state.currentView = view;
      if (data !== undefined) state.currentSubdomain = data;
      render();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function renderHeaderUser() {
      const el = document.getElementById('header-user');
      if (state.user) {
        let adminLink = '';
        if (state.user.is_admin) {
          adminLink = '<a href="#" class="btn btn-ghost btn-sm" onclick="navigate(\\'admin\\'); return false;" style="font-size:13px">' + icons.admin + ' 管理</a>';
        }
        el.innerHTML = '<div class="user-info">' +
          '<img class="user-avatar" src="' + (state.user.avatar_url || '') + '" alt="">' +
          '<span class="user-name">' + escapeHtml(state.user.github_username) + '</span>' +
          '</div>' + adminLink +
          '<a href="/auth/logout" class="btn btn-ghost btn-sm">退出</a>';
      } else {
        el.innerHTML = '';
      }
    }

    function escapeHtml(str) {
      if (!str) return '';
      const div = document.createElement('div');
      div.textContent = str;
      return div.innerHTML;
    }

    function statusBadge(status) {
      const map = {
        pending: '<span class="badge badge-pending">' + icons.pending + ' 待审核</span>',
        approved: '<span class="badge badge-approved">' + icons.approved + ' 已通过</span>',
        rejected: '<span class="badge badge-rejected">' + icons.rejected + ' 已拒绝</span>',
      };
      return map[status] || status;
    }

    // ==================== Landing ====================
    function renderLanding() {
      return '<div class="hero fade-in">' +
        '<h1>获取你的专属子域名</h1>' +
        '<p>通过 GitHub 登录，申请属于自己的二级域名，经管理员审核后即可获得完整 DNS 控制权。</p>' +
        '<a href="/auth/github" class="btn btn-github">' +
        '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style="margin-right:8px"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.387-1.333-1.756-1.333-1.756-1.09-.744.083-.729.083-.729 1.205.085 1.838 1.237 1.838 1.237 1.07 1.834 2.809 1.304 3.495.997.108-.776.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.3 1.23A11.51 11.51 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.29-1.552 3.297-1.23 3.297-1.23.653 1.652.242 2.873.118 3.176.77.84 1.235 1.91 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222 0 1.604-.015 2.898-.015 3.293 0 .322.216.694.825.576C20.565 21.795 24 17.295 24 12c0-6.63-5.37-12-12-12z"/></svg>' +
        '使用 GitHub 登录' +
        '</a></div>' +
        '<div class="features">' +
        '<div class="card feature-card card-hover"><div class="feature-icon">' + icons.globe + '</div><h3>安全分配</h3><p>管理员审核通过后，即可获得专属子域名</p></div>' +
        '<div class="card feature-card card-hover"><div class="feature-icon">' + icons.tool + '</div><h3>完整 DNS 控制</h3><p>支持 A、AAAA、CNAME、MX、TXT、SRV、CAA 全类型记录</p></div>' +
        '<div class="card feature-card card-hover"><div class="feature-icon">' + icons.shield + '</div><h3>Cloudflare 加速</h3><p>依托 Cloudflare 全球网络，享受 CDN 加速与 DDoS 防护</p></div>' +
        '</div>';
    }

    // ==================== Dashboard ====================
    async function loadDashboardData() {
      try {
        const [domainData, subData] = await Promise.all([api('/domains'), api('/subdomains')]);
        state.domains = domainData.domains;
        state.config = {
          max_subdomains: domainData.max_subdomains,
          max_records: domainData.max_records,
          banned_prefixes: domainData.banned_prefixes,
          allowed_record_types: domainData.allowed_record_types,
        };
        state.subdomains = subData.subdomains;
      } catch (err) { toast(err.message, 'error'); }
    }

    function renderDashboard() {
      const subs = state.subdomains;
      // pending + approved count for quota
      const activeSubs = subs.filter(s => s.status !== 'rejected');
      const canCreate = activeSubs.length < state.config.max_subdomains;

      let h = '<div class="dashboard fade-in">';

      if (canCreate) {
        h += '<div class="section">' +
          '<div class="section-header"><h2 class="section-title">申请子域名</h2></div>' +
          '<div class="card">' +
          '<div class="form-inline">' +
          '<div class="form-group" style="flex:2">' +
          '<label class="form-label">子域名</label>' +
          '<div class="subdomain-input-group">' +
          '<input type="text" class="form-input" id="new-subdomain" placeholder="your-name" />' +
          '<select class="form-select domain-suffix" id="new-domain" style="width:auto;border-radius:0 var(--radius-sm) var(--radius-sm) 0;border-left:none;">' +
          state.domains.map(d => '<option value="' + d + '">.' + d + '</option>').join('') +
          '</select></div></div>' +
          '<button class="btn btn-primary" onclick="registerSubdomain()" style="margin-bottom:0;align-self:flex-end;">提交申请</button>' +
          '</div>' +
          '<p style="font-size:12px;color:var(--text-muted);margin-top:10px;">仅限小写字母、数字和连字符，长度 ≥ 2 · 提交后需管理员审核</p>' +
          '</div></div>';
      }

      h += '<div class="section"><div class="section-header">' +
        '<h2 class="section-title">我的子域名</h2>' +
        '<span style="font-size:13px;color:var(--text-muted)">' + activeSubs.length + ' / ' + state.config.max_subdomains + '</span></div>';

      if (subs.length === 0) {
        h += '<div class="card empty"><div class="empty-icon">' + icons.mailbox + '</div><p>还没有子域名，快去申请一个吧</p></div>';
      } else {
        subs.forEach(sub => {
          const fqdn = sub.subdomain + '.' + sub.domain;
          h += '<div class="card card-hover subdomain-card">' +
            '<div class="subdomain-info">' +
            '<h4>' + escapeHtml(fqdn) + ' ' + statusBadge(sub.status) + '</h4>' +
            '<p>创建于 ' + new Date(sub.created_at).toLocaleDateString('zh-CN') + '</p>';

          if (sub.status === 'pending') {
            h += '<div class="status-note pending" style="display:flex;align-items:center;gap:6px">' + icons.pending + '正在等待管理员审核，审核通过后即可管理 DNS 记录</div>';
          } else if (sub.status === 'rejected') {
            h += '<div class="status-note rejected" style="display:flex;align-items:center;gap:6px">' + icons.rejected + '拒绝原因: ' + escapeHtml(sub.reject_reason || '未提供') + '</div>';
          }

          h += '</div><div class="subdomain-actions">';

          if (sub.status === 'approved') {
            h += '<button class="btn btn-primary btn-sm" onclick="openDnsManager(' + sub.id + ')">管理 DNS</button>';
          }

          h += '<button class="btn btn-danger btn-sm" onclick="deleteSubdomainConfirm(' + sub.id + ',\\'' + escapeHtml(fqdn) + '\\')">删除</button>' +
            '</div></div>';
        });
      }

      h += '</div></div>';
      return h;
    }

    async function registerSubdomain() {
      const subdomain = document.getElementById('new-subdomain').value.trim().toLowerCase();
      const domain = document.getElementById('new-domain').value;
      if (!subdomain) { toast('请输入子域名', 'error'); return; }
      if (!/^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/.test(subdomain)) { toast('子域名格式无效', 'error'); return; }
      if (subdomain.length < 2) { toast('子域名至少 2 个字符', 'error'); return; }
      if (state.config.banned_prefixes && state.config.banned_prefixes.includes(subdomain)) { toast('该子域名前缀已被禁止', 'error'); return; }

      try {
        const res = await api('/subdomains', { method: 'POST', body: JSON.stringify({ subdomain, domain }) });
        toast(res.message || '申请已提交，等待审核', 'success');
        await loadDashboardData();
        render();
      } catch (err) { toast(err.message, 'error'); }
    }

    function deleteSubdomainConfirm(id, fqdn) {
      showModal('删除子域名', '确定要删除 ' + fqdn + ' 吗？所有关联的 DNS 记录也将被删除。', async () => {
        try {
          await api('/subdomains/' + id, { method: 'DELETE' });
          toast('子域名已删除', 'success');
          await loadDashboardData();
          render();
        } catch (err) { toast(err.message, 'error'); }
      });
    }

    // ==================== DNS Manager ====================
    async function openDnsManager(subId) {
      state.currentSubdomain = subId;
      state.currentView = 'dns';
      state.editingRecord = null;
      await loadRecords(subId);
      render();
    }

    async function loadRecords(subId) {
      try {
        const data = await api('/subdomains/' + subId + '/records');
        state.records = data.records;
        state.currentSubdomainFqdn = data.subdomain;
        state.currentRecordCount = data.current_count;
        state.maxRecords = data.max_records;
      } catch (err) { toast(err.message, 'error'); }
    }

    function renderDnsManager() {
      const fqdn = state.currentSubdomainFqdn || '';
      const records = state.records || [];
      const types = state.config.allowed_record_types || ['A','AAAA','CNAME','MX','TXT','SRV','CAA'];
      const editing = state.editingRecord;

      let h = '<div class="dashboard fade-in">' +
        '<a href="#" class="back-link" onclick="navigate(\\'dashboard\\'); return false;">← 返回子域名列表</a>' +
        '<div class="dns-header"><h2>' + escapeHtml(fqdn) + ' - DNS 管理</h2></div>' +
        '<p style="font-size:13px;color:var(--text-muted);margin-bottom:20px;">记录: ' + (state.currentRecordCount||0) + ' / ' + (state.maxRecords||20) +
        ' · 名称 @ 或留空 = ' + escapeHtml(fqdn) + '，填 "www" = www.' + escapeHtml(fqdn) + '</p>';

      // Add/edit form
      h += '<div class="record-form">' +
        '<div class="record-form-title" style="display:flex;align-items:center;gap:6px">' + (editing ? icons.edit + '编辑记录' : icons.plus + '添加记录') + '</div>' +
        '<div class="form-row-3">' +
        '<div class="form-group"><label class="form-label">类型</label>' +
        '<select class="form-select" id="rec-type" onchange="onTypeChange()">' +
        types.map(t => '<option value="'+t+'"'+(editing&&editing.record_type===t?' selected':'')+'>'+t+'</option>').join('') +
        '</select></div>' +
        '<div class="form-group"><label class="form-label">名称</label>' +
        '<input class="form-input" id="rec-name" placeholder="@ 或子名称" value="'+(editing?escapeHtml(editing.name):'')+'" /></div>' +
        '<div class="form-group"><label class="form-label">内容</label>' +
        '<input class="form-input" id="rec-content" placeholder="记录值" value="'+(editing?escapeHtml(editing.content):'')+'" /></div></div>' +
        '<div class="form-row">' +
        '<div class="form-group"><label class="form-label">TTL</label>' +
        '<select class="form-select" id="rec-ttl">' +
        '<option value="1"'+(editing&&editing.ttl===1?' selected':'')+'>自动</option>' +
        '<option value="60"'+(editing&&editing.ttl===60?' selected':'')+'>1 分钟</option>' +
        '<option value="300"'+(editing&&editing.ttl===300?' selected':'')+'>5 分钟</option>' +
        '<option value="3600"'+(editing&&editing.ttl===3600?' selected':'')+'>1 小时</option>' +
        '<option value="86400"'+(editing&&editing.ttl===86400?' selected':'')+'>1 天</option>' +
        '</select></div>' +
        '<div class="form-group" id="priority-group" style="display:none"><label class="form-label">优先级</label>' +
        '<input class="form-input" type="number" id="rec-priority" placeholder="10" value="'+(editing&&editing.priority!==null?editing.priority:'10')+'" /></div></div>' +
        '<div style="display:flex;align-items:center;justify-content:space-between;margin-top:12px">' +
        '<label class="checkbox-label"><input type="checkbox" id="rec-proxied"'+(editing&&editing.proxied?' checked':'')+'> Cloudflare 代理 (A/AAAA/CNAME)</label>' +
        '<div style="display:flex;gap:8px">' +
        (editing?'<button class="btn btn-secondary btn-sm" onclick="cancelEdit()">取消</button>':'') +
        '<button class="btn btn-primary btn-sm" onclick="'+(editing?'updateRecord()':'addRecord()')+'">'+(editing?'更新':'添加')+'</button>' +
        '</div></div></div>';

      if (records.length > 0) {
        h += '<div class="card"><div class="table-wrap"><table>' +
          '<thead><tr><th>类型</th><th>名称</th><th>内容</th><th>TTL</th><th>代理</th><th>操作</th></tr></thead><tbody>';
        records.forEach(r => {
          const ttl = r.ttl===1?'自动':(r.ttl>=3600?(r.ttl/3600)+'h':(r.ttl>=60?(r.ttl/60)+'m':r.ttl+'s'));
          h += '<tr><td><span class="badge badge-type">'+escapeHtml(r.record_type)+'</span></td>' +
            '<td class="mono">'+escapeHtml(r.name)+'</td>' +
            '<td class="mono" style="max-width:240px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="'+escapeHtml(r.content)+'">'+escapeHtml(r.content)+'</td>' +
            '<td>'+ttl+'</td>' +
            '<td>'+(r.proxied?'<span class="badge badge-proxied">已代理</span>':'—')+'</td>' +
            '<td><div style="display:flex;gap:4px">' +
            '<button class="btn btn-ghost btn-sm" onclick="editRecord('+r.id+')" title="编辑" style="display:flex">' + icons.edit + '</button>' +
            '<button class="btn btn-ghost btn-sm" onclick="deleteRecordConfirm('+r.id+',\\''+escapeHtml(r.name)+'\\',\\''+escapeHtml(r.record_type)+'\\')" title="删除" style="display:flex">' + icons.trash + '</button>' +
            '</div></td></tr>';
        });
        h += '</tbody></table></div></div>';
      } else {
        h += '<div class="card empty"><div class="empty-icon">' + icons.clipboard + '</div><p>还没有 DNS 记录</p></div>';
      }
      h += '</div>';
      return h;
    }

    function onTypeChange() {
      const t = document.getElementById('rec-type').value;
      document.getElementById('priority-group').style.display = (t==='MX'||t==='SRV')?'block':'none';
    }

    async function addRecord() {
      const type = document.getElementById('rec-type').value;
      const name = document.getElementById('rec-name').value.trim() || '@';
      const content = document.getElementById('rec-content').value.trim();
      const ttl = parseInt(document.getElementById('rec-ttl').value);
      const priority = parseInt(document.getElementById('rec-priority')?.value) || 10;
      const proxied = document.getElementById('rec-proxied').checked;
      if (!content) { toast('请填写记录内容', 'error'); return; }
      const body = { type, name, content, ttl, proxied };
      if (type==='MX'||type==='SRV') body.priority = priority;
      try {
        await api('/subdomains/'+state.currentSubdomain+'/records', { method:'POST', body:JSON.stringify(body) });
        toast('DNS 记录已添加', 'success');
        await loadRecords(state.currentSubdomain);
        render();
      } catch (err) { toast(err.message, 'error'); }
    }

    function editRecord(id) {
      const r = state.records.find(r => r.id===id);
      if (!r) return;
      state.editingRecord = r;
      render();
      setTimeout(() => onTypeChange(), 0);
    }

    function cancelEdit() { state.editingRecord = null; render(); }

    async function updateRecord() {
      const editing = state.editingRecord; if (!editing) return;
      const type = document.getElementById('rec-type').value;
      const name = document.getElementById('rec-name').value.trim() || '@';
      const content = document.getElementById('rec-content').value.trim();
      const ttl = parseInt(document.getElementById('rec-ttl').value);
      const priority = parseInt(document.getElementById('rec-priority')?.value) || 10;
      const proxied = document.getElementById('rec-proxied').checked;
      if (!content) { toast('请填写记录内容', 'error'); return; }
      const body = { type, name, content, ttl, proxied };
      if (type==='MX'||type==='SRV') body.priority = priority;
      try {
        await api('/subdomains/'+state.currentSubdomain+'/records/'+editing.id, { method:'PUT', body:JSON.stringify(body) });
        toast('已更新', 'success');
        state.editingRecord = null;
        await loadRecords(state.currentSubdomain);
        render();
      } catch (err) { toast(err.message, 'error'); }
    }

    function deleteRecordConfirm(id, name, type) {
      showModal('删除 DNS 记录', '确定删除 '+type+' 记录 "'+name+'" 吗？', async () => {
        try {
          await api('/subdomains/'+state.currentSubdomain+'/records/'+id, { method:'DELETE' });
          toast('已删除', 'success');
          await loadRecords(state.currentSubdomain);
          render();
        } catch (err) { toast(err.message, 'error'); }
      });
    }

    // ==================== Admin Panel ====================
    async function loadAdminData() {
      try {
        const [pendingData, allData, userData] = await Promise.all([
          api('/admin/pending'),
          api('/admin/subdomains'),
          api('/admin/users'),
        ]);
        state.adminPending = pendingData.subdomains;
        state.adminAll = allData.subdomains;
        state.adminUsers = userData.users;
      } catch (err) { toast(err.message, 'error'); }
    }

    function renderAdminPanel() {
      const pendingCount = state.adminPending.length;

      let h = '<div class="dashboard fade-in">' +
        '<a href="#" class="back-link" onclick="navigate(\\'dashboard\\'); return false;">← 返回面板</a>' +
        '<div class="section-header" style="margin-top:16px"><h2 class="section-title" style="display:flex;align-items:center;gap:8px">' + icons.admin + ' 管理员面板</h2></div>';

      // Tabs
      h += '<div class="tabs">' +
        '<button class="tab'+(state.adminTab==='pending'?' active':'')+'" onclick="switchAdminTab(\\'pending\\')">待审核' +
        (pendingCount > 0 ? '<span class="tab-count">'+pendingCount+'</span>' : '') + '</button>' +
        '<button class="tab'+(state.adminTab==='all'?' active':'')+'" onclick="switchAdminTab(\\'all\\')">所有子域名</button>' +
        '<button class="tab'+(state.adminTab==='users'?' active':'')+'" onclick="switchAdminTab(\\'users\\')">用户管理</button>' +
        '</div>';

      if (state.adminTab === 'pending') {
        h += renderAdminPending();
      } else if (state.adminTab === 'all') {
        h += renderAdminAll();
      } else {
        h += renderAdminUsers();
      }

      h += '</div>';
      return h;
    }

    function renderAdminPending() {
      const items = state.adminPending;
      if (items.length === 0) {
        return '<div class="card empty"><div class="empty-icon">' + icons.clipboard + '</div><p>暂无待审核的申请</p></div>';
      }

      let h = '';
      items.forEach(sub => {
        const fqdn = sub.subdomain + '.' + sub.domain;
        h += '<div class="card card-hover review-card" style="margin-bottom:10px;padding:20px;">' +
          '<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px">' +
          '<div>' +
          '<h4 style="font-family:var(--font-mono);font-size:16px;font-weight:600">' + escapeHtml(fqdn) + '</h4>' +
          '<div class="review-meta">' +
          '<span style="display:flex;align-items:center">' + icons.user + ' ' + escapeHtml(sub.github_username) + '</span>' +
          '<span style="display:flex;align-items:center">' + icons.calendar + ' ' + new Date(sub.created_at).toLocaleString('zh-CN') + '</span>' +
          (sub.email ? '<span style="display:flex;align-items:center">' + icons.email + ' ' + escapeHtml(sub.email) + '</span>' : '') +
          '</div></div>' +
          '<div style="display:flex;gap:8px">' +
          '<button class="btn btn-success btn-sm" onclick="approveSubdomain('+sub.id+',\\''+escapeHtml(fqdn)+'\\')">' + icons.approved + ' 通过</button>' +
          '<button class="btn btn-danger btn-sm" onclick="rejectSubdomainModal('+sub.id+',\\''+escapeHtml(fqdn)+'\\')">' + icons.rejected + ' 拒绝</button>' +
          '</div></div></div>';
      });
      return h;
    }

    function renderAdminAll() {
      const items = state.adminAll;
      if (items.length === 0) {
        return '<div class="card empty"><div class="empty-icon">' + icons.clipboard + '</div><p>暂无子域名记录</p></div>';
      }

      let h = '<div class="card"><div class="table-wrap"><table>' +
        '<thead><tr><th>子域名</th><th>用户</th><th>状态</th><th>创建时间</th><th>操作</th></tr></thead><tbody>';
      items.forEach(sub => {
        const fqdn = sub.subdomain + '.' + sub.domain;
        h += '<tr><td class="mono">' + escapeHtml(fqdn) + '</td>' +
          '<td>' + escapeHtml(sub.github_username) + '</td>' +
          '<td>' + statusBadge(sub.status) + '</td>' +
          '<td>' + new Date(sub.created_at).toLocaleDateString('zh-CN') + '</td>' +
          '<td><button class="btn btn-danger btn-sm" onclick="adminDeleteSubdomain('+sub.id+',\\''+escapeHtml(fqdn)+'\\')">删除</button></td></tr>';
      });
      h += '</tbody></table></div></div>';
      return h;
    }

    function renderAdminUsers() {
      const users = state.adminUsers;
      if (users.length === 0) {
        return '<div class="card empty"><div class="empty-icon">' + icons.users + '</div><p>暂无用户</p></div>';
      }

      let h = '<div class="card"><div class="table-wrap"><table>' +
        '<thead><tr><th>头像</th><th>用户名</th><th>邮箱</th><th>身份</th><th>注册时间</th></tr></thead><tbody>';
      users.forEach(u => {
        h += '<tr><td><img src="'+(u.avatar_url||'')+'" style="width:28px;height:28px;border-radius:50%"></td>' +
          '<td>'+escapeHtml(u.github_username)+'</td>' +
          '<td class="mono">'+(u.email? escapeHtml(u.email):'—')+'</td>' +
          '<td>'+(u.is_admin?'<span class="badge badge-approved">管理员</span>':'用户')+'</td>' +
          '<td>'+new Date(u.created_at).toLocaleDateString('zh-CN')+'</td></tr>';
      });
      h += '</tbody></table></div></div>';
      return h;
    }

    function switchAdminTab(tab) {
      state.adminTab = tab;
      render();
    }

    async function approveSubdomain(id, fqdn) {
      showModal('审核通过', '确定通过 ' + fqdn + ' 的申请吗？通过后用户即可管理 DNS 记录。', async () => {
        try {
          await api('/admin/subdomains/'+id+'/approve', { method:'POST', body:'{}' });
          toast('已通过审核', 'success');
          await loadAdminData();
          render();
        } catch (err) { toast(err.message, 'error'); }
      }, { confirmText: '通过', confirmClass: 'btn-success' });
    }

    function rejectSubdomainModal(id, fqdn) {
      showModal(
        '拒绝申请',
        '请填写拒绝 ' + fqdn + ' 的原因：',
        async () => {
          const reason = document.getElementById('reject-reason')?.value?.trim();
          if (!reason) { toast('请填写拒绝原因', 'error'); return; }
          try {
            await api('/admin/subdomains/'+id+'/reject', {
              method: 'POST',
              body: JSON.stringify({ reason }),
            });
            toast('已拒绝', 'success');
            await loadAdminData();
            render();
          } catch (err) { toast(err.message, 'error'); }
        },
        {
          bodyHtml: '<textarea class="form-input" id="reject-reason" placeholder="请输入拒绝原因..." style="resize:vertical;min-height:80px;margin-bottom:12px"></textarea>',
          confirmText: '拒绝',
          confirmClass: 'btn-danger',
        }
      );
    }

    async function adminDeleteSubdomain(id, fqdn) {
      showModal('管理员删除', '确定删除 ' + fqdn + ' 吗？此操作不可恢复。', async () => {
        try {
          await api('/admin/subdomains/'+id, { method:'DELETE' });
          toast('已删除', 'success');
          await loadAdminData();
          render();
        } catch (err) { toast(err.message, 'error'); }
      });
    }

    // ==================== Main Render ====================
    function render() {
      const app = document.getElementById('app');
      if (!state.user) { app.innerHTML = renderLanding(); return; }
      switch (state.currentView) {
        case 'dns':
          app.innerHTML = renderDnsManager();
          setTimeout(() => onTypeChange(), 0);
          break;
        case 'admin':
          app.innerHTML = renderAdminPanel();
          break;
        case 'dashboard':
        default:
          app.innerHTML = renderDashboard();
          break;
      }
    }

    // ==================== Init ====================
    async function init() {
      setTheme(getTheme());
      renderHeaderUser();
      if (state.user) {
        state.currentView = 'dashboard';
        await loadDashboardData();
        if (state.user.is_admin) {
          loadAdminData(); // preload admin data
        }
      }
      render();
    }

    init();
  </script>

  <footer class="footer">
    <div class="container"><p>Powered by Cloudflare Workers & D1</p></div>
  </footer>
</body>
</html>`;
}

export default pages;
