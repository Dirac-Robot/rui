import { useState } from 'react';
import ReactMarkdown from 'react-markdown';

const EVENT_CONFIG = {
    iteration_start: { icon: '🔄', color: 'var(--accent-cyan)', label: 'Iteration' },
    strategies: { icon: '📋', color: '#a78bfa', label: 'Strategy' },
    hypothesis: { icon: '💡', color: '#fbbf24', label: 'Hypothesis' },
    verification: { icon: '🔍', color: '#f472b6', label: 'Verification' },
    decision_accept: { icon: '✅', color: '#34d399', label: 'Decision' },
    decision_reject: { icon: '🔁', color: '#fb923c', label: 'Decision' },
    complete: { icon: '✅', color: '#34d399', label: 'Complete' },
    result: { icon: '📄', color: '#60a5fa', label: 'Result' },
};

function DetailRenderer({ gcriType, detail }) {
    if (!detail) return null;

    if (gcriType === 'strategies') {
        const strategies = detail.strategies || [];
        return (
            <div className="gcri-card__detail">
                {strategies.map((s, i) => (
                    <div key={i} className="gcri-card__strategy-item">
                        <div className="gcri-card__strategy-name">{s.name}</div>
                        {s.description && (
                            <div className="gcri-card__strategy-desc">{s.description}</div>
                        )}
                        {s.hints?.length > 0 && (
                            <div className="gcri-card__hints">
                                {s.hints.map((h, j) => (
                                    <div key={j} className="gcri-card__hint">• {h}</div>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        );
    }

    if (gcriType === 'hypothesis') {
        return (
            <div className="gcri-card__detail">
                {detail.strategyName && (
                    <div className="gcri-card__meta">Strategy: {detail.strategyName}</div>
                )}
                <div className="gcri-card__full-text">
                    <ReactMarkdown>{detail.hypothesis || ''}</ReactMarkdown>
                </div>
            </div>
        );
    }

    if (gcriType === 'verification') {
        return (
            <div className="gcri-card__detail">
                <div className="gcri-card__meta">
                    Counter-strength: <span className={`gcri-card__strength gcri-card__strength--${detail.counterStrength}`}>
                        {detail.counterStrength}
                    </span>
                </div>
                {detail.counterExample && (
                    <div className="gcri-card__full-text">
                        <ReactMarkdown>{detail.counterExample}</ReactMarkdown>
                    </div>
                )}
            </div>
        );
    }

    if (gcriType === 'decision_accept' || gcriType === 'decision_reject') {
        return (
            <div className="gcri-card__detail">
                {detail.feedback && (
                    <div className="gcri-card__full-text">
                        <ReactMarkdown>{detail.feedback}</ReactMarkdown>
                    </div>
                )}
                {detail.evaluations?.length > 0 && (
                    <div className="gcri-card__evaluations">
                        {detail.evaluations.map((ev, i) => (
                            <div key={i} className="gcri-card__eval-item">
                                <span className="gcri-card__eval-branch">Branch {(ev.branch_index ?? i) + 1}</span>
                                <span className={`gcri-card__eval-status gcri-card__eval-status--${ev.status}`}>{ev.status}</span>
                                {ev.summary_hypothesis && (
                                    <span className="gcri-card__eval-summary">{ev.summary_hypothesis}</span>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    }

    if (gcriType === 'result') {
        return (
            <div className="gcri-card__detail gcri-card__detail--result">
                <div className="gcri-card__full-text markdown-content">
                    <ReactMarkdown>{detail.finalOutput || ''}</ReactMarkdown>
                </div>
            </div>
        );
    }

    return null;
}

export default function GcriEventCard({ gcriType, summary, detail }) {
    const hasDetail = detail && (
        gcriType === 'strategies' ||
        gcriType === 'hypothesis' ||
        gcriType === 'verification' ||
        gcriType === 'decision_accept' ||
        gcriType === 'decision_reject' ||
        gcriType === 'result'
    );
    const defaultExpanded = gcriType === 'result';
    const [expanded, setExpanded] = useState(defaultExpanded);

    const cfg = EVENT_CONFIG[gcriType] || EVENT_CONFIG.iteration_start;

    return (
        <div
            className={`gcri-card gcri-card--${gcriType} ${expanded ? 'gcri-card--expanded' : ''} ${hasDetail ? 'gcri-card--expandable' : ''}`}
            onClick={hasDetail ? () => setExpanded(!expanded) : undefined}
            style={{ '--card-accent': cfg.color }}
        >
            <div className="gcri-card__header">
                <span className="gcri-card__icon">{cfg.icon}</span>
                <span className="gcri-card__label">{cfg.label}</span>
                <span className="gcri-card__summary">{summary}</span>
                {hasDetail && (
                    <span className={`gcri-card__chevron ${expanded ? 'gcri-card__chevron--open' : ''}`}>▾</span>
                )}
            </div>
            {hasDetail && expanded && (
                <div className="gcri-card__body" onClick={(e) => e.stopPropagation()}>
                    <DetailRenderer gcriType={gcriType} detail={detail} />
                </div>
            )}
        </div>
    );
}
