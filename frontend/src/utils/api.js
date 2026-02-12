const API_BASE = 'http://localhost:8000';

export async function sendChatMessage(message, config, history = [], sessionId = null) {
  const response = await fetch(`${API_BASE}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, config, history, session_id: sessionId }),
  });
  if (!response.ok) throw new Error(`Chat API error: ${response.status}`);
  return response.json();
}

export async function runTask(task, config) {
  const response = await fetch(`${API_BASE}/api/task/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ task, config }),
  });
  if (!response.ok) throw new Error(`Task API error: ${response.status}`);
  return response.json();
}

export async function abortTask() {
  const response = await fetch(`${API_BASE}/api/task/abort`, { method: 'POST' });
  if (!response.ok) throw new Error(`Abort API error: ${response.status}`);
  return response.json();
}

export async function fetchCometMemory() {
  const response = await fetch(`${API_BASE}/api/memory/comet`);
  if (!response.ok) throw new Error(`CoMeT memory API error: ${response.status}`);
  return response.json();
}

export async function fetchCometNode(nodeId, depth = 0) {
  const response = await fetch(`${API_BASE}/api/memory/comet/${nodeId}?depth=${depth}`);
  if (!response.ok) throw new Error(`CoMeT node API error: ${response.status}`);
  return response.json();
}

export async function fetchGcriMemory() {
  const response = await fetch(`${API_BASE}/api/memory/gcri`);
  if (!response.ok) throw new Error(`GCRI memory API error: ${response.status}`);
  return response.json();
}

export async function fetchCometSessions() {
  const response = await fetch(`${API_BASE}/api/memory/comet/sessions`);
  if (!response.ok) throw new Error(`CoMeT sessions API error: ${response.status}`);
  return response.json();
}

export async function fetchCometSessionNodes(sessionId) {
  const response = await fetch(`${API_BASE}/api/memory/comet/sessions/${sessionId}`);
  if (!response.ok) throw new Error(`CoMeT session nodes API error: ${response.status}`);
  return response.json();
}

export async function checkMissingKeys(config) {
  const response = await fetch(`${API_BASE}/api/keys/check`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ config }),
  });
  if (!response.ok) throw new Error(`Keys check API error: ${response.status}`);
  return response.json();
}

export async function setApiKeys(keys) {
  const response = await fetch(`${API_BASE}/api/keys/set`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ keys }),
  });
  if (!response.ok) throw new Error(`Keys set API error: ${response.status}`);
  return response.json();
}
