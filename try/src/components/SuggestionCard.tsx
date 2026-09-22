import { useState } from 'react';
import { useApp } from '../AppContext';
import { describeActionShort, plural } from '../format';
import type { ObserverSuggestion } from '../types';
import { actionIcon, IconArrowRight, IconInfo, IconSparkle } from './icons';
import { Modal } from './ui';

export default function SuggestionCard({ suggestion }: { suggestion: ObserverSuggestion }) {
  const app = useApp();
  const [showWhy, setShowWhy] = useState(false);
  const [naming, setNaming] = useState(false);
  const [namingValue, setNamingValue] = useState('');
  const preview = suggestion.steps.slice(0, 4);
  const more = suggestion.steps.length - preview.length;
  const Icon = actionIcon;

  function runSuggestionNow() {
    app.runAutomation({
      id: `suggest-${Date.now().toString(36)}`,
      name: suggestion.name,
      steps: suggestion.steps,
      run_count: 0,
      created_at: Date.now(),
    });
  }

  return (
    <div className="card suggestion-card pop-in">
      <div className="suggestion-head">
        <span className="suggestion-icon">
          <IconSparkle width={20} height={20} />
        </span>
        <div className="suggestion-heading">
          <span className="kicker">I noticed something repetitive</span>
          <h3>{suggestion.name}</h3>
        </div>
        <button className="text-btn" onClick={() => setShowWhy(true)}>
          <IconInfo width={14} height={14} />
          Why this suggestion?
        </button>
      </div>

      <p className="suggestion-summary">
        You performed this {plural(suggestion.steps.length, 'step')} workflow{' '}
        {plural(suggestion.count, 'time')}.
      </p>

      {suggestion.apps.length > 0 && (
        <div className="chips">
          {suggestion.apps.map((appName) => (
            <span key={appName} className="chip">
              {appName}
            </span>
          ))}
        </div>
      )}

      <div className="suggestion-steps">
        {preview.map((action, i) => {
          const Cmp = Icon(action.action_type);
          return (
            <span key={i} className="step-chip">
              <Cmp width={13} height={13} />
              {describeActionShort(action)}
            </span>
          );
        })}
        {more > 0 && <span className="step-chip">+{more} more</span>}
      </div>

      <div className="card-actions">
        <button
          className="btn primary"
          disabled={app.observerBusy}
          onClick={() => {
            setNamingValue(suggestion.name);
            setNaming(true);
          }}
        >
          Automate this
        </button>
        <button
          className="btn play"
          disabled={app.observerBusy}
          onClick={runSuggestionNow}
          title="Run these steps now without saving them"
        >
          <IconArrowRight width={15} height={15} />
          Run now
        </button>
        <button
          className="btn ghost"
          disabled={app.observerBusy}
          onClick={() => app.observerDismiss(suggestion.fingerprint)}
        >
          Not now
        </button>
        <button
          className="btn ghost danger-text"
          disabled={app.observerBusy}
          onClick={() => app.observerSuppress(suggestion.fingerprint)}
        >
          Don’t suggest this workflow
        </button>
      </div>

      {showWhy && (
        <Modal title="Why this suggestion?" onClose={() => setShowWhy(false)} width={380}>
          <p className="modal-copy">
            Allworks noticed this workflow was repeated <strong>{plural(suggestion.count, 'time')}</strong> today,
            with <strong>{plural(suggestion.steps.length, 'step')}</strong>.
          </p>
          {suggestion.apps.length > 0 && (
            <div className="chips">
              {suggestion.apps.map((appName) => (
                <span key={appName} className="chip">
                  {appName}
                </span>
              ))}
            </div>
          )}
          <button className="btn primary" onClick={() => setShowWhy(false)}>
            Got it
          </button>
        </Modal>
      )}

      {naming && (
        <Modal title="Save this workflow" onClose={() => setNaming(false)} width={400}>
          <p className="modal-copy">
            {plural(suggestion.steps.length, 'step')} captured. Give it a name and it’ll be saved
            to your automations, ready to run.
          </p>
          <input
            value={namingValue}
            onChange={(e) => setNamingValue(e.target.value)}
            placeholder="Automation name"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                app.observerAutomateAndSave(suggestion.fingerprint, namingValue, false);
                setNaming(false);
              }
            }}
          />
          <div className="modal-actions">
            <button
              className="btn ghost"
              disabled={app.observerBusy}
              onClick={() => {
                app.observerAutomateAndSave(suggestion.fingerprint, namingValue, true);
                setNaming(false);
              }}
            >
              Save &amp; run
            </button>
            <button
              className="btn primary"
              disabled={app.observerBusy}
              onClick={() => {
                app.observerAutomateAndSave(suggestion.fingerprint, namingValue, false);
                setNaming(false);
              }}
            >
              Save
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}