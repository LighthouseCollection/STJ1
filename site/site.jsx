/* St. John the Beloved test site · the frame every screen shares (site/site.jsx): the site header (AppHeader with
   search, New member and the account menu), the navigation pane (NavPane with a NavList of every page in pages.js and a
   ToolRail of the groups), the status bar, the command palette (Ctrl Shift P) and the site's shortcuts.
   A screen receives { screen, chrome } and draws either a page template, given chrome's header, sideNav and footer
   (<ListingPage {...chrome} …/>), or <SitePage chrome={chrome} page="…">…</SitePage> (an AppShell with the same chrome). */
import { AppHeader, AppShell, Button, CommandPalette, NavList, NavPane, SearchField, StatusBar, ToolRail, useHotkey } from 'plenix-platform';
import { PAGES } from './pages.js';
import { CHURCH, ME } from './data.js';
const { useState, createContext, useContext } = React;

export const SiteContext = createContext(null);
export const useSite = () => useContext(SiteContext);

// the address of a page (its open value for one with an :id part)
export const pageHref = (p) => '#' + (p.navOpen || p.open || p.path);
export const NAV_PAGES = PAGES.filter((p) => p.nav !== false);
const GROUPS = [...new Set(NAV_PAGES.map((p) => p.group))];

// an AppShell with the site's chrome: page is the kind of page (workspace, dashboard, settings, form, detail, master-detail, editor)
export function SitePage({ chrome, page = 'workspace', panel, children, className }) {
  return <AppShell page={page} header={chrome.header} sideNav={chrome.sideNav} footer={chrome.footer} panel={panel} className={className}>{children}</AppShell>;
}

// the chrome for the current page: header, sideNav, footer
export function useChrome({ current, navigate, query, setQuery }) {
  const [narrowQ, setNarrowQ] = [query, setQuery];
  const header = (
    <AppHeader tone="accent" appName={CHURCH.short} brandHref="#/"
      action={<AppHeader.Action variant="secondary" icon="add" onClick={() => navigate('/members/new')}>New member</AppHeader.Action>}
      search={<SearchField placeholder="Search members, families, documents…" label="Search the parish" onAccent
        value={narrowQ} onChange={(e) => setNarrowQ(e.target.value)} onClear={() => setNarrowQ('')}
        onKeyDown={(e) => { if (e.key === 'Enter' && narrowQ.trim()) navigate('/search', { q: narrowQ.trim() }); }} />}
      account={<AppHeader.Account name={ME.name} email={ME.email} current={current === 'account' ? 'account' : current === 'settings' ? 'settings' : undefined}
        myAccount={{ href: '#/account' }} settings={{ href: '#/settings/general' }} signOut={{ href: '#/sign-in' }} />} />
  );
  // only the group of the current page starts open: the pane stays short enough that its pinned footer follows the list
  const firstOf = (g) => NAV_PAGES.find((p) => p.group === g);
  // each group heading carries the same picture as its button on the rail (the first page's icon), open or shut (#9)
  const groups = GROUPS.map((g) => ({ heading: g, icon: firstOf(g).icon, defaultExpanded: NAV_PAGES.some((p) => p.group === g && p.id === current), items: NAV_PAGES.filter((p) => p.group === g).map((p) => ({ id: p.id, label: p.title, icon: p.icon, href: pageHref(p) })) }));
  const sideNav = (
    <NavPane label="Parish" title={CHURCH.short} as="div"
      rail={GROUPS.map((g) => { const p = firstOf(g); return <ToolRail.Item key={g} icon={p.icon} label={g} pressed={NAV_PAGES.some((x) => x.group === g && x.id === current)} onClick={() => navigate(p.navOpen || p.open || p.path)} />; })}
      footer={<Button size="sm" variant="ghost" icon="gear" onClick={() => navigate('/settings/general')}>Parish settings</Button>}>
      <NavList label="Parish" value={current} groups={groups} />
    </NavPane>
  );
  const footer = <StatusBar start={<span>{CHURCH.name}</span>} end={<span>Test data: every person is made up</span>} />;
  return { header, sideNav, footer };
}

// the site's commands (the command palette, Ctrl K) and shortcuts: N opens New member, G then a letter goes to a page
export function SiteCommands({ navigate }) {
  useHotkey('N', () => navigate('/members/new'), { label: 'New member', group: 'Members' });
  useHotkey('G M', () => navigate('/members'), { label: 'Go to members', group: 'Navigation' });
  useHotkey('G C', () => navigate('/calendar'), { label: 'Go to the calendar', group: 'Navigation' });
  useHotkey('G D', () => navigate('/giving'), { label: 'Go to donations', group: 'Navigation' });
  useHotkey('G H', () => navigate('/'), { label: 'Go to the dashboard', group: 'Navigation' });
  useHotkey('G S', () => navigate('/servants'), { label: 'Go to servants', group: 'Navigation' });
  const items = NAV_PAGES.map((p) => ({ id: p.id, label: p.title, icon: p.icon, group: p.group, onSelect: () => navigate(p.navOpen || p.open || p.path) }))
    .concat([{ id: 'cmd-new-member', label: 'New member', icon: 'add', group: 'Commands', shortcut: 'N', onSelect: () => navigate('/members/new') }]);
  // Ctrl K is the header search's (AppHeader; its own listener also takes Ctrl Shift K): the palette takes Ctrl Shift P
  return <CommandPalette items={items} hotkey="Mod+Shift+P" title="Go to a page or run a command" />;
}
