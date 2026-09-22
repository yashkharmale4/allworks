import { useEffect, useState } from 'react';
import * as api from '../api';
import type { RescueRequest } from '../types';

function identity(request: RescueRequest): string {
  const target = request.action.target;
  const parts: string[] = [];
  if (target?.name) {
    parts.push(`"${target.name}"`);
  }
  if (target?.automation_id && target.automation_id !== target?.name) {
    parts.push(`#${target.automation_id}`);
  }
  if (target?.control_type) {
    parts.push(target.control_type);
  }
  if (parts.length === 0 && target?.role) {
    parts.push(target.role);
  }
  return parts.join(' ') || target?.application || 'the target element';
}

function kindLabel(actionType: string): string {
  switch (actionType) {
    case 'Click':
      return 'click';
    case 'Drag':
      return 'drag';
    case 'Type':
      return 'type into';
    default:
      return actionType.toLowerCase();
  }
}

export default function RescuePrompt() {
  const [prompt, setPrompt] = useState<RescueRequest | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let disposed = false;
    let unlisten: (() => void) | null = null;
    api
      .onRescueRequest((request) => {
        if (!disposed) {
          setPrompt(request);
        }
      })
      .then((un) => {
        if (disposed) un();
        else unlisten = un;
      })
      .catch(() => {});
    return () => {
      disposed = true;
      unlisten?.();
    };
  }, []);

  async function apply() {
    if (!prompt) return;
    setBusy(true);
    try {
      await api.rescueApply(prompt.rescue_id);
      setPrompt(null);
    } catch {
      setPrompt(null);
    } finally {
      setBusy(false);
    }
  }

  async function cancel() {
    if (!prompt) return;
    setBusy(true);
    try {
      await api.rescueCancel(prompt.rescue_id);
      setPrompt(null);
    } catch {
      setPrompt(null);
    } finally {
      setBusy(false);
    }
  }

  if (!prompt) return null;

  return (
    <div className="rescue-backdrop" role="dialog" aria-modal="true" aria-label="Re-point a failed step">
      <div className="rescue-panel">
        <div className="rescue-title">Couldn’t find the element</div>
        <p className="rescue-copy">
          In “<strong>{prompt.automation_name}</strong>”, step {prompt.step_index + 1} tries to{' '}
          {kindLabel(prompt.action.action_type)} <strong>{identity(prompt)}</strong> in{' '}
          <strong>{prompt.action.target?.application ?? 'its app'}</strong>, but that element can’t
          be found anymore — the UI may have changed since you recorded it.
        </p>
        <p className="rescue-hint">
          Move the mouse onto the element it should act on, then choose “Use it”. The fix is saved
          back into the automation so future runs keep working.
        </p>
        <div className="rescue-actions">
          <button className="btn primary" onClick={apply} disabled={busy}>
            Use element at pointer
          </button>
          <button className="btn ghost" onClick={cancel} disabled={busy}>
            Cancel run
          </button>
        </div>
      </div>
    </div>
  );
}