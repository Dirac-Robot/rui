import { useState } from 'react';

const PHASES = ['strategy', 'execution', 'aggregation', 'verification', 'decision', 'memory'];

const PHASE_LABELS = {
  strategy: 'Strategy',
  execution: 'Execution',
  aggregation: 'Aggregation',
  verification: 'Verification',
  decision: 'Decision',
  memory: 'Memory',
  idle: 'Idle',
  complete: 'Complete',
};

const PHASE_ICONS = {
  strategy: '🎯',
  execution: '⚡',
  aggregation: '🔀',
  verification: '🔍',
  decision: '⚖️',
  memory: '🧠',
  complete: '🏁',
  idle: '💤',
};

function IterationGroup({ iterNum, items }) {
  const strategies = items.filter((d) => d.type === 'strategies');
  const hypotheses = items.filter((d) => d.type === 'hypothesis');
  const verifications = items.filter((d) => d.type === 'verification');
  const decisions = items.filter((d) => d.type === 'decision');
  const iterComplete = items.find((d) => d.type === 'iteration_complete');

  return (
    <div className="task-detail__iteration">
      <div className="task-detail__iter-header">
        Iteration {iterNum + 1}
        {iterComplete && (
          <span className={`task-detail__iter-badge ${iterComplete.decision ? 'task-detail__iter-badge--accept' : 'task-detail__iter-badge--reject'}`}>
            {iterComplete.decision ? '✅ Accepted' : '🔁 Continuing'}
          </span>
        )}
      </div>

      {strategies.flatMap((s) => s.strategies || []).map((strat, i) => (
        <div key={`strat-${i}`} className="task-detail__item task-detail__item--strategy">
          <span className="task-detail__icon">📋</span>
          <div>
            <strong>{strat.name}</strong>
            <p>{strat.description}</p>
            {strat.hints?.length > 0 && (
              <div className="task-detail__hints">
                {strat.hints.map((h, j) => <span key={j} className="task-detail__hint">{h}</span>)}
              </div>
            )}
          </div>
        </div>
      ))}

      {hypotheses.map((h, i) => (
        <div key={`hyp-${i}`} className="task-detail__item task-detail__item--hypothesis">
          <span className="task-detail__icon">💡</span>
          <div>
            <strong>Branch {h.branch} — {h.strategyName}</strong>
            <p>{h.hypothesis}</p>
          </div>
        </div>
      ))}

      {verifications.map((v, i) => (
        <div key={`ver-${i}`} className="task-detail__item task-detail__item--verification">
          <span className="task-detail__icon">{v.counterStrength === 'strong' ? '🚫' : v.counterStrength === 'weak' ? '⚠️' : '✅'}</span>
          <div>
            <strong>Branch {v.branch}: {v.counterStrength?.toUpperCase()} counter</strong>
            {v.counterExample && <p>{v.counterExample}</p>}
          </div>
        </div>
      ))}

      {decisions.map((d, i) => (
        <div key={`dec-${i}`} className={`task-detail__item task-detail__item--decision ${d.decision ? 'task-detail__item--accept' : ''}`}>
          <span className="task-detail__icon">{d.decision ? '✅' : '❌'}</span>
          <div>
            <strong>{d.decision ? `Accepted (Branch #${d.bestBranch + 1})` : 'Rejected'}</strong>
            {d.feedback && <p>{d.feedback}</p>}
          </div>
        </div>
      ))}

      {iterComplete?.evaluations?.length > 0 && (
        <div className="task-detail__evals">
          {iterComplete.evaluations.map((ev, i) => (
            <div key={i} className={`task-detail__eval task-detail__eval--${ev.status}`}>
              <span>B{ev.branch_index + 1}</span>
              <span className="task-detail__eval-status">{ev.status}</span>
              <span className="task-detail__eval-hyp">{ev.summary_hypothesis}</span>
            </div>
          ))}
        </div>
      )}

      {iterComplete?.feedback && !iterComplete.decision && (
        <div className="task-detail__feedback">
          <span className="task-detail__icon">💬</span>
          <p>{iterComplete.feedback}</p>
        </div>
      )}
    </div>
  );
}


export default function TaskCard({ task, index }) {
  const [expanded, setExpanded] = useState(false);
  const currentPhaseIndex = PHASES.indexOf(task.phase);

  function getStepClass(phase, idx) {
    const classes = [`task-card__step task-card__step--${phase}`];
    if (idx < currentPhaseIndex) {
      classes.push('task-card__step--done');
    } else if (idx === currentPhaseIndex && task.phase !== 'idle' && task.phase !== 'complete') {
      classes.push('task-card__step--active');
    }
    return classes.join(' ');
  }

  const details = task.details || [];
  const iterationMap = {};
  details.forEach((d) => {
    const iter = d.iteration ?? 0;
    if (!iterationMap[iter]) iterationMap[iter] = [];
    iterationMap[iter].push(d);
  });
  const iterationKeys = Object.keys(iterationMap).map(Number).sort((a, b) => a - b);

  return (
    <div className={`task-card ${expanded ? 'task-card--expanded' : ''}`}>
      <div className="task-card__header" onClick={() => setExpanded(!expanded)} style={{ cursor: 'pointer' }}>
        <span className="task-card__iteration">
          {PHASE_ICONS[task.phase] || '📌'} Iteration {(task.iterationIndex ?? 0) + 1}
        </span>
        <span className={`task-card__phase task-card__phase--${task.phase || 'idle'}`}>
          {PHASE_LABELS[task.phase] || task.phase || 'Idle'}
        </span>
        {details.length > 0 && (
          <span className="task-card__expand-icon">{expanded ? '▲' : '▼'}</span>
        )}
      </div>

      <div className="task-card__progress">
        {PHASES.map((phase, idx) => (
          <div key={phase} className={getStepClass(phase, idx)} title={PHASE_LABELS[phase]} />
        ))}
      </div>

      {expanded && iterationKeys.length > 0 && (
        <div className="task-detail">
          {iterationKeys.map((iterNum) => (
            <IterationGroup key={iterNum} iterNum={iterNum} items={iterationMap[iterNum]} />
          ))}
        </div>
      )}

      {expanded && iterationKeys.length === 0 && (
        <div style={{
          padding: '12px 8px',
          fontSize: 12,
          color: 'var(--text-tertiary)',
          textAlign: 'center',
          lineHeight: 1.6,
        }}>
          {task.phase === 'idle' || task.phase === 'complete'
            ? 'No detailed logs available for this task.'
            : 'Waiting for data... Logs will appear as GCRI progresses.'}
        </div>
      )}

      {!expanded && task.taskDescription && (
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
