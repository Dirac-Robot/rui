import { useState } from 'react';

const AVAILABLE_MODELS = [
  // OpenAI — GPT-5.x
  { id: 'gpt-5.2', label: 'GPT-5.2', provider: 'openai' },
  { id: 'gpt-5', label: 'GPT-5', provider: 'openai' },
  { id: 'gpt-5-mini', label: 'GPT-5 Mini', provider: 'openai' },
  { id: 'gpt-5-nano', label: 'GPT-5 Nano', provider: 'openai' },
  // OpenAI — GPT-4.x
  { id: 'gpt-4.1', label: 'GPT-4.1', provider: 'openai' },
  { id: 'gpt-4.1-mini', label: 'GPT-4.1 Mini', provider: 'openai' },
  { id: 'gpt-4.1-nano', label: 'GPT-4.1 Nano', provider: 'openai' },
  { id: 'gpt-4o', label: 'GPT-4o', provider: 'openai' },
  { id: 'gpt-4o-mini', label: 'GPT-4o Mini', provider: 'openai' },
  // OpenAI — o-series
  { id: 'o3', label: 'o3', provider: 'openai' },
  { id: 'o3-mini', label: 'o3-mini', provider: 'openai' },
  { id: 'o4-mini', label: 'o4-mini', provider: 'openai' },
  // Anthropic
  { id: 'claude-opus-4.6', label: 'Claude Opus 4.6', provider: 'anthropic' },
  { id: 'claude-sonnet-4.5', label: 'Claude Sonnet 4.5', provider: 'anthropic' },
  { id: 'claude-4-opus', label: 'Claude 4 Opus', provider: 'anthropic' },
  { id: 'claude-4-sonnet', label: 'Claude 4 Sonnet', provider: 'anthropic' },
  { id: 'claude-4-haiku', label: 'Claude 4 Haiku', provider: 'anthropic' },
  { id: 'claude-3.5-sonnet', label: 'Claude 3.5 Sonnet', provider: 'anthropic' },
  { id: 'claude-3.5-haiku', label: 'Claude 3.5 Haiku', provider: 'anthropic' },
  // Google
  { id: 'gemini-3-pro-preview', label: 'Gemini 3 Pro', provider: 'google' },
  { id: 'gemini-3-flash-preview', label: 'Gemini 3 Flash', provider: 'google' },
  { id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro', provider: 'google' },
  { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash', provider: 'google' },
  { id: 'gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash-Lite', provider: 'google' },
  { id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash', provider: 'google' },
];

const BRANCH_ROLES = {
  hypothesis: { label: 'Hypothesis', color: 'var(--phase-execution)', desc: 'Implements solutions from strategies' },
  reasoning: { label: 'Refiner', color: 'var(--phase-decision)', desc: 'Refines and improves hypothesis (deep only)' },
};

const GLOBAL_ROLES = {
  strategy_generator: { label: 'Strategy', color: 'var(--phase-strategy)', desc: 'Generates reasoning strategies' },
  aggregator: { label: 'Aggregator', color: 'var(--accent-blue)', desc: 'Synthesizes results across branches' },
  verifier: { label: 'Verifier', color: 'var(--accent-green)', desc: 'Validates aggregated hypotheses' },
  decision: { label: 'Decision', color: 'var(--phase-decision)', desc: 'Selects the best outcome' },
  memory: { label: 'Memory', color: 'var(--phase-memory)', desc: 'Manages cross-task persistent learning' },
};

function makeBranch() {
  return {
    hypothesis: 'gpt-4o',
    reasoning: 'gpt-4o',
  };
}

const DEFAULT_GLOBAL_ROLES = {
  strategy_generator: 'gpt-4o',
  aggregator: 'gpt-4o',
  verifier: 'gpt-4o',
  decision: 'gpt-4o',
  memory: 'gpt-4o',
};

const PRESETS_KEY = 'rui_config_presets';
const LAST_PRESET_KEY = 'rui_last_preset';

function loadPresets() {
  try {
    return JSON.parse(localStorage.getItem(PRESETS_KEY)) || {};
  } catch {
    return {};
  }
}

function savePresetsToStorage(presets) {
  localStorage.setItem(PRESETS_KEY, JSON.stringify(presets));
}

function getLastPresetConfig() {
  const lastKey = localStorage.getItem(LAST_PRESET_KEY);
  if (!lastKey) return null;
  const presets = loadPresets();
  return presets[lastKey] ? { key: lastKey, config: presets[lastKey] } : null;
}

export default function ConfigSidebar({ config, onConfigChange, isRunning, onOpenApiKeys }) {
  const [initDone] = useState(() => {
    const last = getLastPresetConfig();
    if (last) {
      onConfigChange(last.config);
    }
    return true;
  });
  const lastPreset = getLastPresetConfig();
  const initConfig = lastPreset ? lastPreset.config : config;
  const [branchCount, setBranchCount] = useState(initConfig.branchCount || 3);
  const [maxIterations, setMaxIterations] = useState(initConfig.maxIterations || 3);
  const [branches, setBranches] = useState(
    initConfig.branches || Array.from({ length: 3 }, makeBranch)
  );
  const [chatModel, setChatModel] = useState(initConfig.chatModel || 'gpt-4o');
  const [globalRoles, setGlobalRoles] = useState(initConfig.globalRoles || { ...DEFAULT_GLOBAL_ROLES });
  const [expandedBranch, setExpandedBranch] = useState(null);
  const [presets, setPresets] = useState(loadPresets);
  const [selectedPreset, setSelectedPreset] = useState(lastPreset?.key || '');
  const [showPresetModal, setShowPresetModal] = useState(false);
  const [presetNameInput, setPresetNameInput] = useState('');

  function emitChange(updates) {
    onConfigChange({ branchCount, branches, chatModel, globalRoles, maxIterations, ...updates });
  }

  function savePreset() {
    setPresetNameInput('');
    setShowPresetModal(true);
  }

  function confirmSavePreset() {
    const key = presetNameInput.trim();
    if (!key) return;
    const snapshot = { chatModel, branchCount, branches, globalRoles, maxIterations };
    const updated = { ...presets, [key]: snapshot };
    setPresets(updated);
    savePresetsToStorage(updated);
    setSelectedPreset(key);
    localStorage.setItem(LAST_PRESET_KEY, key);
    setShowPresetModal(false);
  }

  function loadPreset(key) {
    if (!key) return;
    const preset = presets[key];
    if (!preset) return;
    setChatModel(preset.chatModel || 'gpt-4o');
    setBranchCount(preset.branchCount || 3);
    setMaxIterations(preset.maxIterations || 3);
    setBranches(
      preset.branches || Array.from({ length: preset.branchCount || 3 }, makeBranch)
    );
    setGlobalRoles(preset.globalRoles || { ...DEFAULT_GLOBAL_ROLES });
    setSelectedPreset(key);
    localStorage.setItem(LAST_PRESET_KEY, key);
    onConfigChange({
      chatModel: preset.chatModel || 'gpt-4o',
      branchCount: preset.branchCount || 3,
      maxIterations: preset.maxIterations || 3,
      branches: preset.branches || Array.from({ length: preset.branchCount || 3 }, makeBranch),
      globalRoles: preset.globalRoles || { ...DEFAULT_GLOBAL_ROLES },
    });
  }

  function deletePreset() {
    if (!selectedPreset) return;
    const updated = { ...presets };
    delete updated[selectedPreset];
    setPresets(updated);
    savePresetsToStorage(updated);
    if (localStorage.getItem(LAST_PRESET_KEY) === selectedPreset) {
      localStorage.removeItem(LAST_PRESET_KEY);
    }
    setSelectedPreset('');
  }

  function adjustBranchCount(delta) {
    const count = Math.max(1, Math.min(5, branchCount + delta));
    if (count === branchCount) return;
    setBranchCount(count);
    const newBranches = Array.from({ length: count }, (_, index) =>
      branches[index] || makeBranch()
    );
    setBranches(newBranches);
    emitChange({ branchCount: count, branches: newBranches });
  }

  function addBranch() {
    if (branchCount >= 5) return;
    const lastBranch = branches[branches.length - 1] || makeBranch();
    const newBranches = [...branches, { ...lastBranch }];
    const count = newBranches.length;
    setBranchCount(count);
    setBranches(newBranches);
    emitChange({ branchCount: count, branches: newBranches });
  }

  function removeBranch(index) {
    if (branchCount <= 1) return;
    const newBranches = branches.filter((_, i) => i !== index);
    const count = newBranches.length;
    setBranchCount(count);
    setBranches(newBranches);
    if (expandedBranch === index) setExpandedBranch(null);
    emitChange({ branchCount: count, branches: newBranches });
  }

  function handleRoleModelChange(branchIndex, role, modelId) {
    const newBranches = branches.map((branch, index) =>
      index === branchIndex ? { ...branch, [role]: modelId } : branch
    );
    setBranches(newBranches);
    emitChange({ branches: newBranches });
  }

  function handleChatModelChange(event) {
    setChatModel(event.target.value);
    emitChange({ chatModel: event.target.value });
  }

  function handleGlobalRoleChange(role, modelId) {
    const updated = { ...globalRoles, [role]: modelId };
    setGlobalRoles(updated);
    emitChange({ globalRoles: updated });
  }

  function toggleBranch(index) {
    setExpandedBranch(expandedBranch === index ? null : index);
  }

  return (
    <>
      <div className="sidebar">
        <div className="sidebar__header">
          <div className="sidebar__title">Configuration</div>
        </div>
        <div className="sidebar__content">
          {/* Presets */}
          <div className="config-section">
            <div className="config-section__label">Presets</div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <select
                className="model-select"
                style={{ flex: 1, padding: '6px 8px', fontSize: 12 }}
                value={selectedPreset}
                onChange={(event) => {
                  setSelectedPreset(event.target.value);
                  loadPreset(event.target.value);
                }}
                disabled={isRunning}
              >
                <option value="">— Select —</option>
                {Object.keys(presets).map((key) => (
                  <option key={key} value={key}>{key}</option>
                ))}
              </select>
              <button
                onClick={savePreset}
                disabled={isRunning}
                title="Save current config as preset"
                style={{
                  padding: '5px 10px',
                  fontSize: 11,
                  fontWeight: 600,
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--accent-cyan)',
                  background: 'transparent',
                  color: 'var(--accent-cyan)',
                  cursor: isRunning ? 'not-allowed' : 'pointer',
                  transition: 'all var(--transition-fast)',
                  whiteSpace: 'nowrap',
                }}
              >Save</button>
              {selectedPreset && (
                <button
                  onClick={deletePreset}
                  disabled={isRunning}
                  title="Delete selected preset"
                  style={{
                    padding: '5px 8px',
                    fontSize: 11,
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--surface-border)',
                    background: 'transparent',
                    color: 'var(--accent-red)',
                    cursor: isRunning ? 'not-allowed' : 'pointer',
                    transition: 'all var(--transition-fast)',
                  }}
                >✕</button>
              )}
            </div>
          </div>

          <div className="divider" />

          {/* API Keys */}
          <div className="config-section">
            <button
              onClick={onOpenApiKeys}
              style={{
                width: '100%',
                padding: '8px 12px',
                fontSize: 12,
                fontWeight: 600,
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--surface-border)',
                background: 'var(--bg-tertiary)',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                transition: 'all var(--transition-fast)',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >🔑 API Keys</button>
          </div>

          <div className="divider" />

          {/* Chat Agent */}
          <div className="config-section">
            <div className="config-section__label">Chat Agent</div>
            <select
              className="model-select"
              style={{ width: '100%', padding: '8px 10px', fontSize: 13 }}
              value={chatModel}
              onChange={handleChatModelChange}
              disabled={isRunning}
            >
              {AVAILABLE_MODELS.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.label}
                </option>
              ))}
            </select>
          </div>

          <div className="divider" />

          {/* Branch Count — inline: BRANCHES  ‹ K › 개 */}
          <div className="config-section" style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}>
            <div className="config-section__label" style={{ marginBottom: 0 }}>Branches</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto' }}>
              <button
                onClick={() => adjustBranchCount(-1)}
                disabled={isRunning || branchCount <= 1}
                style={{
                  width: 24, height: 24,
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--surface-border)',
                  background: 'var(--bg-tertiary)',
                  color: branchCount <= 1 ? 'var(--text-tertiary)' : 'var(--text-primary)',
                  fontSize: 14, cursor: branchCount <= 1 ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all var(--transition-fast)',
                }}
              >‹</button>
              <span style={{
                fontSize: 16, fontWeight: 700,
                fontVariantNumeric: 'tabular-nums',
                minWidth: 18, textAlign: 'center',
              }}>{branchCount}</span>
              <button
                onClick={() => adjustBranchCount(1)}
                disabled={isRunning || branchCount >= 5}
                style={{
                  width: 24, height: 24,
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--surface-border)',
                  background: 'var(--bg-tertiary)',
                  color: branchCount >= 5 ? 'var(--text-tertiary)' : 'var(--text-primary)',
                  fontSize: 14, cursor: branchCount >= 5 ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all var(--transition-fast)',
                }}
              >›</button>
              <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>개</span>
            </div>
          </div>

          {/* Max Iterations — inline: MAX ITER  ‹ N › 회 */}
          <div className="config-section" style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}>
            <div className="config-section__label" style={{ marginBottom: 0 }}>Max Iterations</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto' }}>
              <button
                onClick={() => { const v = Math.max(1, maxIterations - 1); setMaxIterations(v); emitChange({ maxIterations: v }); }}
                disabled={isRunning || maxIterations <= 1}
                style={{
                  width: 24, height: 24,
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--surface-border)',
                  background: 'var(--bg-tertiary)',
                  color: maxIterations <= 1 ? 'var(--text-tertiary)' : 'var(--text-primary)',
                  fontSize: 14, cursor: maxIterations <= 1 ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all var(--transition-fast)',
                }}
              >‹</button>
              <span style={{
                fontSize: 16, fontWeight: 700,
                fontVariantNumeric: 'tabular-nums',
                minWidth: 18, textAlign: 'center',
              }}>{maxIterations}</span>
              <button
                onClick={() => { const v = Math.min(10, maxIterations + 1); setMaxIterations(v); emitChange({ maxIterations: v }); }}
                disabled={isRunning || maxIterations >= 10}
                style={{
                  width: 24, height: 24,
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--surface-border)',
                  background: 'var(--bg-tertiary)',
                  color: maxIterations >= 10 ? 'var(--text-tertiary)' : 'var(--text-primary)',
                  fontSize: 14, cursor: maxIterations >= 10 ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all var(--transition-fast)',
                }}
              >›</button>
              <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>회</span>
            </div>
          </div>

          <div className="divider" />

          {/* Per-branch role models */}
          <div className="config-section">
            <div className="config-section__label">Branch Models (Deep Basis)</div>
            <p style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 10, lineHeight: 1.6 }}>
              Set models for each role. The orchestrator uses all 3 for deep, strategy+hypothesis for low, and a merged single call for minimal.
            </p>
            <div className="branch-config-list">
              {branches.map((branch, index) => (
                <div key={index} style={{ marginBottom: 4 }}>
                  <div
                    className="branch-config-item"
                    onClick={() => toggleBranch(index)}
                    style={{ cursor: 'pointer', userSelect: 'none' }}
                  >
                    <div className={`branch-index branch-index--${index}`}>
                      {index + 1}
                    </div>
                    <div style={{ flex: 1, fontSize: 12, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                      {AVAILABLE_MODELS.find(m => m.id === branch.hypothesis)?.label || branch.hypothesis}
                      {branch.hypothesis !== branch.reasoning
                        ? ' +mix'
                        : ''}
                    </div>
                    {branchCount > 1 && (
                      <span
                        onClick={(event) => { event.stopPropagation(); removeBranch(index); }}
                        style={{
                          fontSize: 13,
                          color: 'var(--text-tertiary)',
                          cursor: 'pointer',
                          padding: '0 4px',
                          lineHeight: 1,
                          transition: 'color var(--transition-fast)',
                        }}
                        onMouseEnter={(event) => { event.target.style.color = 'var(--accent-red)'; }}
                        onMouseLeave={(event) => { event.target.style.color = 'var(--text-tertiary)'; }}
                        title="Remove branch"
                      >
                        ×
                      </span>
                    )}
                    <span style={{
                      fontSize: 10,
                      color: 'var(--text-tertiary)',
                      transition: 'transform 0.2s',
                      transform: expandedBranch === index ? 'rotate(180deg)' : 'rotate(0)',
                    }}>
                      ▼
                    </span>
                  </div>

                  {expandedBranch === index && (
                    <div style={{
                      background: 'var(--bg-elevated)',
                      border: '1px solid var(--surface-border)',
                      borderTop: 'none',
                      borderRadius: '0 0 var(--radius-md) var(--radius-md)',
                      padding: '8px 10px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 6,
                      animation: 'messageIn 0.2s ease',
                    }}>
                      {Object.entries(BRANCH_ROLES).map(([role, info]) => (
                        <div key={role} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{
                            width: 6,
                            height: 6,
                            borderRadius: '50%',
                            background: info.color,
                            flexShrink: 0,
                          }} />
                          <span style={{
                            width: 70,
                            fontSize: 11,
                            color: info.color,
                            fontWeight: 600,
                            flexShrink: 0,
                          }}>
                            {info.label}
                          </span>
                          <select
                            className="model-select"
                            value={branch[role]}
                            onChange={(event) => handleRoleModelChange(index, role, event.target.value)}
                            disabled={isRunning}
                            style={{ flex: 1 }}
                          >
                            {AVAILABLE_MODELS.map((model) => (
                              <option key={model.id} value={model.id}>
                                {model.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {branchCount < 5 && (
                <button
                  onClick={addBranch}
                  disabled={isRunning}
                  style={{
                    width: '100%',
                    padding: '8px',
                    background: 'var(--bg-tertiary)',
                    border: '1px dashed var(--surface-border)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--text-tertiary)',
                    fontSize: 13,
                    cursor: isRunning ? 'not-allowed' : 'pointer',
                    transition: 'all var(--transition-fast)',
                    marginTop: 4,
                  }}
                  onMouseEnter={(event) => {
                    if (!isRunning) {
                      event.target.style.borderColor = 'var(--accent-cyan)';
                      event.target.style.color = 'var(--accent-cyan)';
                    }
                  }}
                  onMouseLeave={(event) => {
                    event.target.style.borderColor = 'var(--surface-border)';
                    event.target.style.color = 'var(--text-tertiary)';
                  }}
                >
                  + Add Branch
                </button>
              )}
            </div>
          </div>

          <div className="divider" />

          {/* Global Roles — shared across all branches */}
          <div className="config-section">
            <div className="config-section__label">Global Roles</div>
            <p style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 10, lineHeight: 1.6 }}>
              Shared agents that operate across all branches.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {Object.entries(GLOBAL_ROLES).map(([role, info]) => (
                <div key={role} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: info.color,
                    flexShrink: 0,
                  }} />
                  <span style={{
                    width: 80,
                    fontSize: 11,
                    color: info.color,
                    fontWeight: 600,
                    flexShrink: 0,
                  }}>
                    {info.label}
                  </span>
                  <select
                    className="model-select"
                    value={globalRoles[role]}
                    onChange={(event) => handleGlobalRoleChange(role, event.target.value)}
                    disabled={isRunning}
                    style={{ flex: 1 }}
                  >
                    {AVAILABLE_MODELS.map((model) => (
                      <option key={model.id} value={model.id}>
                        {model.label}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>

          <div className="divider" />

          {/* Depth info */}
          <div className="config-section">
            <div className="config-section__label">Reasoning Depth</div>
            <div style={{
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--surface-border)',
              borderRadius: 'var(--radius-md)',
              padding: '10px 12px',
              fontSize: 12,
              color: 'var(--text-secondary)',
              lineHeight: 1.6,
            }}>
              <span style={{ color: 'var(--accent-cyan)', fontWeight: 600 }}>Auto</span> — Orchestrator selects depth per task:
              <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 3 }}>
                <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                  <span style={{ color: 'var(--accent-green)' }}>deep</span> → strategy + hypothesis + refiner
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                  <span style={{ color: 'var(--accent-amber)' }}>low</span> → strategy + hypothesis
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                  <span style={{ color: 'var(--accent-red)' }}>minimal</span> → merged single call
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showPresetModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(8px)',
          }}
          onClick={() => setShowPresetModal(false)}
        >
          <div
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--surface-border)',
              borderRadius: 'var(--radius-lg)',
              padding: '24px',
              width: 340,
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
              boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
              Save Preset
            </div>
            <input
              type="text"
              value={presetNameInput}
              onChange={(event) => setPresetNameInput(event.target.value)}
              onKeyDown={(event) => { if (event.key === 'Enter') confirmSavePreset(); }}
              placeholder="Preset name"
              autoFocus
              style={{
                width: '100%',
                padding: '10px 12px',
                fontSize: 13,
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--surface-border)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--text-primary)',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowPresetModal(false)}
                style={{
                  padding: '8px 16px',
                  fontSize: 12,
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--surface-border)',
                  background: 'transparent',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                }}
              >Cancel</button>
              <button
                onClick={confirmSavePreset}
                disabled={!presetNameInput.trim()}
                style={{
                  padding: '8px 16px',
                  fontSize: 12,
                  fontWeight: 600,
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--accent-cyan)',
                  background: presetNameInput.trim() ? 'var(--accent-cyan)' : 'transparent',
                  color: presetNameInput.trim() ? 'var(--bg-primary)' : 'var(--text-tertiary)',
                  cursor: presetNameInput.trim() ? 'pointer' : 'not-allowed',
                  transition: 'all var(--transition-fast)',
                }}
              >Save</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
