/* St. John the Beloved test site · opening a screen (site/screens.js). Each screen is its own file (build.js writes
   public/screens/<name>.<hash>.js and the table window.StJohn.screens): when a screen opens, its file(s) and its lists
   (one request, data.js loadLists) load side by side, never one after the other; then main.jsx draws it. Once a screen
   has drawn, the screens a person likely opens next from it have their files fetched while the browser is idle (their
   code only, not their data). A screen opened again draws at once from the lists in memory; refreshScreen then reads them
   again in the background and, when the server's answer differs, draws the screen again from it. */
import { PAGES } from './pages.js';
import { loadLists, refreshLists } from './data.js';

const STJ = window.StJohn;
const ready = {}, opening = {};

// the page of an address: the first page of pages.js whose path matches the parts (":id" matches one part)
export function match(parts) {
  for (const p of PAGES) {
    const want = p.path.split('/').filter(Boolean);
    if (want.length !== parts.length) continue;
    const params = {};
    if (want.every((w, i) => (w.charAt(0) === ':' ? ((params[w.slice(1)] = parts[i]), true) : w === parts[i]))) return { page: p, params };
  }
  return { page: PAGES.find((p) => p.id === 'not-found'), params: {} };
}

// the parts of the address in the hash (#/member/m1?tab=x → member, m1), before the site draws
export const hashParts = () => location.hash.replace(/^#/, '').split('?')[0].split('/').filter(Boolean).map((s) => { try { return decodeURIComponent(s); } catch (e) { return s; } });

// the lists a screen reads (its own and those of the screens it imports)
export const screenLists = (name) => (STJ.screens[name] || { lists: [] }).lists;

// the screen's component once its files and lists are in, else null
export const readyScreen = (name) => ready[name] || null;

// loads a screen's files and lists side by side → its component; a failure can be tried again
export function loadScreen(name) {
  const s = STJ.screens[name];
  if (!s) return Promise.reject(new Error('St. John: no screen ' + name));
  return opening[name] || (opening[name] = Promise.all([Promise.all(s.files.map(STJ.file)), loadLists(s.lists)])
    .then(() => (ready[name] = STJ.require(s.module)[s.export]))
    .catch((e) => { delete opening[name]; throw e; }));
}

// a screen draws what it needs from the lists once, when its code first runs (module level), so new data means running its
// code again (STJ.drop). The screen on view is swapped for the fresh one at once unless the person is typing or a dialog is
// open (a swap would lose that); it is then marked dirty and drawn fresh the next time it opens, even when the lists have not
// changed again since. If the fresh code fails to run, the screen on view stays as it was and is also marked dirty.
const listeners = new Set(), dirty = new Set();
export const onRefreshed = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };
const busy = () => { const a = document.activeElement; return !!((a && (/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) || a.isContentEditable)) || document.querySelector('[role="dialog"], dialog[open]')); };
export function refreshScreen(name) {
  const s = STJ.screens[name];
  if (!s) return Promise.resolve(false);
  return refreshLists(STJ.coreLists.concat(s.lists)).then((changed) => {
    if (!changed && !dirty.has(name)) return false;
    let fresh = null;
    if (!busy()) {
      try { STJ.drop(); fresh = STJ.require(s.module)[s.export]; } catch (e) { fresh = null; }
    } else STJ.drop();
    if (changed) Object.keys(ready).forEach((k) => { if (k !== name) { delete ready[k]; dirty.delete(k); } });
    Object.keys(opening).forEach((k) => { if (!ready[k] && k !== name) delete opening[k]; });
    if (!fresh) { dirty.add(name); return false; }   // typing, a dialog, or a failure: the screen on view stays; it redraws on its next visit
    dirty.delete(name);
    ready[name] = fresh;
    listeners.forEach((fn) => fn());
    return true;
  });
}

// the screens a person likely opens next from each screen
const NEXT = {
  dashboard: ['members', 'calendar', 'giving', 'announcements'],
  members: ['member', 'member-new', 'families'],
  member: ['member-edit', 'family', 'members'],
  'member-edit': ['member'],
  'member-new': ['member', 'members'],
  families: ['family', 'directory'],
  family: ['member', 'families'],
  directory: ['member', 'family'],
  ministries: ['ministry', 'servants'],
  ministry: ['servants', 'ministries'],
  servants: ['ministry'],
  calendar: ['event', 'planning'],
  event: ['calendar'],
  giving: ['gifts', 'give', 'reports'],
  gifts: ['giving', 'member'],
  announcements: ['announcement-edit', 'messages'],
  'announcement-edit': ['announcements'],
  documents: ['document'],
  media: ['photo'],
  search: ['member', 'family', 'document'],
  'sign-in': ['dashboard'],
  welcome: ['dashboard'],
  'not-found': ['dashboard'],
};
const idle = (fn) => (window.requestIdleCallback ? window.requestIdleCallback(fn, { timeout: 3000 }) : setTimeout(fn, 200));

// fetches the files of the likely next screens, one at a time, each when the browser is idle; a failure is left for the visit
export function prefetchNext(name) {
  const files = [...new Set((NEXT[name] || []).flatMap((n) => (STJ.screens[n] ? STJ.screens[n].files : [])))];
  const step = () => { const f = files.shift(); if (f) STJ.file(f).catch(() => {}).then(() => idle(step)); };
  idle(step);
}
