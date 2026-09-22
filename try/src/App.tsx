import { useEffect, useState } from 'react';
import * as api from './api';
import logoUrl from './assets/logo.png';
import MiniPlayer from './MiniPlayer';
import { AppProvider, useApp } from './AppContext';
import RescuePrompt from './components/RescuePrompt';
import {
  IconHome,
  IconLayers,
  IconMic,
  IconPanel,
  IconSliders,
  IconSparkle,
  IconTable,
  IconX,
} from './components/icons';
import { Modal, StatusDot, Toasts } from './components/ui';
import type { ViewId } from './types';
import AutomationsView from './views/AutomationsView';
import EditView from './views/EditView';
import ExcelView from './views/ExcelView';
import Home from './views/Home';
import ReviewView from './views/ReviewView';
import SettingsView from './views/SettingsView';
import SuggestionsView from './views/SuggestionsView';
import VoiceView from './views/VoiceView';

function NavLink({ view, icon, label, badge }: { view: ViewId; icon: React.ReactNode; label: string; badge?: number }) {
  const app = useApp();
  const active = app.view === view;
  return (
    <button
      className={`nav-link ${active ? 'active' : ''}`}
      onClick={() => app.setView(view)}
      title={label}
    >
      <span className="nav-icon">{icon}</span>
      <span className="nav-label">{label}</span>
      {badge !== undefined && badge > 0 && <span className="nav-badge">{badge}</span>}
    </button>
  );
}

function Shell() {
  const app = useApp();
  const [firstRunOpen, setFirstRunOpen] = useState(false);

  useEffect(() => {
    if (app.observerMode === null) return;
    if (!localStorage.getItem('aw:welcomed')) {
      setFirstRunOpen(true);
    }
  }, [app.observerMode]);

  function finishFirstRun(enable?: boolean) {
    localStorage.setItem('aw:welcomed', '1');
    setFirstRunOpen(false);
    if (enable) {
      app.setObserverMode('observing');
    }
  }

  const observerTier = !app.observerMode
    ? ('off' as const)
    : app.observerMode === 'disabled'
      ? ('off' as const)
      : (app.observerMode as 'on' | 'paused');

  let content: React.ReactNode;
  switch (app.view) {
    case 'home':
      content = <Home />;
      break;
    case 'automations':
      content = <AutomationsView />;
      break;
    case 'suggestions':
      content = <SuggestionsView />;
      break;
    case 'review':
      content = <ReviewView />;
      break;
    case 'edit':
      content = <EditView />;
      break;
    case 'excel':
      content = <ExcelView />;
      break;
    case 'voice':
      content = <VoiceView />;
      break;
    case 'settings':
      content = <SettingsView />;
      break;
  }

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <img src={logoUrl} className="logo" alt="Allworks logo" draggable={false} />
          <span className="brand-name">Allworks</span>
        </div>

        <nav className="sidebar-nav">
          <NavLink view="home" icon={<IconHome width={16} height={16} />} label="Home" />
          <NavLink view="automations" icon={<IconLayers width={16} height={16} />} label="Automations" badge={app.automations.length} />
          <NavLink view="excel" icon={<IconTable width={16} height={16} />} label="Excel" />
          <NavLink view="suggestions" icon={<IconSparkle width={16} height={16} />} label="Suggestions" badge={app.activeSuggestion ? 1 : 0} />
        </nav>

        <nav className="sidebar-nav sub">
          <NavLink view="voice" icon={<IconMic width={16} height={16} />} label="Voice" />
          <NavLink view="settings" icon={<IconSliders width={16} height={16} />} label="Settings" />
        </nav>

        <div className="sidebar-footer">
          <button className="mini-btn" onClick={() => app.floatToPanel()} title="Switch to the always-on-top mini player">
            <IconPanel width={15} height={15} />
            Mini player
          </button>
          <button className="observer-pill" onClick={() => app.setView('suggestions')}>
            <StatusDot tier={observerTier} />
            Observer {app.observerMode === 'observing' ? 'on' : app.observerMode === 'paused' ? 'paused' : 'off'}
          </button>
        </div>
      </aside>

      <main className="content" data-view={app.view}>
        {app.error && (
          <div className="error-strip">
            <span>{app.error}</span>
            <button className="icon-btn" onClick={app.clearError} title="Dismiss">
              <IconX width={13} height={13} />
            </button>
          </div>
        )}
        {content}
      </main>

      {app.recording && (
        <div className="recording-pill">
          <span className="recording-dot" />
          <span>Recording…</span>
          <button className="btn danger" onClick={() => app.stopRecording()}>
            Stop
          </button>
        </div>
      )}

      <Toasts toasts={app.toasts} onDismiss={app.dismissToast} />

      <RescuePrompt />

      {firstRunOpen && (
        <Modal title="Welcome to Allworks" onClose={() => finishFirstRun(false)} width={400}>
          <p className="modal-copy">
            <strong>Work normally.</strong> We’ll point out repetitive tasks worth automating — all
            locally, nothing uploaded.
          </p>
          <div className="modal-actions">
            <button className="btn primary" onClick={() => finishFirstRun(true)}>
              Enable observer
            </button>
            <button className="btn ghost" onClick={() => finishFirstRun(false)}>
              Maybe later
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function App() {
  const [windowLabel, setWindowLabel] = useState<string | null>(null);

  useEffect(() => {
    api
      .getWindowLabel()
      .then(setWindowLabel)
      .catch(() => setWindowLabel('main'));
  }, []);

  if (windowLabel === null) {
    return <div className="boot">Allworks</div>;
  }

  if (windowLabel === 'panel') {
    return <MiniPlayer />;
  }

  return (
    <AppProvider>
      <Shell />
    </AppProvider>
  );
}

export default App;