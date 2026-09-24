import { useMemo, useState } from 'react';
import { Layout } from '../components/Layout';
import {
  DAILY_LIMIT,
  DEFAULT_BASE_URL,
  clearImageGenPrefs,
  getDailyCount,
  isConfigured,
  loadImageGenPrefs,
  saveImageGenPrefs,
  type ImageGenPrefs,
} from '../lib/imageGen';

function EyeOpenIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"
        stroke="#9CA3AF"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="3" stroke="#9CA3AF" strokeWidth="1.75" />
    </svg>
  );
}

function EyeClosedIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M3 3l18 18M10.6 10.7a3 3 0 004.2 4.2M9.5 5.5C10.3 5.2 11.1 5 12 5c6.5 0 10 7 10 7a17.6 17.6 0 01-4.2 4.6M6.1 6.1A17.3 17.3 0 002 12s3.5 7 10 7c1.3 0 2.5-.3 3.6-.7"
        stroke="#9CA3AF"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Settings() {
  const initial = useMemo(() => loadImageGenPrefs(), []);
  const [baseUrl, setBaseUrl] = useState(initial.baseUrl || DEFAULT_BASE_URL);
  const [apiKey, setApiKey] = useState(initial.apiKey);
  const [showKey, setShowKey] = useState(false);
  const [savedPrefs, setSavedPrefs] = useState<ImageGenPrefs>(initial);
  const [dailyCount, setDailyCount] = useState(() => getDailyCount());
  const [savedFlash, setSavedFlash] = useState(false);

  const configured = isConfigured(savedPrefs);

  const onSave = () => {
    const next: ImageGenPrefs = {
      baseUrl: baseUrl.trim() || DEFAULT_BASE_URL,
      apiKey: apiKey.trim(),
    };
    saveImageGenPrefs(next);
    setSavedPrefs(next);
    setBaseUrl(next.baseUrl);
    setApiKey(next.apiKey);
    setDailyCount(getDailyCount());
    setSavedFlash(true);
    window.setTimeout(() => setSavedFlash(false), 1200);
  };

  const onClear = () => {
    clearImageGenPrefs();
    const empty: ImageGenPrefs = { baseUrl: DEFAULT_BASE_URL, apiKey: '' };
    setSavedPrefs(empty);
    setBaseUrl(DEFAULT_BASE_URL);
    setApiKey('');
    setShowKey(false);
    setDailyCount(getDailyCount());
  };

  return (
    <Layout title="设置">
      <div className="card stack" style={{ position: 'relative' }}>
        <div
          style={{
            position: 'absolute',
            top: 16,
            right: 16,
            fontSize: 12,
            fontWeight: 700,
            padding: '4px 10px',
            borderRadius: 999,
            background: configured ? 'rgba(34,197,94,0.14)' : '#F1F5F9',
            color: configured ? 'var(--color-success)' : 'var(--color-text-secondary)',
          }}
        >
          {configured ? '已配置' : '未配置'}
        </div>

        <div style={{ paddingRight: 72 }}>
          <div style={{ fontWeight: 700 }}>生图服务（可选）</div>
          <p className="muted" style={{ marginTop: 4 }}>
            不填也能用，会显示示意图
          </p>
        </div>

        <label className="stack" style={{ gap: 6 }}>
          <span style={{ fontWeight: 600, fontSize: 14 }}>接口地址</span>
          <input
            className="input-field"
            type="url"
            autoComplete="off"
            spellCheck={false}
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder={DEFAULT_BASE_URL}
          />
        </label>

        <label className="stack" style={{ gap: 6 }}>
          <span style={{ fontWeight: 600, fontSize: 14 }}>API Key</span>
          <div style={{ position: 'relative' }}>
            <input
              className="input-field"
              type={showKey ? 'text' : 'password'}
              autoComplete="off"
              spellCheck={false}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-…"
              style={{ paddingRight: 44 }}
            />
            <button
              type="button"
              aria-label={showKey ? '隐藏 Key' : '显示 Key'}
              onClick={() => setShowKey((v) => !v)}
              style={{
                position: 'absolute',
                right: 8,
                top: '50%',
                transform: 'translateY(-50%)',
                width: 32,
                height: 32,
                display: 'grid',
                placeItems: 'center',
                borderRadius: 8,
                padding: 0,
              }}
            >
              {showKey ? <EyeClosedIcon /> : <EyeOpenIcon />}
            </button>
          </div>
        </label>

        <button type="button" className="btn-primary" onClick={onSave}>
          {savedFlash ? '已保存' : '保存'}
        </button>
        <button
          type="button"
          onClick={onClear}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--color-text-secondary)',
            fontWeight: 600,
            fontSize: 14,
            padding: '4px 0',
            cursor: 'pointer',
          }}
        >
          清除
        </button>

        <div className="stack" style={{ gap: 4, marginTop: 4 }}>
          <p className="muted" style={{ margin: 0 }}>
            Key 只存在本机浏览器，只在生成画面时发给你填的接口
          </p>
          <p className="muted" style={{ margin: 0 }}>
            今日已生成 {dailyCount} / {DAILY_LIMIT}
          </p>
        </div>
      </div>
    </Layout>
  );
}
