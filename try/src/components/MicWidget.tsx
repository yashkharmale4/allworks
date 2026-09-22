import { useApp } from '../AppContext';
import { plural } from '../format';
import { IconCheck, IconMic } from './icons';

export default function MicWidget() {
  const app = useApp();
  const matchedAutomation = app.voiceMatched
    ? app.automations.find((a) => a.name === app.voiceMatched)
    : undefined;

  if (app.voicePhase === 'matched' && matchedAutomation) {
    return (
      <div className="card mic-result pop-in">
        <div className="mic-result-head">
          <span className="check-badge">
            <IconCheck width={18} height={18} />
          </span>
          <div>
            <span className="kicker">Voice matched</span>
            <h3>{matchedAutomation.name}</h3>
            <p className="mic-result-meta">
              {plural(matchedAutomation.steps.length, 'step')} · now playing
            </p>
          </div>
        </div>
        <div className="card-actions">
          <button className="btn primary" onClick={() => app.runVoice()}>
            Run again
          </button>
          <button className="btn ghost" onClick={app.resetVoice}>
            Dismiss
          </button>
        </div>
      </div>
    );
  }

  const label =
    app.voicePhase === 'listening'
      ? 'Listening…'
      : app.voicePhase === 'nomatch'
        ? 'Didn’t match that'
        : app.voicePhase === 'error'
          ? 'Something went wrong'
          : 'Ask Allworks';

  const sub =
    app.voicePhase === 'listening'
      ? 'Say an automation name'
      : app.voicePhase === 'nomatch'
        ? `I heard “${app.voiceTranscript || '…'}” — try again, or say the exact name`
        : app.voicePhase === 'error'
          ? app.error ?? 'Try again in a moment.'
          : 'Say an automation name to run it';

  const showTranscript = app.voicePhase === 'listening' && app.voiceTranscript;

  return (
    <div className={`card mic-card ${app.voicePhase === 'listening' ? 'is-listening' : ''}`}>
      <button
        className="mic-button"
        disabled={app.busy || app.recording}
        onClick={() => app.runVoice()}
        title="Listen for a voice command"
      >
        {app.voicePhase === 'listening' ? (
          <span className="mic-rings" aria-hidden="true" />
        ) : (
          <IconMic width={26} height={26} />
        )}
      </button>
      <div className="mic-text">
        <strong>{label}</strong>
        <span>{sub}</span>
        {showTranscript && <em>“{app.voiceTranscript}”</em>}
      </div>
      {app.automations.length === 0 && app.voicePhase === 'idle' && (
        <p className="mic-hint">Record and save an automation first, then say its name to run it by voice.</p>
      )}
      {(app.voicePhase === 'nomatch' || app.voicePhase === 'error') && (
        <div className="card-actions">
          <button className="btn ghost" onClick={app.resetVoice}>
            Dismiss
          </button>
        </div>
      )}
      {app.voicePhase === 'idle' && app.voiceTranscript && (
        <span className="mic-recent">Last: “{app.voiceTranscript}”</span>
      )}
    </div>
  );
}