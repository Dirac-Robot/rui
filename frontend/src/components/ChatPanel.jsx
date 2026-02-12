import { useState, useRef, useEffect } from 'react';
import GcriProposalCard from './GcriProposalCard';

export default function ChatPanel({
  messages,
  onSendMessage,
  onEditMessage,
  onNewChat,
  onSwitchSession,
  onDeleteSession,
  onConfirmTask,
  sessions,
  activeSessionId,
  isConnected,
  isWaitingResponse,
}) {
  const [input, setInput] = useState('');
  const [editIndex, setEditIndex] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [showSessionList, setShowSessionList] = useState(false);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const editRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (editIndex !== null && editRef.current) {
      editRef.current.focus();
      editRef.current.style.height = 'auto';
      editRef.current.style.height = editRef.current.scrollHeight + 'px';
    }
  }, [editIndex]);

  function handleSubmit(event) {
    event.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) return;
    onSendMessage(trimmed);
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }

  function handleKeyDown(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSubmit(event);
    }
  }

  function handleInputChange(event) {
    setInput(event.target.value);
    const textarea = event.target;
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
  }

  function startEdit(index) {
    setEditIndex(index);
    setEditValue(messages[index].content);
  }

  function cancelEdit() {
    setEditIndex(null);
    setEditValue('');
  }

  function confirmEdit() {
    if (editIndex === null) return;
    const trimmed = editValue.trim();
    if (!trimmed) return;
    onEditMessage(editIndex, trimmed);
    setEditIndex(null);
    setEditValue('');
  }

  function handleEditKeyDown(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      confirmEdit();
    }
    if (event.key === 'Escape') {
      cancelEdit();
    }
  }

  return (
    <div className="chat-panel">
      <div className="chat-panel__header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="chat-panel__logo">RUI</div>
          <button
            onClick={onNewChat}
            title="New Chat"
            style={{
              padding: '4px 10px',
              fontSize: 12,
              fontWeight: 600,
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--surface-border)',
              background: 'transparent',
              color: 'var(--accent-cyan)',
              cursor: 'pointer',
              transition: 'all var(--transition-fast)',
            }}
          >+ New</button>
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowSessionList(!showSessionList)}
              title="Session list"
              style={{
                padding: '4px 8px',
                fontSize: 12,
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--surface-border)',
                background: showSessionList ? 'var(--bg-tertiary)' : 'transparent',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                transition: 'all var(--transition-fast)',
              }}
            >▾ Sessions</button>
            {showSessionList && (
              <div style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                marginTop: 4,
                width: 280,
                maxHeight: 320,
                overflowY: 'auto',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--surface-border)',
                borderRadius: 'var(--radius-md)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                zIndex: 100,
                padding: 4,
              }}>
                {sessions.map((session) => (
                  <div
                    key={session.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '8px 10px',
                      borderRadius: 'var(--radius-sm)',
                      cursor: 'pointer',
                      background: session.id === activeSessionId ? 'var(--bg-tertiary)' : 'transparent',
                      transition: 'background var(--transition-fast)',
                    }}
                    onClick={() => {
                      onSwitchSession(session.id);
                      setShowSessionList(false);
                    }}
                  >
                    <div style={{
                      flex: 1,
                      fontSize: 12,
                      color: session.id === activeSessionId ? 'var(--text-primary)' : 'var(--text-secondary)',
                      fontWeight: session.id === activeSessionId ? 600 : 400,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {session.title || 'New Chat'}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>
                      {new Date(session.createdAt).toLocaleDateString()}
                    </div>
                    <button
                      onClick={(event) => {
                        event.stopPropagation();
                        onDeleteSession(session.id);
                      }}
                      title="Delete session"
                      style={{
                        padding: '2px 5px',
                        fontSize: 10,
                        borderRadius: 'var(--radius-sm)',
                        border: 'none',
                        background: 'transparent',
                        color: 'var(--text-tertiary)',
                        cursor: 'pointer',
                      }}
                    >✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="chat-panel__status">
          {isConnected ? '● connected' : '○ disconnected'}
        </div>
      </div>

      <div className="chat-messages">
        {messages.length === 0 && (
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
            color: 'var(--text-tertiary)',
          }}>
            <div style={{ fontSize: 40, opacity: 0.3 }}>🔬</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-secondary)' }}>
              Research UI
            </div>
            <div style={{ fontSize: 13, maxWidth: 340, textAlign: 'center', lineHeight: 1.6 }}>
              Start a conversation to discuss your task. When ready, the assistant will coordinate GCRI execution with your configured branches.
            </div>
          </div>
        )}
        {messages.map((message, index) => (
          <div key={index} className={`chat-message chat-message--${message.role}`}>
            <div className="chat-message__role">
              {message.role === 'user' ? 'You' : message.role === 'assistant' ? 'RUI' : 'System'}
            </div>
            {editIndex === index ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
                <textarea
                  ref={editRef}
                  value={editValue}
                  onChange={(event) => {
                    setEditValue(event.target.value);
                    event.target.style.height = 'auto';
                    event.target.style.height = event.target.scrollHeight + 'px';
                  }}
                  onKeyDown={handleEditKeyDown}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    fontSize: 13,
                    lineHeight: 1.5,
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--accent-cyan)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--text-primary)',
                    resize: 'none',
                    outline: 'none',
                    fontFamily: 'inherit',
                    boxSizing: 'border-box',
                  }}
                />
                <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                  <button onClick={cancelEdit} style={{
                    padding: '4px 10px', fontSize: 11, borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--surface-border)', background: 'transparent',
                    color: 'var(--text-secondary)', cursor: 'pointer',
                  }}>Cancel</button>
                  <button onClick={confirmEdit} style={{
                    padding: '4px 10px', fontSize: 11, fontWeight: 600, borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--accent-cyan)', background: 'var(--accent-cyan)',
                    color: 'var(--bg-primary)', cursor: 'pointer',
                  }}>Send</button>
                </div>
              </div>
            ) : (
              <div style={{ position: 'relative', width: '100%' }} className="chat-message__content">
                {message.content && <div>{message.content}</div>}
                {message.proposal && (
                  <GcriProposalCard
                    scheme={message.proposal}
                    onConfirm={onConfirmTask}
                    confirmed={message.proposalConfirmed}
                  />
                )}
                {message.role === 'user' && (
                  <button
                    className="edit-btn"
                    onClick={() => startEdit(index)}
                    title="Edit message"
                    style={{
                      position: 'absolute',
                      top: -2,
                      right: -2,
                      padding: '2px 6px',
                      fontSize: 11,
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--surface-border)',
                      background: 'var(--bg-secondary)',
                      color: 'var(--text-tertiary)',
                      cursor: 'pointer',
                      opacity: 0,
                      transition: 'opacity var(--transition-fast)',
                    }}
                  >✏️</button>
                )}
              </div>
            )}
          </div>
        ))}
        {isWaitingResponse && (
          <div className="chat-message chat-message--assistant">
            <div className="chat-message__role">RUI</div>
            <div>
              <span className="loading-dot" />
              <span className="loading-dot" />
              <span className="loading-dot" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input-area">
        <form className="chat-input-wrapper" onSubmit={handleSubmit}>
          <textarea
            ref={textareaRef}
            className="chat-input"
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Describe your research task..."
            rows={1}
          />
          <button
            type="submit"
            className="chat-send-btn"
            disabled={!input.trim()}
          >
            ↑
          </button>
        </form>
      </div>
    </div>
  );
}
