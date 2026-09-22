import { useEffect, useRef, useState } from 'react';
import { useApp } from '../AppContext';
import * as api from '../api';
import { IconArrowLeft, IconCheck, IconLock, IconPlay, IconStop } from '../components/icons';
import { actionIcon } from '../components/icons';
import { describeAction } from '../format';
import type { Action, Automation } from '../types';

function isEditableType(action: Action): boolean {
  if (action.action_type !== 'Type') return false;
  if (action.is_password) return false;
  const value = action.value ?? '';
  return value.length > 0 && !value.startsWith('{');
}

function displayValue(action: Action): string {
  if (action.is_password) return '\u2022\u2022\u2022\u2022\u2022\u2022';
  return action.value ?? '';
}

// Only steps whose `value` is *data* (text, keys, an ms timeout) show a value
// row. Click/Drag values are screen coordinates — what was clicked is already
// named by `describeAction`, and raw pixels are never shown.
function hasDataValue(action: Action): boolean {
  if (action.action_type === 'Type' || action.action_type === 'Shortcut' || action.action_type === 'Wait') {
    return true;
  }
  return false;
}

function applyEdits(automation: Automation, values: Record<number, string>): Automation {
  return {
    ...automation,
    steps: automation.steps.map((step, index) => {
      if (!isEditableType(step)) return step;
      const value = (values[index] ?? '').trim();
      return { ...step, value: value.length > 0 ? value : (step.value ?? '') };
    }),
  };
}

export default function EditView() {
  const app = useApp();
  const automation = app.editingAutomation;
  const [name, setName] = useState('');
  const [values, setValues] = useState<Record<number, string>>({});
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!automation) return;
    setName(automation.name);
    const next: Record<number, string> = {};
    automation.steps.forEach((step, index) => {
      if (isEditableType(step)) next[index] = step.value ?? '';
    });
    setValues(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [automation?.id]);

  if (!automation) {
    return (
      <div className="view">
        <header className="page-head">
          <div>
            <h1>Edit automation</h1>
            <p className="page-sub">Select an automation first.</p>
          </div>
        </header>
      </div>
    );
  }

  const edited = applyEdits(automation, values);
  const editableCount = automation.steps.filter(isEditableType).length;
  const finalName = name.trim() || edited.name;

  async function exportFile(format: 'json' | 'pdf') {
    setBusy(true);
    try {
      const path = await api.exportAutomationDoc({ ...edited, name: finalName }, format);
      app.toast(`${format.toUpperCase()} written to ${path}`, 'success');
    } catch (err) {
      app.toast(String(err), 'error');
    } finally {
      setBusy(false);
    }
  }

  async function importFile(file: File) {
    setBusy(true);
    try {
      const text = await file.text();
      const imported = await api.importAutomationJson(text);
      app.replaceEditing(imported);
      // The edit effect is keyed on the automation id, which survives
      // export/import — reset the local state manually so the freshly imported
      // values aren't overwritten by stale typed edits.
      setName(imported.name);
      const next: Record<number, string> = {};
      imported.steps.forEach((step, index) => {
        if (isEditableType(step)) next[index] = step.value ?? '';
      });
      setValues(next);
      app.toast(`Imported "${imported.name}" — updated data applied`, 'success');
    } catch (err) {
      app.toast(String(err), 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="view view-edit">
      <header className="page-head">
        <div>
          <h1>Edit automation</h1>
          <p className="page-sub">
            See every step and the data it feeds. Edit values here, or export the JSON, change the
            data, and import it back.
          </p>
        </div>
        <button className="btn ghost" onClick={app.closeEditing}>
          <IconArrowLeft width={15} height={15} />
          Back
        </button>
      </header>

      <input
        ref={fileRef}
        type="file"
        accept=".json,application/json"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) importFile(file);
          e.target.value = '';
        }}
      />

      <div className="card edit-controls">
        <label className="field">
          <span className="field-label">Name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Automation name" />
        </label>
        <div className="edit-toolbar">
          <button className="btn" disabled={busy} onClick={() => exportFile('json')}>
            Export JSON
          </button>
          <button className="btn" disabled={busy} onClick={() => exportFile('pdf')}>
            Export PDF
          </button>
          <button className="btn" disabled={busy} onClick={() => fileRef.current?.click()}>
            Import edited file
          </button>
        </div>
        <p className="page-sub">
          Export files go to your Allworks data folder. The JSON is the editable copy — change the
          values in it and import it back; the PDF is a printable step sheet.
        </p>
      </div>

      <div className="edit-summary">
        <span>
          {automation.steps.length} step{automation.steps.length === 1 ? '' : 's'}
        </span>
        <span className="dot-sep">·</span>
        <span>
          {editableCount} editable value{editableCount === 1 ? '' : 's'}
        </span>
      </div>

      <ul className="edit-steps">
        {automation.steps.map((step, index) => {
          const editable = isEditableType(step);
          const Icon = actionIcon(step.action_type);
          return (
            <li key={index} className={`card edit-step ${editable ? 'is-editable' : ''}`}>
              <div className="edit-step-icon">
                <Icon width={16} height={16} />
              </div>
              <div className="edit-step-body">
                <div className="edit-step-top">
                  <span className="edit-step-no">Step {index + 1}</span>
                  <span className={`tag ${editable ? 'tag-editable' : 'tag-fixed'}`}>
                    {editable ? 'editable' : 'fixed'}
                  </span>
                  {step.is_password && (
                    <span className="tag tag-password">
                      <IconLock width={11} height={11} />
                      password
                    </span>
                  )}
                </div>
                <span className="edit-step-action">{describeAction(step)}</span>
                <span className="edit-step-app">
                  {step.target?.application ?? 'unknown app'}
                </span>
                {editable ? (
                  <input
                    className="edit-step-value"
                    value={values[index] ?? ''}
                    onChange={(e) => setValues((s) => ({ ...s, [index]: e.target.value }))}
                    placeholder="type the new value"
                  />
                ) : hasDataValue(step) ? (
                  <span className="edit-step-value static">{displayValue(step)}</span>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>

      <div className="edit-actions">
        <button
          className="btn primary"
          disabled={app.busy || app.recording}
          onClick={() => app.runAutomation({ ...edited, name: finalName })}
        >
          <IconPlay width={15} height={15} /> Run with edits
        </button>
        {app.runs[edited.id] === 'running' && (
          <button className="btn danger" onClick={() => app.stopAutomation()}>
            <IconStop width={14} height={14} /> Stop
          </button>
        )}
        <button
          className="btn"
          disabled={app.busy || app.recording}
          onClick={() => app.saveEditedAutomation({ ...edited, name: finalName })}
        >
          <IconCheck width={15} height={15} /> Save as new automation
        </button>
      </div>
    </div>
  );
}