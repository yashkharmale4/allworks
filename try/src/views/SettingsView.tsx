import { useApp } from '../AppContext';
import PrivacyNote from '../components/PrivacyNote';
import { IconLayers, IconMic, IconPulse } from '../components/icons';
import { plural } from '../format';
import { useState } from 'react';

export default function SettingsView() {
  const app = useApp();
  const [draft, setDraft] = useState(app.syncPath);

  async function saveSync() {
    await app.setSyncPath(draft);
    setDraft(draft.trim());
  }

  async function disableSync() {
    await app.setSyncPath('');
    setDraft('');
  }

  return (
    <div className="view view-settings">
      <header className="page-head">
        <div>
          <h1>Settings</h1>
          <p className="page-sub">Allworks runs entirely on this device.</p>
        </div>
      </header>

      <section>
        <h2 className="section-title">Observer</h2>
        <div className="card setting-card">
          <div className="setting-icon">
            <IconPulse width={18} height={18} />
          </div>
          <div className="setting-body">
            <strong>
              {app.observerMode === 'observing'
                ? 'Observer is active'
                : app.observerMode === 'paused'
                  ? 'Observer is paused'
                  : 'Observer is off'}
            </strong>
            <p>
              {app.observerMode === 'observing'
                ? 'Watching for repetitive workflows on this device.'
                : app.observerMode === 'paused'
                  ? 'Keeping its memory, but not noticing new work.'
                  : 'Observation is disabled — no activity is being tracked.'}
            </p>
            <div className="card-actions">
              {app.observerMode !== 'observing' && (
                <button className="btn primary" disabled={app.observerBusy} onClick={() => app.setObserverMode('observing')}>
                  Enable observer
                </button>
              )}
              {app.observerMode === 'observing' && (
                <button className="btn ghost" disabled={app.observerBusy} onClick={() => app.setObserverMode('paused')}>
                  Pause
                </button>
              )}
              {app.observerMode !== 'disabled' && (
                <button className="btn ghost danger-text" disabled={app.observerBusy} onClick={() => app.setObserverMode('disabled')}>
                  Disable
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      <section>
        <h2 className="section-title">Voice</h2>
        <div className="card setting-card">
          <div className="setting-icon">
            <IconMic width={18} height={18} />
          </div>
          <div className="setting-body">
            <strong>Speech recognition</strong>
            <p>
              {app.automations.length === 0
                ? 'No automations to run by voice yet — save one first.'
                : `${plural(app.automations.length, 'automation')} ready to run by voice, offline on this device.`}
            </p>
            <button className="btn ghost" onClick={() => app.setView('voice')}>
              Open voice
            </button>
          </div>
        </div>
      </section>

      <section>
        <h2 className="section-title">Sync</h2>
        <div className="card setting-card">
          <div className="setting-icon">
            <IconLayers width={18} height={18} />
          </div>
          <div className="setting-body">
            <strong>
              {app.syncPath ? 'Sharing the library through a shared file' : 'Offline — library lives on this machine only'}
            </strong>
            <p>
              Point Allworks on this machine and on your Mac at the same file in a synced folder
              (iCloud Drive, Dropbox, OneDrive, a network drive, ...). The whole library is
              mirrored both ways automatically — the last machine that saves wins.
            </p>
            <input
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="D:\Works\allworks\data\automations.json or /Users/you/Works/allworks/data/automations.json"
            />
            <div className="card-actions">
              <button className="btn primary" disabled={app.busy} onClick={saveSync}>
                Save sync file
              </button>
              {app.syncPath && (
                <button className="btn ghost" disabled={app.busy} onClick={disableSync}>
                  Disable sync
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      <section>
        <h2 className="section-title">Privacy</h2>
        <PrivacyNote />
      </section>
    </div>
  );
}