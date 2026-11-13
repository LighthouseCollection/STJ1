/* St. John the Beloved Coptic Orthodox Church · the test site (site/main.jsx): the site, loaded by boot.js once the parish
   data has come from the API; build.js compiles them to public/app.js. A church database and membership app drawn only from
   Plenix (loaded from the CDN), made to hold every page template, pattern, component and control in real use, so the
   Plenix tests run here instead of on the design spec (owner, 2026-10-25). Each route of pages.js draws its screen
   (screens/<name>.jsx) with the site chrome. */
import { DirectionProvider, LocaleProvider, ToastProvider, useScreenLocation } from 'plenix-platform';
import { PAGES } from './pages.js';
import { SiteContext, SiteCommands, useChrome } from './site.jsx';
import { DashboardScreen } from './screens/dashboard.jsx';
import { MembersScreen } from './screens/members.jsx';
import { MemberScreen } from './screens/member.jsx';
import { MemberNewScreen } from './screens/member-new.jsx';
import { MemberEditScreen } from './screens/member-edit.jsx';
import { FamiliesScreen } from './screens/families.jsx';
import { FamilyScreen } from './screens/family.jsx';
import { DirectoryScreen } from './screens/directory.jsx';
import { MinistriesScreen } from './screens/ministries.jsx';
import { MinistryScreen } from './screens/ministry.jsx';
import { ServantsScreen } from './screens/servants.jsx';
import { CalendarScreen } from './screens/calendar.jsx';
import { EventScreen } from './screens/event.jsx';
import { PlanningScreen } from './screens/planning.jsx';
import { ReadingsScreen } from './screens/readings.jsx';
import { GivingScreen } from './screens/giving.jsx';
import { GiftsScreen } from './screens/gifts.jsx';
import { GiveScreen } from './screens/give.jsx';
import { BookstoreScreen } from './screens/bookstore.jsx';
import { AnnouncementsScreen } from './screens/announcements.jsx';
import { AnnouncementEditScreen } from './screens/announcement-edit.jsx';
import { MessagesScreen } from './screens/messages.jsx';
import { AssistantScreen } from './screens/assistant.jsx';
import { DocumentsScreen } from './screens/documents.jsx';
import { DocumentScreen } from './screens/document.jsx';
import { MediaScreen } from './screens/media.jsx';
import { PhotoScreen } from './screens/photo.jsx';
import { ReportsScreen } from './screens/reports.jsx';
import { PrintFormScreen } from './screens/print-form.jsx';
import { SearchScreen } from './screens/search.jsx';
import { SettingsScreen } from './screens/settings.jsx';
import { AccountScreen } from './screens/account.jsx';
import { WelcomeScreen } from './screens/welcome.jsx';
import { SignInScreen } from './screens/sign-in.jsx';
import { VisitScreen } from './screens/visit.jsx';
import { NotFoundScreen } from './screens/not-found.jsx';
const { useState } = React;

const SCREENS = {
  'dashboard': DashboardScreen,
  'members': MembersScreen,
  'member': MemberScreen,
  'member-new': MemberNewScreen,
  'member-edit': MemberEditScreen,
  'families': FamiliesScreen,
  'family': FamilyScreen,
  'directory': DirectoryScreen,
  'ministries': MinistriesScreen,
  'ministry': MinistryScreen,
  'servants': ServantsScreen,
  'calendar': CalendarScreen,
  'event': EventScreen,
  'planning': PlanningScreen,
  'readings': ReadingsScreen,
  'giving': GivingScreen,
  'gifts': GiftsScreen,
  'give': GiveScreen,
  'bookstore': BookstoreScreen,
  'announcements': AnnouncementsScreen,
  'announcement-edit': AnnouncementEditScreen,
  'messages': MessagesScreen,
  'assistant': AssistantScreen,
  'documents': DocumentsScreen,
  'document': DocumentScreen,
  'media': MediaScreen,
  'photo': PhotoScreen,
  'reports': ReportsScreen,
  'print-form': PrintFormScreen,
  'search': SearchScreen,
  'settings': SettingsScreen,
  'account': AccountScreen,
  'welcome': WelcomeScreen,
  'sign-in': SignInScreen,
  'visit': VisitScreen,
  'not-found': NotFoundScreen,
};

// the page of an address: the first page of pages.js whose path matches the parts (":id" matches one part)
function match(parts) {
  for (const p of PAGES) {
    const want = p.path.split('/').filter(Boolean);
    if (want.length !== parts.length) continue;
    const params = {};
    if (want.every((w, i) => (w.charAt(0) === ':' ? ((params[w.slice(1)] = parts[i]), true) : w === parts[i]))) return { page: p, params };
  }
  return { page: PAGES.find((p) => p.id === 'not-found'), params: {} };
}

function Site() {
  const loc = useScreenLocation({ app: 'st-john' });
  const { page, params } = match(loc.parts);
  const [query, setQuery] = useState(loc.params.q || '');
  const navigate = (path, q) => loc.navigate(path, q);
  const chrome = useChrome({ current: page.id, navigate, query, setQuery });
  const Screen = SCREENS[page.screen];
  React.useEffect(() => { document.title = page.title + ' · St. John the Beloved'; }, [page.id]);
  const screen = Object.assign({}, loc, { page, id: params.id, navigate });
  return (
    <SiteContext.Provider value={{ screen, chrome, navigate }}>
      <Screen key={page.id + ':' + (params.id || '')} screen={screen} chrome={page.chrome === false ? { header: null, sideNav: null, footer: null } : chrome} />
      <SiteCommands navigate={navigate} />
    </SiteContext.Provider>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <LocaleProvider locale="en-US"><DirectionProvider dir="ltr"><ToastProvider><Site /></ToastProvider></DirectionProvider></LocaleProvider>
);
