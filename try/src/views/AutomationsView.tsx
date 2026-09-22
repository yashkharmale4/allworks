import { useEffect, useMemo, useState } from 'react';
import { useApp } from '../AppContext';
import {
  IconArrowRight,
  IconCheck,
  IconDots,
  IconEdit,
  IconLayers,
  IconPlus,
  IconSearch,
  IconStop,
  IconTrash,
  IconX,
} from '../components/icons';
import { EmptyState, Modal } from '../components/ui';
import { formatDate, plural } from '../format';
import type { Automation, RunStatus } from '../types';

function RunGlyph({ status }: { status?: RunStatus }) {
  if (status === 'running') return <span className="spinner" />;
  if (status === 'success') return <IconCheck width={14} height={14} />;
  return <IconArrowRight width={14} height={14} />;
}

export default function AutomationsView() {
  const app = useApp();
  const [query, setQuery] = useState('');
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Automation | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return app.automations;
    return app.automations.filter(
      (a) => a.name.toLowerCase().includes(q) || plural(a.steps.length, 'step').includes(q),
    );
  }, [app.automations, query]);

  useEffect(() => {
    const onClick = () => setMenuOpen(null);
    window.addEventListener('click', onClick);
    return () => window.removeEventListener('click', onClick);
  }, []);

  return (
    <div className="view view-automations">
      <header className="page-head">
        <div>
          <h1>Automations</h1>
          <p className="page-sub">Your library of saved workflows.</p>
        </div>
        <button
          className="btn primary"
          onClick={() => app.startRecording()}
          disabled={app.recording}
        >
          <IconPlus width={15} height={15} />
          New Automation
        </button>
      </header>

      <div className="searchbox">
        <IconSearch width={15} height={15} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search automations…"
        />
        {query && (
          <button className="icon-btn" onClick={() => setQuery('')} title="Clear search">
            <IconX width={13} height={13} />
          </button>
        )}
      </div>

      {app.automations.length === 0 ? (
        <EmptyState
          icon={<IconLayers width={22} height={22} />}
          title="No automations yet"
          body="Record a workflow once, review it, and save it. Then run it instantly — or by voice."
          action={
            <button
              className="btn primary"
              onClick={() => app.startRecording()}
              disabled={app.recording}
            >
              <IconPlus width={15} height={15} />
              Record your first automation
            </button>
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<IconSearch width={22} height={22} />}
          title={`No results for “${query}”`}
          body="Try a different name, or clear the search."
        />
      ) : (
        <ul className="automation-list">
          {filtered.map((automation) => {
            const status = app.runs[automation.id];
            return (
              <li key={automation.id} className={`card automation-card ${status ? `is-${status}` : ''}`}>
                <div className="automation-icon">
                  <IconLayers width={18} height={18} />
                </div>
                <div className="automation-meta">
                  <strong className="automation-name">{automation.name}</strong>
                  <span className="automation-sub">
                    {plural(automation.steps.length, 'step')} · ran {plural(automation.run_count, 'time')} ·
                    created {formatDate(automation.created_at)}
                  </span>
                </div>
                <div className="automation-actions">
                  <button
                    className={`btn ${status === 'running' ? 'ghost' : 'play'}`}
                    disabled={app.busy || app.recording || status === 'running'}
                    onClick={() => app.runAutomation(automation)}
                  >
                    {status === 'running' ? (
                      <>
                        <span className="spinner" /> Running…
                      </>
                    ) : status === 'success' ? (
                      <>
                        <IconCheck width={14} height={14} /> Completed
                      </>
                    ) : status === 'failed' ? (
                      <>
                        <IconArrowRight width={14} height={14} /> Retry
                      </>
                    ) : (
                      <>
                        <RunGlyph status={status} /> Run
                      </>
                    )}
                  </button>
                  {status === 'running' && (
                    <button
                      className="btn danger"
                      title="Stop automation"
                      onClick={() => app.stopAutomation()}
                    >
                      <IconStop width={13} height={13} /> Stop
                    </button>
                  )}
                  <div className="menu-wrap">
                    <button
                      className="icon-btn"
                      title="More options"
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuOpen(menuOpen === automation.id ? null : automation.id);
                      }}
                    >
                      <IconDots width={16} height={16} />
                    </button>
                    {menuOpen === automation.id && (
                      <div className="menu" onClick={(e) => e.stopPropagation()}>
                        <button
                          className="menu-item"
                          onClick={() => {
                            app.openEditing(automation.id);
                            setMenuOpen(null);
                          }}
                        >
                          <IconEdit width={14} height={14} />
                          Edit automation
                        </button>
                        <button
                          className="menu-item danger"
                          onClick={() => {
                            setDeleteTarget(automation);
                            setMenuOpen(null);
                          }}
                        >
                          <IconTrash width={14} height={14} />
                          Delete automation
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {deleteTarget && (
        <Modal
          title="Delete automation?"
          onClose={() => setDeleteTarget(null)}
          width={360}
        >
          <p className="modal-copy">
            “<strong>{deleteTarget.name}</strong>” ({plural(deleteTarget.steps.length, 'step')}) will be
            permanently removed. This can’t be undone.
          </p>
          <div className="modal-actions">
            <button className="btn ghost" onClick={() => setDeleteTarget(null)}>
              Cancel
            </button>
            <button
              className="btn danger"
              onClick={() => {
                app.deleteAutomation(deleteTarget.id);
                setDeleteTarget(null);
              }}
            >
              Delete
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}