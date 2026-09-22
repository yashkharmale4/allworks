import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import * as api from './api';
import type {
  Action,
  Automation,
  ObserverMode,
  ObserverSuggestion,
  RunStatus,
  Toast,
  ToastKind,
  ViewId,
  VoicePhase,
} from './types';

function newId(): string {
  // crypto.randomUUID() throws in non-secure contexts (e.g. a custom HTTP
  // origin in some WebView2 hosts); never let that take down a save.
  const c = (globalThis as { crypto?: Crypto }).crypto;
  if (c?.randomUUID) {
    try {
      return c.randomUUID();
    } catch {
      /* fall through to the manual id */
    }
  }
  const rand = () => Math.floor(Math.random() * 0xffff).toString(16).padStart(4, '0');
  return `${Date.now().toString(16)}-${rand()}-${rand()}-${rand()}`;
}

interface AppStore {
  view: ViewId;
  setView: (view: ViewId) => void;

  automations: Automation[];
  captured: Action[];
  recording: boolean;
  savingName: string;
  setSavingName: (name: string) => void;
  busy: boolean;

  observerMode: ObserverMode | null;
  actionsObserved: number;
  suggestionsMade: number;
  historyLen: number;
  activeSuggestion: ObserverSuggestion | null;
  observerBusy: boolean;

  runs: Record<string, RunStatus>;

  syncPath: string;
  setSyncPath: (path: string) => Promise<void>;

  editingAutomation: Automation | null;
  openEditing: (id: string) => void;
  closeEditing: () => void;
  replaceEditing: (automation: Automation) => void;
  saveEditedAutomation: (automation: Automation) => Promise<void>;

  voicePhase: VoicePhase;
  voiceTranscript: string;
  voiceMatched: string | null;

  error: string | null;
  clearError: () => void;

  toasts: Toast[];
  toast: (message: string, kind?: ToastKind) => void;
  dismissToast: (id: number) => void;

  refresh: () => Promise<void>;
  refreshObserver: () => Promise<void>;

  startRecording: () => Promise<void>;
  stopRecording: () => Promise<void>;
  saveCaptured: (name: string) => Promise<void>;
  deleteAutomation: (id: string) => Promise<void>;
  runAutomation: (automation: Automation) => Promise<void>;
  stopAutomation: () => Promise<void>;
  discardCapture: () => void;

  setObserverMode: (mode: ObserverMode) => Promise<void>;
  observerAutomate: (fingerprint: string) => Promise<void>;
  observerAutomateAndSave: (fingerprint: string, name: string, runNow: boolean) => Promise<void>;
  observerDismiss: (fingerprint: string) => Promise<void>;
  observerSuppress: (fingerprint: string) => Promise<void>;
  observerClearHistory: () => Promise<void>;

  runVoice: () => Promise<void>;
  resetVoice: () => void;

  floatToPanel: () => Promise<void>;
}

const Ctx = createContext<AppStore | null>(null);

export function useApp(): AppStore {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}

let toastSeq = 0;

export function AppProvider({ children }: { children: ReactNode }) {
  const [view, setView] = useState<ViewId>('home');
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [captured, setCaptured] = useState<Action[]>([]);
  const [recording, setRecording] = useState(false);
  const [savingName, setSavingName] = useState('');
  const [busy, setBusy] = useState(false);

  const [observerMode, setObserverMode] = useState<ObserverMode | null>(null);
  const [actionsObserved, setActionsObserved] = useState(0);
  const [suggestionsMade, setSuggestionsMade] = useState(0);
  const [historyLen, setHistoryLen] = useState(0);
  const [activeSuggestion, setActiveSuggestion] = useState<ObserverSuggestion | null>(null);
  const [observerBusy, setObserverBusy] = useState(false);

  const [runs] = useState<Record<string, RunStatus>>({});
  const [syncPath, setSyncPathState] = useState('');
  const [editingAutomation, setEditingAutomation] = useState<Automation | null>(null);

  const [voicePhase, setVoicePhase] = useState<VoicePhase>('idle');
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [voiceMatched, setVoiceMatched] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

  function toast(message: string, kind: ToastKind = 'info') {
    toastSeq += 1;
    const id = toastSeq;
    setToasts((list) => [...list, { id, message, kind }]);
    window.setTimeout(() => {
      setToasts((list) => list.filter((t) => t.id !== id));
    }, 3800);
  }

  function dismissToast(id: number) {
    setToasts((list) => list.filter((t) => t.id !== id));
  }

  function clearError() {
    setError(null);
  }

  function fail(message: unknown) {
    const text = String(message);
    setError(text);
    toast(text, 'error');
  }

  async function refresh() {
    const loaded = await api.loadAutomations();
    setAutomations([...loaded].sort((a, b) => b.created_at - a.created_at));
    api
      .getSyncPath()
      .then((path) => setSyncPathState(path ?? ''))
      .catch(() => {});
  }

  async function setSyncPath(path: string) {
    setError(null);
    try {
      await api.setSyncPath(path);
      setSyncPathState(path.trim());
      await refresh().catch(fail);
      toast(
        path.trim() ? 'Sync set — library now shared through this file' : 'Sync disabled',
        'success',
      );
    } catch (err) {
      fail(err);
    }
  }

  async function refreshObserver() {
    const status = await api.observerGetStatus();
    setObserverMode(status.mode);
    setActionsObserved(status.actions_observed);
    setSuggestionsMade(status.suggestions_made);
    setHistoryLen(status.history_len);
    setActiveSuggestion(status.active_suggestion);
  }

  useEffect(() => {
    refresh().catch(fail);
    refreshObserver().catch(fail);
  }, []);

  useEffect(() => {
    let unlisten: Array<() => void> = [];
    api
      .onRecordingStarted(() => {
        setRecording(true);
        setCaptured([]);
        setSavingName('');
      })
      .then((un) => unlisten.push(un))
      .catch(() => {});
    api
      .onRecordingCaptured(({ actions }) => {
        setCaptured(actions);
        setRecording(false);
        setSavingName('');
        // Land on the review screen whatever the capture source (main window
        // or mini player) — there's no sidebar link to Review, so without this
        // a capture stopped from the mini player is stuck and unsaveable.
        setView('review');
      })
      .then((un) => unlisten.push(un))
      .catch(() => {});
    api
      .onAutomationsSaved(() => {
        refresh().catch(fail);
      })
      .then((un) => unlisten.push(un))
      .catch(() => {});
    api
      .onObserverSuggestion(() => {
        refreshObserver().catch(fail);
      })
      .then((un) => unlisten.push(un))
      .catch(() => {});
    api
      .onObserverAutomationReady((payload) => {
        setCaptured(payload.actions);
        setSavingName(payload.suggested_name);
        setRecording(false);
        setView('review');
        refreshObserver().catch(fail);
      })
      .then((un) => unlisten.push(un))
      .catch(() => {});
    return () => {
      unlisten.forEach((un) => un());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function startRecording() {
    setError(null);
    try {
      await api.startRecording();
      setCaptured([]);
      setSavingName('');
      setRecording(true);
      setView('review');
      toast('Recording — perform your steps', 'info');
    } catch (err) {
      fail(err);
    }
  }

  async function stopRecording() {
    setError(null);
    try {
      const actions = await api.stopRecording();
      setCaptured(actions);
      setRecording(false);
      setSavingName('');
      setView('review');
    } catch (err) {
      fail(err);
    }
  }

  async function saveCaptured(name: string) {
    setError(null);
    if (captured.length === 0) return;
    const finalName = name.trim() || `Automation ${new Date().toLocaleTimeString()}`;
    try {
      await api.saveAutomation({
        id: newId(),
        name: finalName,
        steps: captured,
        run_count: 0,
        created_at: Date.now(),
      });
    } catch (err) {
      fail(err);
      return;
    }
    setCaptured([]);
    setSavingName('');
    await refresh().catch(fail);
    setView('automations');
    toast(`Saved "${finalName}"`, 'success');
  }

  async function deleteAutomation(id: string) {
    setError(null);
    try {
      await api.deleteAutomation(id);
      await refresh();
      toast('Automation deleted', 'info');
    } catch (err) {
      fail(err);
    }
  }

  async function runAutomation(_automation: Automation) {
    setError(null);
    toast(
      'To run an automation, download the Allworks software and run it locally on this device.',
      'info',
    );
  }

  async function stopAutomation() {
    try {
      await api.stopAutomation();
      toast('Stopping automation…', 'info');
    } catch (err) {
      fail(err);
    }
  }

  async function setObserverModeAction(mode: ObserverMode) {
    setError(null);
    setObserverBusy(true);
    try {
      await api.observerSetMode(mode);
      await refreshObserver();
      if (mode === 'observing') toast('Observer resumed', 'success');
      if (mode === 'paused') toast('Observer paused', 'info');
      if (mode === 'disabled') toast('Observer disabled', 'info');
    } catch (err) {
      fail(err);
    } finally {
      setObserverBusy(false);
    }
  }

  async function observerAutomate(fingerprint: string) {
    setError(null);
    setObserverBusy(true);
    try {
      await api.observerAutomate(fingerprint);
      await refreshObserver();
    } catch (err) {
      fail(err);
    } finally {
      setObserverBusy(false);
    }
  }

  async function observerAutomateAndSave(fingerprint: string, name: string, runNow: boolean) {
    setError(null);
    setObserverBusy(true);
    try {
      const saved = await api.observerAutomateAndSave(fingerprint, name);
      await refresh();
      await refreshObserver().catch(fail);
      setView('automations');
      toast(`Saved "${saved.name}"`, 'success');
      if (runNow) {
        await runAutomation(saved);
      }
    } catch (err) {
      fail(err);
    } finally {
      setObserverBusy(false);
    }
  }

  async function observerDismiss(fingerprint: string) {
    setError(null);
    try {
      await api.observerDismiss(fingerprint);
      await refreshObserver();
      toast('Suggestion dismissed', 'info');
    } catch (err) {
      fail(err);
    }
  }

  async function observerSuppress(fingerprint: string) {
    setError(null);
    try {
      await api.observerSuppress(fingerprint);
      await refreshObserver();
      toast('This workflow won’t be suggested again', 'info');
    } catch (err) {
      fail(err);
    }
  }

  async function observerClearHistory() {
    setError(null);
    try {
      await api.observerClearHistory();
      await refreshObserver();
      toast('Observer history cleared', 'info');
    } catch (err) {
      fail(err);
    }
  }

  async function runVoice() {
    setError(null);
    if (automations.length === 0) {
      toast('Record an automation first to use voice', 'error');
      return;
    }
    setVoicePhase('listening');
    setVoiceTranscript('');
    setVoiceMatched(null);
    setBusy(true);
    try {
      const result = await api.voiceRun();
      setVoiceTranscript(result.recognized);
      if (result.matched) {
        setVoicePhase('matched');
        setVoiceMatched(result.matched);
        toast(
          `Matched "${result.matched}". To run it, download the Allworks software and run it locally on this device.`,
          'info',
        );
        await refresh().catch(fail);
      } else {
        setVoicePhase('nomatch');
      }
    } catch (err) {
      setVoicePhase('error');
      fail(err);
    } finally {
      setBusy(false);
    }
  }

  function resetVoice() {
    setVoicePhase('idle');
    setVoiceTranscript('');
    setVoiceMatched(null);
  }

  function discardCapture() {
    setCaptured([]);
    setSavingName('');
    setRecording(false);
  }

  function openEditing(id: string) {
    const found = automations.find((a) => a.id === id);
    if (!found) return;
    setEditingAutomation(found);
    setView('edit');
  }

  function closeEditing() {
    setEditingAutomation(null);
    setView('automations');
  }

  function replaceEditing(automation: Automation) {
    setEditingAutomation(automation);
  }

  async function saveEditedAutomation(automation: Automation) {
    setError(null);
    const name = automation.name.trim() || 'Edited automation';
    try {
      await api.saveAutomation({
        ...automation,
        id: newId(),
        name,
        created_at: Date.now(),
      });
    } catch (err) {
      fail(err);
      return;
    }
    setEditingAutomation(null);
    await refresh().catch(fail);
    setView('automations');
    toast(`Saved "${name}"`, 'success');
  }

  async function floatToPanel() {
    setError(null);
    try {
      await api.floatToPanel();
    } catch (err) {
      fail(err);
    }
  }

  const store: AppStore = {
    view,
    setView,
    automations,
    captured,
    recording,
    savingName,
    setSavingName,
    busy,
    observerMode,
    actionsObserved,
    suggestionsMade,
    historyLen,
    activeSuggestion,
    observerBusy,
    runs,
    syncPath,
    setSyncPath,
    editingAutomation,
    openEditing,
    closeEditing,
    replaceEditing,
    saveEditedAutomation,
    voicePhase,
    voiceTranscript,
    voiceMatched,
    error,
    clearError,
    toasts,
    toast,
    dismissToast,
    refresh,
    refreshObserver,
    startRecording,
    stopRecording,
    saveCaptured,
    deleteAutomation,
    runAutomation,
    stopAutomation,
    discardCapture,
    setObserverMode: setObserverModeAction,
    observerAutomate,
    observerAutomateAndSave,
    observerDismiss,
    observerSuppress,
    observerClearHistory,
    runVoice,
    resetVoice,
    floatToPanel,
  };

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}