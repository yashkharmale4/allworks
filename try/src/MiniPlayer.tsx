import { useEffect, useState } from 'react';
import * as api from './api';
import { IconPlay, IconRecord, IconStop } from './components/icons';
import logoUrl from './assets/logo.png';

export default function MiniPlayer() {
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getRecordingStatus().then(setRecording).catch(() => {});
    let unlisten: Array<() => void> = [];
    api
      .onRecordingStarted(() => setRecording(true))
      .then((un) => unlisten.push(un))
      .catch(() => {});
    api
      .onRecordingCaptured(() => setRecording(false))
      .then((un) => unlisten.push(un))
      .catch(() => {});
    return () => {
      unlisten.forEach((un) => un());
    };
  }, []);

  async function start() {
    setError('');
    try {
      await api.startRecording();
    } catch (err) {
      const message = String(err);
      if (message.includes('already in progress')) {
        setRecording(true);
        return;
      }
      setError(message);
    }
  }

  async function stop() {
    setError('');
    try {
      await api.stopRecording();
    } catch (err) {
      const message = String(err);
      if (message.includes('no recording is in progress')) {
        setRecording(false);
        return;
      }
      setError(message);
      return;
    }
    // Hand the capture back to the full app, which reviews and saves it.
    await api.restoreFromPanel();
  }

  return (
    <div className="mini">
      <header className="mini-header" data-tauri-drag-region>
        <span className="mini-title" data-tauri-drag-region>
          <img src={logoUrl} className="logo mini-logo" alt="" draggable={false} />
          <strong data-tauri-drag-region>Allworks</strong>
        </span>
        <span data-tauri-drag-region className={recording ? 'mini-recording' : undefined}>
          {recording ? (
            <>
              <IconRecord width={13} height={13} /> Recording
            </>
          ) : (
            'Mini player'
          )}
        </span>
      </header>

      {error && <div className="error">{error}</div>}

      <div className="row mini-controls">
        <button className="btn primary" disabled={recording} onClick={() => start().catch((e) => setError(String(e)))}>
          <IconPlay width={14} height={14} /> Start
        </button>
        <button className="btn danger" disabled={!recording} onClick={() => stop().catch((e) => setError(String(e)))}>
          <IconStop width={14} height={14} /> Stop
        </button>
      </div>

      <button className="btn ghost mini-open" onClick={() => api.restoreFromPanel().catch((e) => setError(String(e)))}>
        Open full app
      </button>
    </div>
  );
}