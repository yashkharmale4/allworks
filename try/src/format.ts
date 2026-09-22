import type { Action } from './types';

export function timeGreeting(): string {
  const h = new Date().getHours();
  if (h < 5) return 'Up late';
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

export function formatRelative(ts: number): string {
  const diff = Date.now() - ts;
  const s = Math.max(1, Math.round(diff / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min${m === 1 ? '' : 's'} ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} hour${h === 1 ? '' : 's'} ago`;
  const d = Math.round(h / 24);
  return `${d} day${d === 1 ? '' : 's'} ago`;
}

export function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function clipText(value: string, max = 40): string {
  const singleLine = value.replace(/\s+/g, ' ').trim();
  return singleLine.length > max ? `${singleLine.slice(0, max - 1)}…` : singleLine;
}

export function plural(n: number, noun: string): string {
  return `${n} ${noun}${n === 1 ? '' : 's'}`;
}

export function actionVerb(action: Action): string {
  switch (action.action_type) {
    case 'OpenApp':
      return 'Launch';
    case 'Click':
      return 'Click';
    case 'Drag':
      return 'Drag';
    case 'Shortcut':
      return 'Press';
    case 'Type':
      return 'Type';
    case 'Copy':
      return 'Copy';
    case 'Paste':
      return 'Paste';
    case 'Wait':
      return 'Wait';
  }
}

// What, never where: the *identity* the step targets. Coordinates are only
// reported when no identity exists to describe.
export function targetWhat(action: Action): string {
  const t = action.target;
  const name = t?.name?.trim();
  if (name) return name;
  const aid = t?.automation_id?.trim();
  if (aid) return aid;
  const ctype = t?.control_type?.trim();
  if (ctype) return ctype;
  return '';
}

export function describeAction(action: Action): string {
  switch (action.action_type) {
    case 'OpenApp':
      return `Launch ${action.target?.application ?? action.value ?? 'an app'}`;
    case 'Click': {
      const what = targetWhat(action);
      if (what) return `Click "${clipText(what, 34)}"`;
      return action.value ? `Click at (${clipText(action.value, 18)})` : 'Click at a spot';
    }
    case 'Drag': {
      const from = targetWhat(action);
      const fromText = from
        ? `"${clipText(from, 20)}"`
        : action.value
          ? `(${clipText(action.value, 20)})`
          : 'from a spot';
      return `Drag ${fromText}${action.end_coords ? ` to (${clipText(action.end_coords, 20)})` : ''}`;
    }
    case 'Shortcut':
      return action.value ? `Press ${clipText(action.value, 24)}` : 'Press shortcut';
    case 'Type':
      if (action.is_password) return 'Type •••••• (password)';
      return `Type ${action.value ? `"${clipText(action.value, 26)}"` : 'some text'}`;
    case 'Copy':
      return 'Copy selected text';
    case 'Paste':
      return 'Paste from clipboard';
    case 'Wait': {
      const timeout = action.value ? ` (max ${clipText(action.value, 8)} ms)` : '';
      const what = action.target?.name ?? action.target?.automation_id ?? action.target?.title ?? action.target?.application ?? 'condition';
      return `Wait for ${clipText(what, 30)}${timeout}`;
    }
  }
}

export function describeActionShort(action: Action): string {
  switch (action.action_type) {
    case 'OpenApp':
      return action.target?.application ?? action.value ?? 'Open app';
    case 'Click': {
      const what = targetWhat(action);
      return what ? clipText(what, 24) : action.value ? clipText(action.value, 24) : 'Click';
    }
    case 'Drag': {
      const from = targetWhat(action);
      return from
        ? clipText(from, 18)
        : action.end_coords
          ? clipText(action.end_coords, 18)
          : 'Drag';
    }
    case 'Shortcut':
      return action.value ? clipText(action.value, 16) : 'Shortcut';
    case 'Type':
      if (action.is_password) return 'Password';
      return action.value ? clipText(action.value, 18) : 'Type text';
    case 'Copy':
      return 'Copy';
    case 'Paste':
      return 'Paste';
    case 'Wait': {
      const what = action.target?.name ?? action.target?.automation_id ?? action.target?.title ?? 'Wait';
      return clipText(what, 18);
    }
  }
}