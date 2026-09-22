import { useApp } from '../AppContext';
import {
  IconCheck,
  IconPause,
  IconPlus,
  IconSparkle,
  IconTrash,
  actionIcon,
} from '../components/icons';
import { EmptyState } from '../components/ui';
import { describeAction, plural } from '../format';
import type { Action } from '../types';

function TimelineStep({ index, action }: { index: number; action: Action }) {
  const Icon = actionIcon(action.action_type);
  return (
    <li className="tl-step">
      <div className="tl-rail">
        <span className={`tl-badge ${action.action_type}`}>
          <Icon width={15} height={15} />
        </span>
      </div>
      <div className="tl-content">
        <span className="tl-index">Step {String(index + 1).padStart(2, '0')}</span>
        <strong className="tl-action">{describeAction(action)}</strong>
        {action.target?.application && <span className="chip">{action.target.application}</span>}
      </div>
    </li>
  );
}

export default function ReviewView() {
  const app = useApp();

  if (app.recording) {
    return (
      <div className="view view-review">
        <header className="page-head">
          <div>
            <h1>Recording</h1>
            <p className="page-sub">Perform your steps in any other app now.</p>
          </div>
        </header>
        <div className="card recording-card pop-in">
          <span className="recording-dot" />
          <div>
            <strong>Recording in progress…</strong>
            <p>When you’re done, stop the recording to review what was captured.</p>
          </div>
          <button className="btn danger" onClick={() => app.stopRecording()}>
            <IconPause width={15} height={15} />
            Stop recording
          </button>
        </div>
      </div>
    );
  }

  if (app.captured.length === 0) {
    return (
      <div className="view view-review">
        <header className="page-head">
          <div>
            <h1>Review automation</h1>
            <p className="page-sub">Nothing to review yet.</p>
          </div>
        </header>
        <EmptyState
          icon={<IconSparkle width={22} height={22} />}
          title="No workflow captured"
          body="Record the steps you’d like to automate, or accept one of the observer’s suggestions and it will appear here."
          action={
            <button className="btn primary" onClick={() => app.startRecording()}>
              <IconPlus width={15} height={15} />
              Start recording
            </button>
          }
        />
      </div>
    );
  }

  const fromSuggestion = app.savingName.length > 0;

  return (
    <div className="view view-review">
      <header className="page-head">
        <div>
          <h1>Review automation</h1>
          <p className="page-sub">
            {fromSuggestion ? 'Suggested workflow, ready for you to keep.' : 'Workflow captured locally.'}
          </p>
        </div>
      </header>

      <div className="card review-card">
        {fromSuggestion && (
          <span className="kicker-badge">
            <IconCheck width={13} height={13} />
            Suggested automation
          </span>
        )}

        <h2 className="review-title">
          {fromSuggestion ? app.savingName : 'Untitled workflow'}
        </h2>
        <p className="review-meta">{plural(app.captured.length, 'step')} detected</p>

        <ol className="timeline">
          {app.captured.map((action, i) => (
            <TimelineStep key={i} index={i} action={action} />
          ))}
        </ol>

        <div className="review-save">
          <label htmlFor="automation-name">Automation name</label>
          <div className="save-row">
            <input
              id="automation-name"
              value={app.savingName}
              onChange={(e) => app.setSavingName(e.target.value)}
              placeholder={fromSuggestion ? app.savingName : 'e.g. Fill attendance form'}
            />
          </div>
          <div className="card-actions">
            <button
              className="btn primary"
              disabled={app.captured.length === 0}
              onClick={() => app.saveCaptured(app.savingName)}
            >
              <IconCheck width={15} height={15} />
              Save Automation
            </button>
            <button className="btn ghost" onClick={app.discardCapture}>
              <IconTrash width={14} height={14} />
              Discard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}