import { useState, useEffect, useCallback } from 'react';
import TaskCard from './TaskCard';
import MemoryViewer from './MemoryViewer';
import {
  fetchCometMemory,
  fetchCometSessions,
  fetchCometSessionNodes,
  fetchGcriMemory,
  abortTask,
} from '../utils/api';

export default function ProgressSidebar({ taskState, isRunning }) {
  const [activeTab, setActiveTab] = useState('progress');
  const [memoryTab, setMemoryTab] = useState('comet');
  const [cometMemory, setCometMemory] = useState([]);
  const [gcriMemory, setGcriMemory] = useState([]);
  const [cometSessions, setCometSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState('all');
  const [memoryLoading, setMemoryLoading] = useState(false);
  const [memoryError, setMemoryError] = useState(null);

  const loadMemory = useCallback(async (tab, sessionFilter) => {
    setMemoryLoading(true);
    setMemoryError(null);
    try {
      if (tab === 'comet') {
        const sessData = await fetchCometSessions();
        setCometSessions(sessData.sessions || []);

        if (sessionFilter && sessionFilter !== 'all') {
          const data = await fetchCometSessionNodes(sessionFilter);
          setCometMemory(data.nodes || []);
        } else {
          const data = await fetchCometMemory();
          setCometMemory(data.nodes || []);
        }
      } else {
        const data = await fetchGcriMemory();
        const items = [];
        if (data.global_rules) {
          data.global_rules.forEach((rule) => {
            items.push({ rule, type: 'rule', domain: 'global' });
          });
        }
        if (data.domain_rules) {
          Object.entries(data.domain_rules).forEach(([domain, rules]) => {
            rules.forEach((rule) => {
              items.push({ rule, type: 'rule', domain });
            });
          });
        }
        if (data.knowledge) {
          Object.entries(data.knowledge).forEach(([domain, knowledgeList]) => {
            knowledgeList.forEach((item) => {
              items.push({ ...item, domain });
            });
          });
        }
        setGcriMemory(items);
      }
    } catch (error) {
      setMemoryError(`Failed to load ${tab} memory: ${error.message || 'server unavailable'}`);
    } finally {
      setMemoryLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'memory') {
      loadMemory(memoryTab, selectedSession);
    }
  }, [activeTab, memoryTab, selectedSession, loadMemory]);

  function handleSessionChange(event) {
    setSelectedSession(event.target.value);
  }

  return (
    <div className="sidebar sidebar--right">
      <div className="sidebar__header">
        <div className="sidebar__title">Progress & Memory</div>
      </div>
      <div className="sidebar__content">
        <div className="tabs">
          <button
            className={`tab ${activeTab === 'progress' ? 'tab--active' : ''}`}
            onClick={() => setActiveTab('progress')}
          >
            Tasks
          </button>
          <button
            className={`tab ${activeTab === 'memory' ? 'tab--active' : ''}`}
            onClick={() => setActiveTab('memory')}
          >
            Memory
          </button>
        </div>

        {activeTab === 'progress' && (
          <div>
            {isRunning && (
              <button
                onClick={async () => {
                  try { await abortTask(); } catch (e) { /* ignore */ }
                }}
                style={{
                  width: '100%',
                  padding: '10px',
                  marginBottom: 12,
                  background: 'rgba(248, 81, 73, 0.12)',
                  border: '1px solid rgba(248, 81, 73, 0.4)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--accent-red, #f85149)',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  transition: 'background 0.15s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(248, 81, 73, 0.22)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(248, 81, 73, 0.12)'}
              >
                🛑 Stop GCRI
              </button>
            )}
            {taskState.tasks && taskState.tasks.length > 0 ? (
              taskState.tasks.map((task, index) => (
                <TaskCard key={index} task={task} />
              ))
            ) : (
              <div className="memory-empty">
                <div className="memory-empty__icon">⚡</div>
                <div>No active tasks.</div>
                <div style={{ fontSize: 11, marginTop: 4 }}>
                  Start a conversation and discuss your task to begin GCRI execution.
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'memory' && (
          <div>
            <div className="tabs" style={{ marginBottom: 10 }}>
              <button
                className={`tab ${memoryTab === 'comet' ? 'tab--active' : ''}`}
                onClick={() => setMemoryTab('comet')}
              >
                🧠 CoMeT
              </button>
              <button
                className={`tab ${memoryTab === 'gcri' ? 'tab--active' : ''}`}
                onClick={() => setMemoryTab('gcri')}
              >
                📦 GCRI
              </button>
            </div>

            {memoryTab === 'comet' && cometSessions.length > 0 && (
              <select
                value={selectedSession}
                onChange={handleSessionChange}
                style={{
                  width: '100%',
                  padding: '6px 8px',
                  marginBottom: 8,
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--surface-border)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-primary)',
                  fontSize: 12,
                  cursor: 'pointer',
                }}
              >
                <option value="all">All Sessions ({cometMemory.length})</option>
                {cometSessions.map((sess) => (
                  <option key={sess.session_id} value={sess.session_id}>
                    {sess.session_id.slice(0, 8)}… ({sess.status}) — {sess.node_count || 0} nodes
                  </option>
                ))}
              </select>
            )}

            {memoryLoading ? (
              <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-tertiary)' }}>
                <span className="loading-dot" />
                <span className="loading-dot" />
                <span className="loading-dot" />
              </div>
            ) : memoryError ? (
              <div style={{
                padding: '12px',
                background: 'rgba(248, 81, 73, 0.08)',
                border: '1px solid rgba(248, 81, 73, 0.2)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--accent-red)',
                fontSize: 12,
                lineHeight: 1.6,
              }}>
                ⚠️ {memoryError}
              </div>
            ) : (
              <MemoryViewer
                items={memoryTab === 'comet' ? cometMemory : gcriMemory}
                type={memoryTab}
              />
            )}

            <button
              onClick={() => loadMemory(memoryTab, selectedSession)}
              style={{
                marginTop: 8,
                width: '100%',
                padding: '8px',
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--surface-border)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-secondary)',
                fontSize: 12,
                cursor: 'pointer',
              }}
            >
              Refresh
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
