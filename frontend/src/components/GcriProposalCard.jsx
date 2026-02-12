export default function GcriProposalCard({ scheme, onConfirm, confirmed }) {
  return (
    <div style={{
      marginTop: 10,
      padding: '14px 16px',
      background: 'linear-gradient(135deg, rgba(30,38,55,0.95), rgba(22,28,40,0.98))',
      border: '1px solid rgba(0,210,255,0.2)',
      borderRadius: 'var(--radius-md)',
      backdropFilter: 'blur(12px)',
      boxShadow: '0 4px 20px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.04)',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        marginBottom: 10,
        fontSize: 12,
        fontWeight: 700,
        color: 'var(--accent-cyan)',
        letterSpacing: '0.5px',
        textTransform: 'uppercase',
      }}>
        ⚡ GCRI Task Proposal
      </div>

      <div style={{
        fontSize: 13,
        lineHeight: 1.6,
        color: 'var(--text-primary)',
        marginBottom: 12,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
      }}>
        {scheme.task_description}
      </div>

      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 6,
        marginBottom: 12,
      }}>
        <span style={tagStyle}>
          {scheme.branch_count} branches
        </span>
        {scheme.branch_models?.map((model, index) => (
          <span key={index} style={{
            ...tagStyle,
            background: 'rgba(139,92,246,0.15)',
            color: '#a78bfa',
            borderColor: 'rgba(139,92,246,0.25)',
          }}>
            {model}
          </span>
        ))}
        <span style={{
          ...tagStyle,
          background: scheme.commit_mode === 'auto-accept'
            ? 'rgba(34,197,94,0.15)'
            : 'rgba(251,191,36,0.15)',
          color: scheme.commit_mode === 'auto-accept' ? '#4ade80' : '#fbbf24',
          borderColor: scheme.commit_mode === 'auto-accept'
            ? 'rgba(34,197,94,0.25)'
            : 'rgba(251,191,36,0.25)',
        }}>
          {scheme.commit_mode || 'manual'}
        </span>
      </div>

      {confirmed ? (
        <div style={{
          padding: '8px 14px',
          fontSize: 12,
          fontWeight: 600,
          color: '#4ade80',
          background: 'rgba(34,197,94,0.1)',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid rgba(34,197,94,0.25)',
          textAlign: 'center',
        }}>
          ✓ Task Started
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => onConfirm(scheme)}
            style={{
              flex: 1,
              padding: '8px 16px',
              fontSize: 12,
              fontWeight: 700,
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--accent-cyan)',
              background: 'var(--accent-cyan)',
              color: 'var(--bg-primary)',
              cursor: 'pointer',
              transition: 'all var(--transition-fast)',
              letterSpacing: '0.3px',
            }}
          >
            Start Execution
          </button>
        </div>
      )}
    </div>
  );
}

const tagStyle = {
  padding: '3px 8px',
  fontSize: 11,
  fontWeight: 500,
  borderRadius: 'var(--radius-sm)',
  background: 'rgba(0,210,255,0.1)',
  color: 'var(--accent-cyan)',
  border: '1px solid rgba(0,210,255,0.15)',
};
