export default function MemoryViewer({ items, type }) {
  if (!items || items.length === 0) {
    return (
      <div className="memory-empty">
        <div className="memory-empty__icon">
          {type === 'comet' ? '🧠' : '📦'}
        </div>
        <div>No {type === 'comet' ? 'CoMeT' : 'GCRI'} memory items found.</div>
        <div style={{ fontSize: 11, marginTop: 4 }}>
          {type === 'comet'
            ? 'Memory nodes will appear as conversations are processed.'
            : 'Rules and knowledge will appear after GCRI tasks complete.'}
        </div>
      </div>
    );
  }

  if (type === 'gcri') {
    return (
      <div>
        {items.map((item, index) => (
          <div key={index} className="memory-item">
            <div className="memory-item__title">{item.title || item.rule || 'Rule'}</div>
            {item.content && (
              <div style={{
                fontSize: 12,
                color: 'var(--text-secondary)',
                marginTop: 4,
                lineHeight: 1.5,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}>
                {item.content.length > 200
                  ? item.content.slice(0, 200) + '...'
                  : item.content}
              </div>
            )}
            <div className="memory-item__meta">
              {item.type && <span>{item.type}</span>}
              {item.domain && <span> · {item.domain}</span>}
              {item.created_at && item.created_at !== 'unknown' && (
                <span> · {item.created_at.slice(0, 10)}</span>
              )}
            </div>
            {item.tags && item.tags.length > 0 && (
              <div className="memory-item__tags">
                {item.tags.map((tag, tagIndex) => (
                  <span key={tagIndex} className="memory-tag">{tag}</span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div>
      {items.map((node, index) => (
        <div key={index} className="memory-item">
          <div className="memory-item__title">
            {node.summary || node.node_id || `Node ${index}`}
          </div>
          {node.trigger && (
            <div style={{
              fontSize: 11,
              color: 'var(--text-tertiary)',
              marginTop: 2,
              fontStyle: 'italic',
            }}>
              ⚡ {node.trigger}
            </div>
          )}
          <div className="memory-item__meta">
            {node.session_id && (
              <span title={node.session_id}>
                🔗 {node.session_id.slice(0, 8)}…
              </span>
            )}
            {node.recall_mode && node.recall_mode !== 'active' && (
              <span> · {node.recall_mode}</span>
            )}
            {node.created_at && (
              <span> · {node.created_at.slice(0, 10)}</span>
            )}
          </div>
          {node.topic_tags && node.topic_tags.length > 0 && (
            <div className="memory-item__tags">
              {node.topic_tags.map((tag, tagIndex) => (
                <span key={tagIndex} className="memory-tag">{tag}</span>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
