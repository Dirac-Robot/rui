import { useState, useCallback, useEffect, useRef } from 'react';
import './index.css';
import ConfigSidebar from './components/ConfigSidebar';
import ChatPanel from './components/ChatPanel';
import ProgressSidebar from './components/ProgressSidebar';
import ApiKeyModal from './components/ApiKeyModal';
import Toast from './components/Toast';
import { createWebSocket } from './utils/ws';
import { sendChatMessage, checkMissingKeys, setApiKeys } from './utils/api';

const API_BASE = 'http://localhost:8000';
const SESSIONS_KEY = 'rui_chat_sessions';
const ACTIVE_SESSION_KEY = 'rui_active_session';

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function makeSession() {
  return {
    id: generateId(),
    title: 'New Chat',
    messages: [],
    createdAt: Date.now(),
  };
}

function loadSessions() {
  try {
    return JSON.parse(localStorage.getItem(SESSIONS_KEY)) || {};
  } catch {
    return {};
  }
}

function saveSessions(sessions) {
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
}

function App() {
  const [sessions, setSessions] = useState(() => {
    const loaded = loadSessions();
    if (Object.keys(loaded).length === 0) {
      const initial = makeSession();
      return { [initial.id]: initial };
    }
    return loaded;
  });
  const [activeSessionId, setActiveSessionId] = useState(() => {
    const saved = localStorage.getItem(ACTIVE_SESSION_KEY);
    const loaded = loadSessions();
    if (saved && loaded[saved]) return saved;
    return Object.keys(loaded)[0] || makeSession().id;
  });
  const [isConnected, setIsConnected] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [isWaitingResponse, setIsWaitingResponse] = useState(false);
  const [config, setConfig] = useState({
    chatModel: 'gpt-4o',
    branchCount: 3,
    branches: [
      { hypothesis: 'gpt-4o', reasoning: 'gpt-4o' },
      { hypothesis: 'claude-4-sonnet', reasoning: 'claude-4-sonnet' },
      { hypothesis: 'gemini-2.5-pro', reasoning: 'gemini-2.5-pro' },
    ],
    globalRoles: {
      strategy_generator: 'gpt-4o',
      aggregator: 'gpt-4o',
      verifier: 'gpt-4o',
      decision: 'gpt-4o',
      memory: 'gpt-4o',
    },
  });
  const [taskState, setTaskState] = useState({ tasks: [] });
  const [missingProviders, setMissingProviders] = useState(null);
  const [toasts, setToasts] = useState([]);
  const toastIdRef = useRef(0);
  const pendingMessageRef = useRef(null);
  const wsRef = useRef(null);

  const addToast = useCallback((message, type = 'error') => {
    const id = ++toastIdRef.current;
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const messages = sessions[activeSessionId]?.messages || [];

  function updateMessages(updater) {
    setSessions((prev) => {
      const session = prev[activeSessionId];
      if (!session) return prev;
      const newMessages = typeof updater === 'function'
        ? updater(session.messages)
        : updater;
      const title = session.title === 'New Chat' && newMessages.length > 0
        ? (newMessages.find((m) => m.role === 'user')?.content || 'New Chat').slice(0, 40)
        : session.title;
      const updated = {
        ...prev,
        [activeSessionId]: { ...session, messages: newMessages, title },
      };
      saveSessions(updated);
      return updated;
    });
  }

  const handleWsMessage = useCallback((data) => {
    if (data.type === 'phase_change') {
      setTaskState((prev) => {
        const tasks = [...prev.tasks];
        const currentTask = tasks[tasks.length-1] || {
          phase: 'idle',
          iterationIndex: 0,
          branches: [],
        };
        currentTask.phase = data.phase;
        if (data.iteration !== undefined) {
          currentTask.iterationIndex = data.iteration;
        }
        if (data.phase === 'strategy') {
          setIsRunning(true);
          if (!tasks.length || tasks[tasks.length-1].phase === 'complete') {
            tasks.push({ ...currentTask, phase: 'strategy' });
          } else {
            tasks[tasks.length-1] = currentTask;
          }
        } else if (data.phase === 'complete' || data.phase === 'idle') {
          setIsRunning(false);
          if (tasks.length) tasks[tasks.length-1] = currentTask;
        } else {
          if (tasks.length) tasks[tasks.length-1] = currentTask;
          else tasks.push(currentTask);
        }
        return { tasks };
      });
    } else if (data.type === 'node_update') {
      setTaskState((prev) => {
        const tasks = [...prev.tasks];
        if (tasks.length === 0) return prev;
        const currentTask = { ...tasks[tasks.length-1] };
        if (data.branch_index !== undefined) {
          const branches = [...(currentTask.branches || [])];
          while (branches.length <= data.branch_index) {
            branches.push({ model: 'default', status: 'pending' });
          }
          branches[data.branch_index] = {
            ...branches[data.branch_index],
            status: data.status || 'working',
            node: data.node,
            data: data.data,
          };
          currentTask.branches = branches;
        }
        tasks[tasks.length-1] = currentTask;
        return { tasks };
      });
    } else if (data.type === 'chat_response') {
      setIsWaitingResponse(false);
      updateMessages((prev) => [
        ...prev,
        { role: 'assistant', content: data.content },
      ]);
    } else if (data.type === 'system_message') {
      updateMessages((prev) => [
        ...prev,
        { role: 'system', content: data.content },
      ]);
    }
  }, [activeSessionId]);

  useEffect(() => {
    const ws = createWebSocket(
      handleWsMessage,
      () => setIsConnected(true),
      () => setIsConnected(false)
    );
    wsRef.current = ws;
    return () => ws.disconnect();
  }, [handleWsMessage]);

  useEffect(() => {
    localStorage.setItem(ACTIVE_SESSION_KEY, activeSessionId);
  }, [activeSessionId]);

  const handleConfirmTask = useCallback(async (scheme) => {
    try {
      const response = await fetch(`${API_BASE}/api/task/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(scheme),
      });
      if (!response.ok) throw new Error(`Confirm API error: ${response.status}`);

      updateMessages((prev) =>
        prev.map((msg) =>
          msg.proposal && msg.proposal.task_description === scheme.task_description
            ? { ...msg, proposalConfirmed: true }
            : msg
        )
      );
    } catch {
      addToast('Failed to start GCRI task. Is the server running?');
    }
  }, [activeSessionId]);

  const doSendMessage = useCallback(async (content) => {
    const currentMessages = sessions[activeSessionId]?.messages || [];
    const updatedMessages = [...currentMessages, { role: 'user', content }];
    updateMessages(updatedMessages);
    setIsWaitingResponse(true);
    try {
      const history = updatedMessages
        .filter((m) => m.role === 'user' || m.role === 'assistant')
        .map((m) => ({ role: m.role, content: m.content }));
      const response = await sendChatMessage(content, config, history, activeSessionId);
      setIsWaitingResponse(false);

      const newMessages = [];

      if (response.reply) {
        newMessages.push({ role: 'assistant', content: response.reply });
      }

      if (response.tool_calls?.length) {
        for (const tc of response.tool_calls) {
          if (tc.tool === 'propose_gcri_task') {
            let scheme;
            try {
              scheme = typeof tc.result === 'string' ? JSON.parse(tc.result) : tc.result;
            } catch {
              scheme = tc.result;
            }
            if (scheme && scheme.type === 'gcri_proposal') {
              newMessages.push({
                role: 'assistant',
                content: '',
                proposal: scheme,
                proposalConfirmed: false,
              });
            }
          }
        }

        const otherTools = response.tool_calls.filter((tc) => tc.tool !== 'propose_gcri_task');
        if (otherTools.length) {
          const toolNames = otherTools.map((tc) => tc.tool).join(', ');
          newMessages.push({
            role: 'system',
            content: `🔧 Tools used: ${toolNames}`,
          });
        }
      }

      if (newMessages.length) {
        updateMessages((prev) => [...prev, ...newMessages]);
      }
    } catch {
      setIsWaitingResponse(false);
      addToast('Failed to reach the backend. Is the server running?');
    }
  }, [config, sessions, activeSessionId]);

  const handleSendMessage = useCallback(async (content) => {
    try {
      const result = await checkMissingKeys(config);
      if (result.missing?.length) {
        pendingMessageRef.current = content;
        setMissingProviders(result.missing);
        return;
      }
    } catch {
      // Backend not reachable — proceed anyway
    }
    doSendMessage(content);
  }, [config, doSendMessage]);

  const handleEditMessage = useCallback(async (index, newContent) => {
    const currentMessages = sessions[activeSessionId]?.messages || [];
    const truncated = currentMessages.slice(0, index);
    updateMessages(truncated);
    setTimeout(() => doSendMessage(newContent), 50);
  }, [sessions, activeSessionId, doSendMessage]);

  const handleNewChat = useCallback(() => {
    const session = makeSession();
    setSessions((prev) => {
      const updated = { ...prev, [session.id]: session };
      saveSessions(updated);
      return updated;
    });
    setActiveSessionId(session.id);
    setTaskState({ tasks: [] });
  }, []);

  const handleSwitchSession = useCallback((sessionId) => {
    if (sessions[sessionId]) {
      setActiveSessionId(sessionId);
      setTaskState({ tasks: [] });
    }
  }, [sessions]);

  const handleDeleteSession = useCallback((sessionId) => {
    setSessions((prev) => {
      const updated = { ...prev };
      delete updated[sessionId];
      if (Object.keys(updated).length === 0) {
        const fresh = makeSession();
        updated[fresh.id] = fresh;
        setActiveSessionId(fresh.id);
      } else if (sessionId === activeSessionId) {
        setActiveSessionId(Object.keys(updated)[0]);
      }
      saveSessions(updated);
      return updated;
    });
  }, [activeSessionId]);

  const handleKeysSubmit = useCallback(async (keys) => {
    await setApiKeys(keys);
    setMissingProviders(null);
    if (pendingMessageRef.current) {
      const pending = pendingMessageRef.current;
      pendingMessageRef.current = null;
      doSendMessage(pending);
    }
  }, [doSendMessage]);

  const handleKeysCancel = useCallback(() => {
    setMissingProviders(null);
    pendingMessageRef.current = null;
  }, []);

  const handleConfigChange = useCallback((newConfig) => {
    setConfig((prev) => ({ ...prev, ...newConfig }));
  }, []);

  const sessionList = Object.values(sessions)
    .sort((a, b) => b.createdAt - a.createdAt);

  return (
    <div className="app-layout">
      <ConfigSidebar
        config={config}
        onConfigChange={handleConfigChange}
        isRunning={isRunning}
      />
      <ChatPanel
        messages={messages}
        onSendMessage={handleSendMessage}
        onEditMessage={handleEditMessage}
        onNewChat={handleNewChat}
        onSwitchSession={handleSwitchSession}
        onDeleteSession={handleDeleteSession}
        onConfirmTask={handleConfirmTask}
        sessions={sessionList}
        activeSessionId={activeSessionId}
        isConnected={isConnected}
        isWaitingResponse={isWaitingResponse}
      />
      <ProgressSidebar taskState={taskState} />
      <Toast messages={toasts} onDismiss={dismissToast} />
      {missingProviders && (
        <ApiKeyModal
          missingProviders={missingProviders}
          onSubmit={handleKeysSubmit}
          onCancel={handleKeysCancel}
        />
      )}
    </div>
  );
}

export default App;
