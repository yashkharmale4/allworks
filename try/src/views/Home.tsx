import { useApp } from '../AppContext';
import MicWidget from '../components/MicWidget';
import PrivacyNote from '../components/PrivacyNote';
import SuggestionCard from '../components/SuggestionCard';
import { IconSparkle } from '../components/icons';
import { TimeChip } from '../components/statusbits';
import { timeGreeting } from '../format';

export default function Home() {
  const app = useApp();

  const statusMeta = {
    observing: {
      tier: 'on' as const,
      label: 'Observing',
      copy: 'Allworks is watching for repetitive workflows locally on this device.',
      primary: 'Pause observer',
      primaryMode: 'paused' as const,
    },
    paused: {
      tier: 'paused' as const,
      label: 'Paused',
      copy: 'Allworks is paused. Repetitive work won’t be noticed until you resume.',
      primary: 'Resume observer',
      primaryMode: 'observing' as const,
    },
    disabled: {
      tier: 'off' as const,
      label: 'Off',
      copy: 'Observation is off. Turn it on and Allworks will quietly look for repetitive work.',
      primary: 'Enable observer',
      primaryMode: 'observing' as const,
    },
  };

  const meta = app.observerMode ? statusMeta[app.observerMode] : null;

  return (
    <div className="view view-home">
      <header className="page-head">
        <div>
          <h1>{timeGreeting()}</h1>
          <p className="page-sub">I’m quietly looking for repetitive work.</p>
        </div>
        <TimeChip />
      </header>

      <section className="grid grid-2-col">
        <div className="col-main">
          <div className={`card observer-hero ${meta ? meta.tier : 'loading'}`}>
            <div className="observer-hero-top">
              <StatusBadge />
            </div>
            <h2 className="observer-title">
              {app.observerMode === 'observing' && 'Watching your work'}
              {app.observerMode === 'paused' && 'Taking a break'}
              {app.observerMode === 'disabled' && 'Observer is off'}
              {!app.observerMode && 'Loading…'}
            </h2>
            <p className="observer-copy">
              {meta
                ? meta.copy
                : 'Connecting to the local observer.'}
            </p>

            <div className="observer-stats">
              <div className="stat">
                <strong className="stat-value">{app.actionsObserved}</strong>
                <span className="stat-label">Actions observed</span>
              </div>
              <div className="stat">
                <strong className="stat-value">{app.activeSuggestion ? 1 : 0}</strong>
                <span className="stat-label">Suggestion waiting</span>
              </div>
              <div className="stat">
                <strong className="stat-value">{app.historyLen}</strong>
                <span className="stat-label">In memory</span>
              </div>
            </div>

            {meta && (
              <div className="card-actions">
                <button
                  className="btn primary"
                  disabled={app.observerBusy}
                  onClick={() => app.setObserverMode(meta.primaryMode)}
                >
                  {meta.primary}
                </button>
                {app.observerMode !== 'disabled' && (
                  <button
                    className="btn ghost"
                    disabled={app.observerBusy}
                    onClick={() => app.setObserverMode('disabled')}
                  >
                    Disable
                  </button>
                )}
                {app.observerMode === 'disabled' && (
                  <button
                    className="btn ghost"
                    disabled={app.observerBusy}
                    onClick={() => app.observerClearHistory()}
                  >
                    Clear history
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="col-side">
          <MicWidget />
        </div>
      </section>

      <section>
        <h2 className="section-title">Suggestions</h2>
        {app.activeSuggestion ? (
          <SuggestionCard suggestion={app.activeSuggestion} />
        ) : (
          <div className="card empty-suggest pop-in">
            <span className="suggestion-icon dim">
              <IconSparkle width={20} height={20} />
            </span>
            <h3>Nothing repetitive yet</h3>
            <p>
              Keep working normally. Allworks will let you know when it notices something worth
              automating.
            </p>
          </div>
        )}
      </section>

      <PrivacyNote />
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
  const label =
    app.observerMode === 'observing' ? 'Observer active' : app.observerMode === 'paused' ? 'Observer paused' : 'Observer off';
  const dotTier = app.observerMode === 'observing' ? 'on' : app.observerMode === 'paused' ? 'paused' : 'off';
  return (
    <span className={`status-badge ${app.observerMode}`}>
      <span className={`status-dot ${dotTier}`} />
      {label}
    </span>
  );
}