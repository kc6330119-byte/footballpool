import {createHash} from 'node:crypto';
import type {Game, Week} from './pool';
export type Change = {path: string[]; value?: unknown; remove?: boolean};
type Document = Record<string, unknown>;
export function document(week: Week): Document {
  return structuredClone({...week, games: Object.fromEntries(week.games.map(g => [g.id, g])), gameOrder: week.games.map(g => g.id)});
}
export function weekFromDocument(doc: Document): Week {
  const {gameOrder, games, ...rest} = doc;
  return {...rest, games: (gameOrder as string[]).map(id => (games as Record<string, Game>)[id]).filter(Boolean)} as Week;
}
const plain = (value: unknown): value is Document => !!value && typeof value === 'object' && !Array.isArray(value);
export function diff(before: Document, after: Document, path: string[] = []): Change[] {
  return [...new Set([...Object.keys(before), ...Object.keys(after)])].flatMap(key => {
    const a = before[key], b = after[key], next = [...path, key];
    if (!(key in after)) return [{path: next, remove: true}];
    if (plain(a) && plain(b)) return diff(a, b, next);
    return JSON.stringify(a) === JSON.stringify(b) ? [] : [{path: next, value: b}];
  });
}
export function apply(doc: Document, changes: Change[]) {
  for (const change of changes) {
    if (!change.path.length || change.path.some(p => ['__proto__', 'prototype', 'constructor'].includes(p))) throw new Error('Invalid change path');
    let target = doc;
    for (const key of change.path.slice(0, -1)) {
      if (!plain(target[key])) target[key] = {};
      target = target[key] as Document;
    }
    const key = change.path.at(-1)!;
    if (change.remove) delete target[key]; else target[key] = change.value;
  }
}
export function revision(week: Week) {
  return parseInt(createHash('sha256').update(JSON.stringify(week)).digest('hex').slice(0, 12), 16);
}
