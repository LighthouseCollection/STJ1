/* St. John the Beloved test site · the build (build.js): site/ → public/.
     The frame: site/boot.js and the modules it imports (main.jsx, site.jsx, data.js, pages.js, screens.js) → public/app.<hash>.js,
       one plain script with a small module table; "react", "react-dom" and "plenix-platform" are the scripts the page already
       loaded from the CDN (window.React, window.ReactDOM, window.Plenix), like any outside app of Plenix.
     Each screen: site/screens/<name>.jsx and the modules only it imports → public/screens/<name>.<hash>.js, loaded when the
       screen opens (screens.js). A screen that imports another screen's module loads that screen's file too.
     The table of screens (window.StJohn.screens, in app.<hash>.js) names each screen's files and the parish lists it reads
       (GET api/lists?names=…): the lists it imports from data.js (data.js LISTS), a helper counting for the lists its code names.
     Every built script carries the hash of its content in its name, so the server lets browsers keep it for a year
       (server.js); site/index.html → public/index.html with those names filled in (the server fills in the Plenix address);
       site/assets/ → public/assets/, with the icons script also written under its hashed name.
   The build fails, and writes nothing, if a file does not compile, an import does not resolve, the frame imports a screen,
   or a screen imports a name data.js does not export.
     node build.js */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');
const Babel = require('@babel/standalone');

const ROOT = __dirname;
const SITE = path.join(ROOT, 'site');
const SCREENS = path.join(SITE, 'screens');
const DATA = path.join(SITE, 'data.js');
const OUT = path.join(ROOT, 'public');
const ICONS = 'assets/plenix-icons-st-john.js';
const EXTERNALS = { react: 'window.React', 'react-dom': 'window.ReactDOM', 'react-dom/client': 'window.ReactDOM', 'plenix-platform': 'window.Plenix' };
const rel = (p) => path.relative(ROOT, p).split(path.sep).join('/');
const hashed = (name, text) => name.replace(/\.js$/, '.' + crypto.createHash('sha256').update(text).digest('hex').slice(0, 10) + '.js');
const isScreen = (file) => path.dirname(file) === SCREENS && file.endsWith('.jsx');
const screenName = (file) => path.basename(file, '.jsx');

function resolve(from, spec) {
  const base = path.resolve(path.dirname(from), spec);
  for (const c of [base, base + '.js', base + '.jsx']) if (fs.existsSync(c) && fs.statSync(c).isFile()) return c;
  throw new Error('Cannot resolve "' + spec + '" from ' + rel(from));
}

// one module, compiled once: { file, id, code, deps: { spec: { id } | { external } }, files: [the modules it imports], dataNames }
const compiled = new Map();
function compile(file) {
  if (compiled.has(file)) return compiled.get(file);
  const source = fs.readFileSync(file, 'utf8');
  let code;
  try {
    code = Babel.transform(source, { filename: file, sourceType: 'module', presets: [['react', { runtime: 'classic' }]], plugins: [['transform-modules-commonjs', { strictMode: false }]] }).code;
  } catch (e) { throw new Error(rel(file) + ' does not compile: ' + e.message); }
  const m = { file, id: rel(file), code, deps: {}, files: [], dataNames: [] };
  compiled.set(file, m);
  for (const r of code.matchAll(/\brequire\((["'])([^"']+)\1\)/g)) {
    const spec = r[2];
    if (EXTERNALS[spec]) { m.deps[spec] = { external: EXTERNALS[spec] }; continue; }
    if (!spec.startsWith('.')) throw new Error('Only relative imports and react, react-dom, plenix-platform: ' + spec + ' in ' + rel(file));
    const dep = resolve(file, spec); m.deps[spec] = { id: rel(dep) }; m.files.push(dep);
  }
  // the names it imports from data.js
  for (const r of source.matchAll(/\bimport\s+([^;]*?)\s+from\s+(["'])([^"']+)\2/g)) {
    if (!r[3].startsWith('.') || resolve(file, r[3]) !== DATA) continue;
    const names = /^\{([^}]*)\}$/.exec(r[1].trim());
    if (!names) throw new Error(rel(file) + ': import the names it uses from data.js, as { … }');
    names[1].split(',').map((n) => n.trim().split(/\s+as\s+/)[0]).filter(Boolean).forEach((n) => m.dataNames.push(n));
  }
  return m;
}

// the modules of the frame: boot.js and everything it imports; a screen is never among them
function frame(entry) {
  const order = [], seen = new Set();
  const visit = (file) => {
    if (seen.has(file)) return; seen.add(file);
    if (isScreen(file)) throw new Error('The frame imports a screen (' + rel(file) + '): screens load when they open, through screens.js');
    const m = compile(file); m.files.forEach(visit); order.push(m);
  };
  visit(entry);
  return order;
}

// a screen's own modules (not the frame's, not another screen's) and the other screens it imports
function screen(entry, core) {
  const order = [], seen = new Set(), uses = new Set();
  const visit = (file) => {
    if (seen.has(file) || core.has(file)) return; seen.add(file);
    if (file !== entry && isScreen(file)) { uses.add(screenName(file)); return; }
    const m = compile(file); m.files.forEach(visit); order.push(m);
  };
  visit(entry);
  return { name: screenName(entry), modules: order, uses: [...uses] };
}

// the parish lists each name of data.js stands for: a list itself, or a helper that reads lists (its code names them)
function dataLists() {
  const m = compile(DATA), module = { exports: {} };
  vm.runInNewContext(m.code, { module, exports: module.exports, require: () => { throw new Error('data.js imports nothing'); } });
  const ex = module.exports, listOf = new Map(Object.entries(ex.LISTS || {}).map(([k, v]) => [v, k]));
  const holders = Object.keys(ex).filter((n) => listOf.has(ex[n]));
  return (name, where) => {
    if (!(name in ex)) throw new Error(where + ' imports ' + name + ', which data.js does not export');
    if (listOf.has(ex[name])) return [listOf.get(ex[name])];
    if (typeof ex[name] !== 'function') return [];
    const fn = String(ex[name]);
    return holders.filter((n) => new RegExp('\\b' + n + '\\b').test(fn)).map((n) => listOf.get(ex[n]));
  };
}

const define = (m) => {
  const table = JSON.stringify(Object.fromEntries(Object.entries(m.deps).map(([k, v]) => [k, v.id || null])));
  const ext = Object.entries(m.deps).filter(([, v]) => v.external).map(([k, v]) => JSON.stringify(k) + ': function () { return ' + v.external + '; }').join(', ');
  return '  defs[' + JSON.stringify(m.id) + '] = { deps: ' + table + ', externals: { ' + ext + ' }, run: function (module, exports, require) {\n' + m.code + '\n  } };';
};

// public/screens/<name>.<hash>.js: the screen's modules, added to the frame's table when the file runs
const chunk = (s) => '/* GENERATED by build.js from site/screens/' + s.name + '.jsx (St. John the Beloved test site) */\n(function (defs) {\n'
  + s.modules.map(define).join('\n') + '\n})(window.StJohn.defs);\n';

// public/app.<hash>.js: the frame's modules, the table of screens, the module loader and the screen-file loader
const app = (modules, entry, screens, coreLists) => '/* GENERATED by build.js from site/ (St. John the Beloved test site) */\n(function () {\n'
  + '  var stj = window.StJohn = window.StJohn || {};\n  var defs = stj.defs = stj.defs || {};\n'
  + modules.map(define).join('\n') + '\n'
  + '  stj.screens = ' + JSON.stringify(screens) + ';\n  stj.coreLists = ' + JSON.stringify(coreLists) + ';\n'
  + '  var cache = {}, files = {}, frameIds = Object.keys(defs);\n'
  + '  function load(id) {\n    if (cache[id]) return cache[id].exports;\n    var def = defs[id], module = { exports: {} };\n'
  + '    if (!def) throw new Error(\'St. John: \' + id + \' is not loaded\');\n    cache[id] = module;\n'
  + '    def.run(module, module.exports, function (spec) {\n      if (def.externals[spec]) { var g = def.externals[spec](); if (!g) throw new Error(\'St. John: "\' + spec + \'" is not loaded before app.js\'); return g; }\n      return load(def.deps[spec]);\n    });\n    return module.exports;\n  }\n'
  + '  stj.require = load;\n'
  + '  // forgets the screens\' modules (not the frame\'s) so that they run again on the lists as they are now\n'
  + '  stj.drop = function () { Object.keys(cache).forEach(function (id) { if (frameIds.indexOf(id) < 0) delete cache[id]; }); };\n'
  + '  // a screen file, once: a script tag (relative to the page, so the site works under any address); a failed one can be asked again\n'
  + '  stj.file = function (src) {\n    return files[src] || (files[src] = new Promise(function (resolve, reject) {\n'
  + '      var s = document.createElement(\'script\'); s.src = src; s.async = true; s.onload = resolve;\n'
  + '      s.onerror = function () { delete files[src]; s.remove(); reject(new Error(\'St. John: \' + src + \' could not load\')); };\n'
  + '      document.head.appendChild(s);\n    }));\n  };\n'
  + '  load(' + JSON.stringify(rel(entry)) + ');\n})();\n';

function copyDir(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const e of fs.readdirSync(from, { withFileTypes: true })) { const a = path.join(from, e.name), b = path.join(to, e.name); if (e.isDirectory()) copyDir(a, b); else fs.copyFileSync(a, b); }
}

try {
  const entry = path.join(SITE, 'boot.js');
  const core = frame(entry), coreFiles = new Set(core.map((m) => m.file));
  const listsOf = dataLists();
  const lists = (modules) => [...new Set(modules.flatMap((m) => m.dataNames.flatMap((n) => listsOf(n, m.id))))].sort();
  const parts = fs.readdirSync(SCREENS).filter((f) => f.endsWith('.jsx')).sort().map((f) => screen(path.join(SCREENS, f), coreFiles));
  const byName = Object.fromEntries(parts.map((s) => [s.name, s]));
  const written = {};
  for (const s of parts) { const text = chunk(s); s.src = hashed('screens/' + s.name + '.js', text); written[s.src] = text; }
  // each screen: its module and export, its files (its own and the screens it imports, all the way down), its lists
  const screens = {};
  for (const s of parts) {
    const all = [], add = (n) => { if (all.indexOf(n) >= 0) return; all.push(n); byName[n].uses.forEach(add); };
    add(s.name);
    const exported = s.name.replace(/(^|-)([a-z])/g, (x, d, c) => c.toUpperCase()) + 'Screen';
    if (!new RegExp('export (function|const) ' + exported + '\\b').test(fs.readFileSync(path.join(SCREENS, s.name + '.jsx'), 'utf8'))) throw new Error('site/screens/' + s.name + '.jsx does not export ' + exported);
    screens[s.name] = { module: 'site/screens/' + s.name + '.jsx', export: exported, files: all.map((n) => byName[n].src), lists: lists(all.flatMap((n) => byName[n].modules)) };
  }
  const coreLists = lists(core.filter((m) => m.file !== DATA));
  const pagesText = fs.readFileSync(path.join(SITE, 'pages.js'), 'utf8');
  for (const p of JSON.parse(pagesText.slice(pagesText.indexOf('= [') + 2).replace(/;\s*$/, ''))) if (!screens[p.screen]) throw new Error('pages.js: ' + p.id + ' draws screen "' + p.screen + '", and site/screens/ has no such file');
  const appText = app(core, entry, screens, coreLists), appName = hashed('app.js', appText);
  const iconsText = fs.readFileSync(path.join(SITE, ICONS), 'utf8'), iconsName = hashed(ICONS, iconsText);
  const index = fs.readFileSync(path.join(SITE, 'index.html'), 'utf8');
  if (index.indexOf('{{APP}}') < 0 || index.indexOf('{{ICONS}}') < 0) throw new Error('site/index.html needs {{APP}} and {{ICONS}}');
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(path.join(OUT, 'screens'), { recursive: true });
  copyDir(path.join(SITE, 'assets'), path.join(OUT, 'assets'));
  fs.writeFileSync(path.join(OUT, iconsName), iconsText);
  fs.writeFileSync(path.join(OUT, appName), appText);
  for (const [name, text] of Object.entries(written)) fs.writeFileSync(path.join(OUT, name), text);
  fs.writeFileSync(path.join(OUT, 'index.html'), index.split('{{APP}}').join(appName).split('{{ICONS}}').join(iconsName));
  const kb = (n) => Math.round(n / 1024) + ' KB';
  console.log('Built public/' + appName + ' (' + kb(appText.length) + '), ' + parts.length + ' screen files in public/screens/ ('
    + kb(Object.values(written).reduce((a, t) => a + t.length, 0)) + '), public/index.html and public/assets/');
} catch (e) {
  console.error('BUILD FAILED, nothing was written: ' + e.message);
  process.exit(1);
}
