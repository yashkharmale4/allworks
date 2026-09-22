import type {
  Action,
  AppendResult,
  Automation,
  ContactRecord,
  ExtractResult,
  ObserverAutomationReady,
  ObserverMode,
  ObserverSuggestion,
  ObserverStatus,
  RecordingCaptured,
  RepeatedSequence,
  RescueRequest,
  VoiceResult,
} from './types';

// ============================================================================
// Browser demo backend.
//
// The desktop app talks to Rust over Tauri's `invoke`/`listen` bridge. On the
// web that bridge does not exist, so every call is re-implemented here against
// localStorage + a tiny in-page event bus. Data seeds on first run and every
// interaction (record, save, run, voice, observer, Excel) is simulated so the
// whole UI stays explorable in the browser.
// ============================================================================

const K_AUTOMATIONS = 'aw:web:automations';
const K_OBSERVER = 'aw:web:observer';
const K_SYNCPATH = 'aw:web:syncpath';
const K_SUPPRESSED = 'aw:web:suppressed';
const K_PENDING_CAPTURE = 'aw:web:pending-capture';

// --- tiny event bus ---------------------------------------------------------

type EvtHandler = (payload: unknown) => void;
const listeners = new Map<string, Set<EvtHandler>>();

function emit(event: string, payload: unknown): void {
  listeners.get(event)?.forEach((handler) => {
    try {
      handler(payload);
    } catch {
      /* listener errors must not break the app */
    }
  });
}

function listen<T>(event: string, handler: (payload: T) => void): () => void {
  if (!listeners.has(event)) listeners.set(event, new Set());
  listeners.get(event)!.add(handler as EvtHandler);
  return () => {
    listeners.get(event)?.delete(handler as EvtHandler);
  };
}

// --- storage helpers --------------------------------------------------------

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable — keep state in memory */
  }
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// ============================================================================
// Seed data
// ============================================================================

function now(): number {
  return Date.now();
}

function mkTarget(
  role: string,
  title: string,
  application: string,
  meta: { control_type?: string; name?: string; automation_id?: string } = {},
): Action['target'] {
  return { role, title, application, ...meta };
}

function mkAction(
  action_type: Action['action_type'],
  target: Action['target'],
  value: string | null,
  extra: Partial<Action> = {},
): Action {
  return {
    action_type,
    target,
    value,
    client: null,
    button: null,
    end_timestamp: null,
    is_password: false,
    data_key: null,
    end_coords: null,
    end_client: null,
    timestamp: now(),
    ...extra,
  };
}

const chrome = () => mkTarget('process', '', 'chrome.exe');
const chromeEdit = (title: string, name: string, automation_id: string) =>
  mkTarget('Edit', title, 'chrome.exe', { control_type: 'Edit', name, automation_id });
const chromeButton = (title: string, name: string, automation_id: string) =>
  mkTarget('Button', title, 'chrome.exe', { control_type: 'Button', name, automation_id });

function seedAutomations(): Automation[] {
  const daysAgo = (d: number) => now() - d * 86_400_000;
  const hrAgo = (h: number) => now() - h * 3_600_000;

  return [
    {
      id: 'seed-attendance',
      name: 'Fill attendance form',
      run_count: 12,
      created_at: daysAgo(21),
      steps: [
        mkAction('OpenApp', chrome(), 'chrome.exe'),
        mkAction('Click', chromeEdit('New Tab - Google Chrome', 'Address bar', 'Omnibox'), '512,44'),
        mkAction('Type', chromeEdit('New Tab - Google Chrome', 'Address bar', 'Omnibox'), 'portal.example.com/attendance'),
        mkAction('Wait', mkTarget('window', 'Sign in - portal.example.com', 'chrome.exe', { control_type: 'Window', name: 'Sign in' }), '15000'),
        mkAction('Type', chromeEdit('Sign in - portal.example.com', 'Email', 'email'), 'megan@example.com'),
        mkAction('Type', chromeEdit('Sign in - portal.example.com', 'Password', 'password'), '{PASSWORD}', { is_password: true }),
        mkAction('Click', chromeButton('Sign in - portal.example.com', 'Sign in', 'signin'), '720,432'),
        mkAction('Click', chromeButton('Attendance - portal.example.com', 'Mark attendance', 'mark'), '340,220'),
      ],
    },
    {
      id: 'seed-report',
      name: 'Prepare weekly report',
      run_count: 7,
      created_at: hrAgo(30),
      steps: [
        mkAction('OpenApp', mkTarget('process', '', 'excel.exe'), 'excel.exe'),
        mkAction('Click', mkTarget('Button', 'Workbook - Excel', 'excel.exe', { control_type: 'Button', name: 'New workbook', automation_id: 'new' }), '80,60'),
        mkAction('Click', mkTarget('Edit', 'Book1 - Excel', 'excel.exe', { control_type: 'Edit', name: 'Cell A1', automation_id: 'A1' }), '95,120'),
        mkAction('Type', mkTarget('Edit', 'Book1 - Excel', 'excel.exe', { control_type: 'Edit', name: 'Cell A1', automation_id: 'A1' }), 'Revenue'),
        mkAction('Type', mkTarget('Edit', 'Book1 - Excel', 'excel.exe', { control_type: 'Edit', name: 'Cell B1', automation_id: 'B1' }), '1,240,000'),
        mkAction('Shortcut', mkTarget('Edit', 'Book1 - Excel', 'excel.exe', { control_type: 'Edit', name: 'Cell B1', automation_id: 'B1' }), '{Ctrl+S}'),
      ],
    },
    {
      id: 'seed-reminders',
      name: 'Send invoice reminders',
      run_count: 4,
      created_at: hrAgo(5),
      steps: [
        mkAction('OpenApp', mkTarget('process', '', 'Outlook.exe'), 'Outlook.exe'),
        mkAction('Click', mkTarget('Button', 'Inbox - Outlook', 'Outlook.exe', { control_type: 'Button', name: 'New mail', automation_id: 'newmail' }), '74,34'),
        mkAction('Wait', mkTarget('window', 'Untitled - Message', 'Outlook.exe', { control_type: 'Window', name: 'New message' }), '8000'),
        mkAction('Type', mkTarget('Edit', 'Untitled - Message', 'Outlook.exe', { control_type: 'Edit', name: 'To', automation_id: 'to' }), 'megan@example.com'),
        mkAction('Click', mkTarget('Edit', 'Untitled - Message', 'Outlook.exe', { control_type: 'Edit', name: 'Subject', automation_id: 'subject' }), '120,70'),
        mkAction('Type', mkTarget('Edit', 'Untitled - Message', 'Outlook.exe', { control_type: 'Edit', name: 'Subject', automation_id: 'subject' }), 'Invoice reminder'),
        mkAction('Click', mkTarget('Edit', 'Untitled - Message', 'Outlook.exe', { control_type: 'Edit', name: 'Message body', automation_id: 'body' }), '300,180'),
        mkAction('Type', mkTarget('Edit', 'Untitled - Message', 'Outlook.exe', { control_type: 'Edit', name: 'Message body', automation_id: 'body' }), 'Hi, just a reminder that invoice #1042 is due next week.'),
        mkAction('Shortcut', mkTarget('Edit', 'Untitled - Message', 'Outlook.exe', { control_type: 'Edit', name: 'Message body', automation_id: 'body' }), '{Ctrl+Enter}'),
      ],
    },
    {
      id: 'seed-standup',
      name: 'Open daily standup notes',
      run_count: 54,
      created_at: daysAgo(9),
      steps: [
        mkAction('OpenApp', chrome(), 'chrome.exe'),
        mkAction('Click', chromeEdit('New Tab - Google Chrome', 'Address bar', 'Omnibox'), '512,44'),
        mkAction('Type', chromeEdit('New Tab - Google Chrome', 'Address bar', 'Omnibox'), 'docs.google.com/standup'),
        mkAction('Wait', mkTarget('window', 'Untitled document - Google Docs', 'chrome.exe', { control_type: 'Window', name: 'Standup doc' }), '12000'),
        mkAction('Type', chromeEdit('Untitled document - Google Docs', 'Document body', 'doc'), 'Monday: shipped v0.3, reviewing PRs, prepping demo.'),
        mkAction('Shortcut', chromeEdit('Untitled document - Google Docs', 'Document body', 'doc'), '{Ctrl+S}'),
      ],
    },
  ];
}

function seedObserver(): ObserverStatus {
  return {
    mode: 'observing',
    actions_observed: 386,
    suggestions_made: 3,
    history_len: 74,
    active_suggestion: {
      fingerprint: 'fp-standup-v1',
      name: 'Open daily standup notes',
      count: 6,
      apps: ['chrome.exe'],
      steps: seedAutomations()[3].steps.slice(0, 4),
    },
  };
}

// ============================================================================
// Observer templates for spontaneous demo suggestions
// ============================================================================

const SUGGESTION_TEMPLATES: Array<{ fingerprint: string; name: string; count: number; apps: string[]; steps: Action[] }> = [
  {
    fingerprint: 'fp-reminders-v1',
    name: 'Send invoice reminders to late payers',
    count: 3,
    apps: ['Outlook.exe'],
    steps: seedAutomations()[2].steps.slice(0, 6),
  },
  {
    fingerprint: 'fp-report-v1',
    name: 'Create the weekly revenue report',
    count: 4,
    apps: ['excel.exe'],
    steps: seedAutomations()[1].steps,
  },
];

let suggestionCursor = 0;

function buildDemoSuggestion(): ObserverSuggestion | null {
  if (suggestionCursor >= SUGGESTION_TEMPLATES.length) return null;
  const t = SUGGESTION_TEMPLATES[suggestionCursor];
  suggestionCursor += 1;
  return { fingerprint: t.fingerprint, name: t.name, count: t.count, apps: t.apps, steps: t.steps };
}

// ============================================================================
// State
// ============================================================================

let automations: Automation[] = [];
let observerState: ObserverStatus = seedObserver();
let syncPath = '';

try {
  automations = read<Automation[]>(K_AUTOMATIONS, seedAutomations());
  write(K_AUTOMATIONS, automations);
  observerState = read<ObserverStatus>(K_OBSERVER, seedObserver());
  syncPath = read<string>(K_SYNCPATH, '');
  localStorage.setItem('aw:welcomed', '1');
} catch {
  automations = seedAutomations();
}

function saveAutomations(): void {
  write(K_AUTOMATIONS, automations);
}

function saveObserver(): void {
  write(K_OBSERVER, observerState);
}

// ============================================================================
// Recording (simulated)
// ============================================================================

let recordingActive = false;
let autoCaptureTimer: number | null = null;

function demoCapture(): Action[] {
  return seedAutomations()[0].steps.map((s) => ({ ...s, timestamp: now() }));
}

export function startRecording(): Promise<void> {
  if (recordingActive) {
    return Promise.reject(new Error('recording is already in progress'));
  }
  recordingActive = true;
  emit('recording-started', null);

  // Simulate “performing steps in another app”: after a few seconds a capture
  // lands in the review screen on its own, just like the desktop hook layer.
  autoCaptureTimer = window.setTimeout(() => {
    autoCaptureTimer = null;
    if (!recordingActive) return;
    recordingActive = false;
    const actions = demoCapture();
    write(K_PENDING_CAPTURE, { source: 'simulated', actions });
emit('recording-captured', { source: 'simulated', actions });
  }, 8000);

  return Promise.resolve();
}

export function stopRecording(): Promise<Action[]> {
  if (!recordingActive) {
    return Promise.reject(new Error('no recording is in progress'));
  }
  if (autoCaptureTimer !== null) {
    window.clearTimeout(autoCaptureTimer);
    autoCaptureTimer = null;
  }
  recordingActive = false;
  const actions = demoCapture();
  emit('recording-captured', { source: 'simulated', actions });
  return Promise.resolve(actions);
}

export function getRecordingStatus(): Promise<boolean> {
  return Promise.resolve(recordingActive);
}

// ============================================================================
// Windows / panel (simulated via ?panel=1)
// ============================================================================

export function getWindowLabel(): Promise<string> {
  const isPanel = new URLSearchParams(window.location.search).get('panel') === '1';
  return Promise.resolve(isPanel ? 'panel' : 'main');
}

export function floatToPanel(): Promise<void> {
  window.location.search = '?panel=1';
  return Promise.resolve();
}

export function restoreFromPanel(): Promise<void> {
  window.location.search = '';
  return Promise.resolve();
}

// ============================================================================
// Events
// ============================================================================

export function onRecordingStarted(handler: () => void): Promise<() => void> {
  return Promise.resolve(listen('recording-started', () => handler()));
}

export function onRecordingCaptured(handler: (event: RecordingCaptured) => void): Promise<() => void> {
  return Promise.resolve(listen<RecordingCaptured>('recording-captured', handler));
}

export function onAutomationsSaved(handler: () => void): Promise<() => void> {
  return Promise.resolve(listen('automations-saved', () => handler()));
}

export function onObserverSuggestion(handler: (suggestion: ObserverSuggestion) => void): Promise<() => void> {
  return Promise.resolve(listen<ObserverSuggestion>('observer-suggestion', handler));
}

export function onObserverAutomationReady(handler: (payload: ObserverAutomationReady) => void): Promise<() => void> {
  return Promise.resolve(listen<ObserverAutomationReady>('observer-automation-ready', handler));
}

export function onRescueRequest(handler: (request: RescueRequest) => void): Promise<() => void> {
  return Promise.resolve(listen<RescueRequest>('rescue-request', handler));
}

// Replays a capture that happened “in the other window” (mini player) after a
// page reload so nothing is lost when switching between the two.
function replayPendingCapture(): void {
  const pending = read<{ source: string; actions: Action[] } | null>(K_PENDING_CAPTURE, null);
  if (!pending) return;
  try {
    localStorage.removeItem(K_PENDING_CAPTURE);
  } catch {
    /* ignore */
  }
  window.setTimeout(() => {
    emit('recording-captured', pending);
  }, 400);
}
replayPendingCapture();

export function notifyAutomationsSaved(): Promise<void> {
  emit('automations-saved', null);
  return Promise.resolve();
}

// ============================================================================
// Replay (simulated)
// ============================================================================

let stopRequested = false;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const timer = window.setInterval(() => {
      if (stopRequested) {
        window.clearInterval(timer);
        stopRequested = false;
        reject(new Error('Replay stopped by user'));
      } else if (Date.now() - start >= ms) {
        window.clearInterval(timer);
        resolve();
      }
    }, 80);
  });
}

export function replayAction(_action: Action): Promise<void> {
  return sleep(700);
}

export function replayAutomation(automation: Automation): Promise<void> {
  const duration = Math.min(5500, 900 + automation.steps.length * 450);
  return sleep(duration).then(() => {
    const hit = automations.find((a) => a.id === automation.id);
    if (hit) {
      hit.run_count = (hit.run_count ?? 0) + 1;
      saveAutomations();
    }
    emit('automations-saved', null);
  });
}

export function stopAutomation(): Promise<void> {
  stopRequested = true;
  return Promise.resolve();
}

export function rescueApply(_rescueId: string): Promise<void> {
  return Promise.resolve();
}

export function rescueCancel(_rescueId: string): Promise<void> {
  return Promise.resolve();
}

// ============================================================================
// Automations
// ============================================================================

export function loadAutomations(): Promise<Automation[]> {
  return Promise.resolve(automations);
}

export function saveAutomation(automation: Automation): Promise<void> {
  const index = automations.findIndex((a) => a.id === automation.id);
  if (index >= 0) {
    automations[index] = automation;
  } else {
    automations.push(automation);
  }
  saveAutomations();
  emit('automations-saved', null);
  return Promise.resolve();
}

export function deleteAutomation(id: string): Promise<void> {
  automations = automations.filter((a) => a.id !== id);
  saveAutomations();
  emit('automations-saved', null);
  return Promise.resolve();
}

export function getSyncPath(): Promise<string> {
  return Promise.resolve(syncPath);
}

export function setSyncPath(path: string): Promise<void> {
  syncPath = path.trim();
  write(K_SYNCPATH, syncPath);
  return Promise.resolve();
}

// ============================================================================
// Export / import
// ============================================================================

function slug(name: string): string {
  return (name || 'automation').replace(/[^a-z0-9-_]+/gi, '-').toLowerCase();
}

function downloadBlob(filename: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function exportAutomationDoc(automation: Automation, format: 'json' | 'pdf'): Promise<string> {
  if (format === 'json') {
    const filename = `${slug(automation.name)}.json`;
    downloadBlob(filename, JSON.stringify(automation, null, 2), 'application/json');
    return Promise.resolve(`web://downloads/${filename}`);
  }

  // No desktop file system — open a printable step sheet instead (Ctrl+P → Save as PDF).
  const title = `Allworks — ${automation.name}`;
  const rows = automation.steps
    .map(
      (s, i) =>
        `<li>Step ${i + 1} — <strong>${s.action_type}</strong> ${s.target?.application ?? ''}${s.value ? ` — <code>${s.value}</code>` : ''}</li>`,
    )
    .join('');
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title>
    <style>body{font:14px/1.6 system-ui,sans-serif;max-width:640px;margin:40px auto;color:#111}
    h1{font-size:20px}ol{padding-left:22px}code{background:#f3f3f3;padding:0 4px;border-radius:4px}</style></head>
    <body><h1>${automation.name}</h1><p>${automation.steps.length} step(s)</p><ol>${rows}</ol></body></html>`;

  const win = window.open('', '_blank', 'width=720,height=560');
  if (!win) {
    return Promise.reject(new Error('Popup blocked — allow pop-ups for this site to open the PDF sheet.'));
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
  win.setTimeout(() => win.print(), 350);
  return Promise.resolve(`print://${slug(automation.name)}`);
}

export function importAutomationJson(doc: string): Promise<Automation> {
  try {
    const parsed = JSON.parse(doc) as Automation;
    if (!parsed || !Array.isArray(parsed.steps)) {
      throw new Error('not an automation');
    }
    return Promise.resolve({
      id: parsed.id || `import-${Date.now().toString(36)}`,
      name: parsed.name || 'Imported automation',
      steps: parsed.steps,
      run_count: parsed.run_count ?? 0,
      created_at: parsed.created_at ?? now(),
    });
  } catch {
    return Promise.reject(new Error('Not a valid Allworks automation JSON'));
  }
}

// ============================================================================
// Repeat detection (simplified crypto-free demo detector)
// ============================================================================

function stepSignature(action: Action): string {
  const t = action.target;
  const app = (t?.application ?? '').toLowerCase();
  const role = (t?.role ?? '').toLowerCase();
  return `${action.action_type.toLowerCase()}|${app}|${role}`;
}

export function detectRepeats(input: Automation[]): Promise<RepeatedSequence[]> {
  const minRun = 3;
  const counts = new Map<string, { count: number; occurrences: { automation_id: string; start_index: number }[] }>();

  for (const auto of input) {
    const sigs = auto.steps.map(stepSignature);
    for (let start = 0; start + minRun <= sigs.length; start += 1) {
      const key = sigs.slice(start, start + minRun).join('#');
      const entry = counts.get(key) ?? { count: 0, occurrences: [] };
      entry.count += 1;
      entry.occurrences.push({ automation_id: auto.id, start_index: start });
      counts.set(key, entry);
    }
  }

  const results: RepeatedSequence[] = [];
  for (const [key, entry] of counts) {
    if (entry.count < 2) continue;
    const first = entry.occurrences[0];
    const source = automations.find((a) => a.id === first.automation_id);
    const template = input.find((a) => a.id === first.automation_id);
    if (!template) continue;
    const steps = template.steps.slice(first.start_index, first.start_index + minRun);
    const automationIds = [...new Set(entry.occurrences.map((o) => o.automation_id))];
    results.push({
      steps,
      count: entry.count,
      automation_ids: automationIds,
      occurrences: entry.occurrences,
    });
    void key;
    void source;
  }

  results.sort((a, b) => b.count - a.count || b.steps.length - a.steps.length);
  return Promise.resolve(results.slice(0, 12));
}

// ============================================================================
// Voice (simulated)
// ============================================================================

export function voiceRun(): Promise<VoiceResult> {
  return delay(1400).then(() => {
    const names = automations.map((a) => a.name).filter(Boolean);
    if (names.length === 0) {
      return { recognized: '', matched: null };
    }
    const picked = names[Math.floor(Math.random() * names.length)];
    return { recognized: picked, matched: picked };
  });
}

// ============================================================================
// Observer
// ============================================================================

let observerTimer: number | null = null;

function startObserverSim(): void {
  stopObserverSim();
  const tick = () => {
    if (observerState.mode !== 'observing') return;
    observerState.actions_observed += 2 + Math.floor(Math.random() * 4);
    observerState.history_len = Math.min(512, observerState.history_len + 1);
    saveObserver();

    if (Math.random() < 0.4 && !observerState.active_suggestion) {
      const suggestion = buildDemoSuggestion();
      if (suggestion) {
        observerState.suggestions_made += 1;
        observerState.active_suggestion = suggestion;
        saveObserver();
        emit('observer-suggestion', suggestion);
      }
    }
    observerTimer = window.setTimeout(tick, 8000);
  };
  observerTimer = window.setTimeout(tick, 8000);
}

function stopObserverSim(): void {
  if (observerTimer !== null) {
    window.clearTimeout(observerTimer);
    observerTimer = null;
  }
}

function finalizeSuggestion(suggestion: ObserverSuggestion, name: string): Automation {
  const automation: Automation = {
    id: `suggest-${Date.now().toString(36)}`,
    name: name.trim() || suggestion.name,
    steps: suggestion.steps,
    run_count: 0,
    created_at: now(),
  };
  return automation;
}

export function observerGetStatus(): Promise<ObserverStatus> {
  void read<ObserverStatus>(K_OBSERVER, observerState);
  return Promise.resolve(observerState);
}

export function observerSetMode(mode: ObserverMode): Promise<void> {
  observerState.mode = mode;
  saveObserver();
  if (mode === 'observing') startObserverSim();
  else stopObserverSim();
  return Promise.resolve();
}

export function observerDismiss(fingerprint: string): Promise<void> {
  if (observerState.active_suggestion?.fingerprint === fingerprint) {
    observerState.active_suggestion = null;
    saveObserver();
  }
  return Promise.resolve();
}

export function observerSuppress(fingerprint: string): Promise<void> {
  if (observerState.active_suggestion?.fingerprint === fingerprint) {
    observerState.active_suggestion = null;
    saveObserver();
  }
  const suppressed = read<string[]>(K_SUPPRESSED, []);
  if (!suppressed.includes(fingerprint)) {
    suppressed.push(fingerprint);
    write(K_SUPPRESSED, suppressed);
  }
  return Promise.resolve();
}

export function observerAutomate(fingerprint: string): Promise<void> {
  void fingerprint;
  return Promise.resolve();
}

export function observerAutomateAndSave(fingerprint: string, name: string): Promise<Automation> {
  const suggestion = observerState.active_suggestion ?? SUGGESTION_TEMPLATES.find((t) => t.fingerprint === fingerprint);
  if (!suggestion) {
    return Promise.reject(new Error('Suggestion no longer available'));
  }
  const saved = finalizeSuggestion(suggestion, name);
  automations.push(saved);
  saveAutomations();
  observerState.active_suggestion = null;
  saveObserver();
  emit('automations-saved', null);
  return Promise.resolve(saved);
}

export function observerClearHistory(): Promise<void> {
  observerState.actions_observed = 0;
  observerState.history_len = 0;
  observerState.suggestions_made = 0;
  observerState.active_suggestion = null;
  saveObserver();
  return Promise.resolve();
}

// Kick the observer simulation if seeded in observing mode.
if (observerState.mode === 'observing') {
  startObserverSim();
}

// ============================================================================
// Excel (simulated)
// ============================================================================

function pickFile(accept: string): Promise<string | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.addEventListener('change', () => {
      const file = input.files?.[0];
      const fakePath = file ? `web://${file.name}` : null;
      resolve(fakePath);
    });
    input.click();
  });
}

export function excelPickFile(kind: 'data' | 'workbook'): Promise<string | null> {
  return pickFile(kind === 'workbook' ? '.xlsx' : '.json,.pdf,csv');
}

export function excelExtract(path: string): Promise<ExtractResult> {
  return delay(900).then(() => ({
    source: path,
    records: [
      { name: 'Aarav Sharma', phone: '+1 415 555 0102' },
      { name: 'Leila Haddad', phone: '+49 151 2345 6789' },
      { name: 'Marcus Chen', phone: '+61 2 5550 1287' },
      { name: 'Nina Petrova', phone: '+7 903 555 0146' },
      { name: 'Diego Fernández', phone: '+34 612 555 0193' },
    ],
    skipped: 2,
  }));
}

export function excelAppend(excelPath: string, rows: ContactRecord[]): Promise<AppendResult> {
  void excelPath;
  return delay(1100).then(() => ({
    sheet: 'Contacts',
    start_row: 51,
    end_row: 50 + rows.length,
    appended: rows.length,
    duplicates: 0,
  }));
}