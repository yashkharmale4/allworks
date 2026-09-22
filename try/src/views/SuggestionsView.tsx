import { useEffect, useState } from 'react';
import * as api from '../api';
import { useApp } from '../AppContext';
import SuggestionCard from '../components/SuggestionCard';
import {
  IconPause,
  IconRefresh,
  IconSparkle,
  IconTrash,
  IconPulse,
} from '../components/icons';
import { StatusDot } from '../components/ui';
import { describeActionShort, plural } from '../format';
import type { RepeatedSequence } from '../types';

export default function SuggestionsView() {
  const app = useApp();
  const [repeats, setRepeats] = useState<RepeatedSequence[]>([]);
  const [scanning, setScanning] = useState(false);

  async function runDetect() {
    if (app.automations.length === 0) {
      setRepeats([]);
      return;
    }
    setRepeats(await api.detectRepeats(app.automations));
  }

  async function scan() {
    setScanning(true);
    try {
      await runDetect();
    } catch {
      app.toast('Could not scan for repeats', 'error');
    } finally {
      setScanning(false);
    }
  }

  useEffect(() => {
    runDetect().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [app.automations.length]);

  const active = app.observerMode === 'observing';

  return (
    <div className="view view-suggestions">
      <header className="page-head">
        <div>
          <h1>Workflow Observer</h1>
          <p className="page-sub">Allworks quietly looks for repetitive work.</p>
        </div>
        <div className="page-meta">
          <StatusBadge />
        </div>
      </header>

      <section className="stats-row">
        <div className="card stat-card">
          <span className="stat-value">{app.actionsObserved}</span>
          <span className="stat-label">Actions observed</span>
        </div>
        <div className="card stat-card">
          <span className="stat-value">{app.activeSuggestion ? 1 : 0}</span>
          <span className="stat-label">Waiting for you</span>
        </div>
        <div className="card stat-card">
          <span className="stat-value">{app.historyLen}</span>
          <span className="stat-label">In current session</span>
        </div>
      </section>

      <section className="card control-card">
        <div className="control-copy">
          <strong>
            {active ? 'Observing locally' : app.observerMode === 'paused' ? 'Paused' : 'Disabled'}
          </strong>
          <p>
            {active
              ? 'The observer watches app usage on this device and surfaces repeated workflows here.'
              : app.observerMode === 'paused'
                ? 'The observer will keep its memory but stop noticing new work until you resume.'
                : 'Turn observation on when you want Allworks to look for repetitive work.'}
          </p>
        </div>
        <div className="card-actions">
          {active && (
            <button className="btn ghost" disabled={app.observerBusy} onClick={() => app.setObserverMode('paused')}>
              <IconPause width={14} height={14} />
              Pause observer
            </button>
          )}
          {app.observerMode === 'paused' && (
            <button className="btn primary" disabled={app.observerBusy} onClick={() => app.setObserverMode('observing')}>
              <IconPulse width={14} height={14} />
              Resume observer
            </button>
          )}
          {app.observerMode === 'disabled' && (
            <button className="btn primary" disabled={app.observerBusy} onClick={() => app.setObserverMode('observing')}>
              <IconPulse width={14} height={14} />
              Enable observer
            </button>
          )}
          {app.observerMode !== 'disabled' && (
            <button className="btn ghost danger-text" disabled={app.observerBusy} onClick={() => app.setObserverMode('disabled')}>
              Disable observer
            </button>
          )}
          <button className="btn ghost" disabled={app.observerBusy} onClick={() => app.observerClearHistory()}>
            <IconTrash width={14} height={14} />
            Clear history
          </button>
        </div>
      </section>

      <section>
        <h2 className="section-title">Latest suggestion</h2>
        {app.activeSuggestion ? (
          <SuggestionCard suggestion={app.activeSuggestion} />
        ) : (
          <div className="card empty-suggest pop-in">
            <span className="suggestion-icon dim">
              <IconSparkle width={20} height={20} />
            </span>
            <h3>Nothing repetitive yet</h3>
            <p>
              {active
                ? 'Keep working normally — a suggestion will appear here when a workflow repeats enough times to be worth automating.'
                : 'Enable the observer and work normally for a little while.'}
            </p>
          </div>
        )}
      </section>

      <section>
        <div className="section-row">
          <h2 className="section-title">Repeated inside your automations</h2>
          <button
            className="text-btn"
            disabled={scanning}
            onClick={() => scan()}
          >
            <IconRefresh width={14} height={14} />
            Rescan
          </button>
        </div>
        {app.automations.length === 0 ? (
          <div className="card empty-suggest">
            <p>Nothing to scan yet — record and save an automation first.</p>
          </div>
        ) : repeats.length === 0 ? (
          <div className="card empty-suggest">
            <p>No repeated sequences found across your {plural(app.automations.length, 'automation')}.</p>
          </div>
        ) : (
          <ul className="repeats-list">
            {repeats.map((sequence, i) => (
              <li key={i} className="card repeat-card">
                <div className="repeat-head">
                  <strong>
                    {plural(sequence.count, 'time')} across {plural(sequence.automation_ids.length, 'automation')}
                  </strong>
                </div>
                <div className="suggestion-steps">
                  {sequence.steps.map((action, j) => (
                    <span key={j} className="step-chip">
                      {describeActionShort(action)}
                    </span>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function StatusBadge() {
  const app = useApp();
  if (!app.observerMode) {
    return (
      <span className="status-badge loading">
        <span className="status-dot off shimmer" />
        Connecting…
      </span>
    );
  }
  const label = app.observerMode === 'observing' ? 'Active' : app.observerMode === 'paused' ? 'Paused' : 'Off';
  return (
    <span className={`status-badge ${app.observerMode}`}>
      <StatusDot tier={app.observerMode === 'observing' ? 'on' : app.observerMode === 'paused' ? 'paused' : 'off'} />
      {label}
    </span>
  );
}