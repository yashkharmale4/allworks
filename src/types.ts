export type ActionType = 'OpenApp' | 'Click' | 'Drag' | 'Shortcut' | 'Type' | 'Copy' | 'Paste' | 'Wait';

export interface TargetSelector {
  role: string;
  title: string;
  application: string;
  control_type?: string | null;
  name?: string | null;
  automation_id?: string | null;
  class_name?: string | null;
  rect?: string | null;
  window_path?: string | null;
}

export interface Action {
  action_type: ActionType;
  target: TargetSelector | null;
  value: string | null;
  client?: string | null;
  button?: string | null;
  end_timestamp?: number | null;
  is_password?: boolean | null;
  data_key?: string | null;
  end_coords?: string | null;
  end_client?: string | null;
  timestamp: number;
}

export interface Automation {
  id: string;
  name: string;
  steps: Action[];
  run_count: number;
  created_at: number;
}

export interface OccurrenceLocation {
  automation_id: string;
  start_index: number;
}

export interface RepeatedSequence {
  steps: Action[];
  count: number;
  automation_ids: string[];
  occurrences: OccurrenceLocation[];
}

export interface VoiceResult {
  recognized: string;
  matched: string | null;
}

export interface RecordingCaptured {
  source: string;
  actions: Action[];
}

export type ObserverMode = 'disabled' | 'observing' | 'paused';

export interface ObserverSuggestion {
  fingerprint: string;
  name: string;
  count: number;
  apps: string[];
  steps: Action[];
}

export interface ObserverStatus {
  mode: ObserverMode;
  actions_observed: number;
  suggestions_made: number;
  history_len: number;
  active_suggestion: ObserverSuggestion | null;
}

export interface ObserverAutomationReady {
  suggested_name: string;
  actions: Action[];
}

export interface RescueRequest {
  rescue_id: string;
  automation_name: string;
  step_index: number;
  action: Action;
  reason: string;
}

export type ViewId = 'home' | 'automations' | 'suggestions' | 'review' | 'voice' | 'settings' | 'edit' | 'excel';

export type VoicePhase = 'idle' | 'listening' | 'matched' | 'nomatch' | 'error';

export type RunStatus = 'running' | 'success' | 'failed';

export type ToastKind = 'success' | 'info' | 'error';

export interface Toast {
  id: number;
  message: string;
  kind: ToastKind;
}

export interface DataField {
  key: string;
  label: string;
  value: string;
}

export interface ImportResult {
  format: string;
  fields: DataField[];
  readable: string;
  values: string[];
}

export interface EditableStep {
  step: number;
  action: string;
  app: string;
  kind: string;
  value: string;
  editable: boolean;
  is_password: boolean;
}

export interface EditableDoc {
  app: string;
  kind: string;
  version: number;
  automation: Automation;
  steps: EditableStep[];
}

export type ModalState =
  | { kind: 'first-run' }
  | { kind: 'how-it-works' }
  | { kind: 'why-suggestion'; fingerprint: string; name: string; count: number; steps: number; apps: string[] }
  | { kind: 'confirm-delete'; id: string; name: string }
  | null;

export interface ContactRecord {
  name: string;
  phone: string;
}

export interface ExtractResult {
  source: string;
  records: ContactRecord[];
  skipped: number;
}

export interface AppendResult {
  sheet: string;
  start_row: number;
  end_row: number;
  appended: number;
  duplicates: number;
}