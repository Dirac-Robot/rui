import { useState } from 'react';

const PROVIDER_LABELS = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  google: 'Google AI',
};

const PROVIDER_PLACEHOLDERS = {
  openai: 'sk-...',
  anthropic: 'sk-ant-...',
  google: 'AIza...',
};

export default function ApiKeyModal({ missingProviders, onSubmit, onCancel }) {
  const [keys, setKeys] = useState(() => {
    const initial = {};
    for (const provider of missingProviders) {
      initial[provider] = '';
    }
    return initial;
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleChange(provider, value) {
    setKeys((prev) => ({ ...prev, [provider]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      await onSubmit(keys);
    } finally {
      setIsSubmitting(false);
    }
  }

  const allFilled = missingProviders.every((p) => keys[p]?.trim());

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <span style={{ fontSize: 16 }}>🔑</span>
          <span style={{ fontWeight: 600, fontSize: 14 }}>API Keys Required</span>
        </div>
        <p style={{
          fontSize: 12,
          color: 'var(--text-tertiary)',
          margin: '0 0 16px',
          lineHeight: 1.6,
        }}>
          The following API keys are needed for the models you selected.
          Keys are stored in memory only and never persisted to disk.
        </p>
        <form onSubmit={handleSubmit}>
          {missingProviders.map((provider) => (
            <div key={provider} style={{ marginBottom: 12 }}>
              <label style={{
                display: 'block',
                fontSize: 11,
                fontWeight: 600,
                color: 'var(--text-secondary)',
                marginBottom: 4,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}>
                {PROVIDER_LABELS[provider] || provider}
              </label>
              <input
                type="password"
                autoComplete="off"
                spellCheck="false"
                placeholder={PROVIDER_PLACEHOLDERS[provider] || 'Enter API key'}
                value={keys[provider]}
                onChange={(event) => handleChange(provider, event.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--surface-border)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-primary)',
                  fontSize: 13,
                  fontFamily: 'var(--font-mono)',
                  outline: 'none',
                  boxSizing: 'border-box',
                  transition: 'border-color var(--transition-fast)',
                }}
                onFocus={(event) => { event.target.style.borderColor = 'var(--accent-cyan)'; }}
                onBlur={(event) => { event.target.style.borderColor = 'var(--surface-border)'; }}
              />
            </div>
          ))}
          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <button
              type="button"
              onClick={onCancel}
              style={{
                flex: 1,
                padding: '8px 12px',
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--surface-border)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-secondary)',
                fontSize: 12,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!allFilled || isSubmitting}
              style={{
                flex: 1,
                padding: '8px 12px',
                background: allFilled ? 'var(--accent-cyan)' : 'var(--bg-tertiary)',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                color: allFilled ? 'var(--bg-primary)' : 'var(--text-tertiary)',
                fontSize: 12,
                fontWeight: 600,
                cursor: allFilled ? 'pointer' : 'not-allowed',
                transition: 'all var(--transition-fast)',
              }}
            >
              {isSubmitting ? 'Saving...' : 'Save Keys'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
