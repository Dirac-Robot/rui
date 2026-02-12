const PHASES = ['strategy', 'execution', 'decision', 'memory'];

const PHASE_LABELS = {
  strategy: 'Strategy',
  execution: 'Execution',
  decision: 'Decision',
  memory: 'Memory',
  idle: 'Idle',
  complete: 'Complete',
};

export default function TaskCard({ task }) {
  const currentPhaseIndex = PHASES.indexOf(task.phase);

  function getStepClass(phase, index) {
    const classes = [`task-card__step task-card__step--${phase}`];
    if (index < currentPhaseIndex) {
      classes.push('task-card__step--done');
    } else if (index === currentPhaseIndex && task.phase !== 'idle' && task.phase !== 'complete') {
      classes.push('task-card__step--active');
    }
    return classes.join(' ');
  }

  const branchColors = [
    'var(--accent-cyan)',
    'var(--accent-purple)',
    'var(--accent-green)',
    'var(--accent-amber)',
    'var(--accent-red)',
  ];

  return (
    <div className="task-card">
      <div className="task-card__header">
        <span className="task-card__iteration">
          Iteration {task.iterationIndex ?? 0}
        </span>
        <span className={`task-card__phase task-card__phase--${task.phase || 'idle'}`}>
          {PHASE_LABELS[task.phase] || task.phase || 'Idle'}
        </span>
      </div>

      <div className="task-card__progress">
        {PHASES.map((phase, index) => (
          <div key={phase} className={getStepClass(phase, index)} />
        ))}
      </div>

      {task.branches && task.branches.length > 0 && (
        <div className="task-card__branches">
          {task.branches.map((branch, index) => (
            <div key={index} className="task-card__branch">
              <div
                className={`task-card__branch-dot ${branch.status === 'working' ? 'task-card__branch-dot--working' : ''}`}
                style={{ background: branchColors[index % branchColors.length] }}
              />
              <span className="task-card__branch-label">
                Branch {index+1}: {branch.model || 'default'}
              </span>
              <span className="task-card__branch-status">
                {branch.status || 'pending'}
              </span>
            </div>
          ))}
        </div>
      )}

      {task.taskDescription && (
        <div style={{
          marginTop: 8,
          padding: '6px 8px',
          background: 'var(--bg-elevated)',
          borderRadius: 'var(--radius-sm)',
          fontSize: 11,
          color: 'var(--text-secondary)',
          lineHeight: 1.5,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}>
          {task.taskDescription}
        </div>
      )}
    </div>
  );
}
