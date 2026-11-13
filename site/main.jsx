/* St. John the Beloved Coptic Orthodox Church · the test site (site/main.jsx): the site, loaded by boot.js once the parish
   data has come from the API; build.js compiles them to public/app.<hash>.js. A church database and membership app drawn only from
   Plenix (loaded from the CDN), made to hold every page template, pattern, component and control in real use, so the
   Plenix tests run here instead of on the design spec (owner, 2026-10-25). Each route of pages.js draws its screen
   (screens/<name>.jsx) with the site chrome; a screen loads when it first opens (screens.js), and until it is in the
   frame shows a Spinner in its place. */
import { Button, DirectionProvider, EmptyState, LocaleProvider, PageContent, Spinner, ToastProvider, useScreenLocation } from 'plenix-platform';
import { SiteContext, SiteCommands, SitePage, useChrome } from './site.jsx';
import { loadScreen, match, onRefreshed, prefetchNext, readyScreen, refreshScreen } from './screens.js';
const { useState } = React;

// a screen not loaded yet: the frame with a Spinner in its place, or, when it could not load, the error with Try again
function Opening({ chrome, page, failed, retry }) {
  return (
    <SitePage chrome={chrome}>
      <PageContent>
        {failed
          ? <EmptyState size="page" tone="error" title={page.title + ' could not open'} action={<Button icon="refresh" onClick={retry}>Try again</Button>}>{failed.message}</EmptyState>
          : <Spinner size="lg" label={'Opening ' + page.title} />}
      </PageContent>
    </SitePage>
  );
}

function Site() {
  const loc = useScreenLocation({ app: 'st-john' });
  const { page, params } = match(loc.parts);
  const [query, setQuery] = useState(loc.params.q || '');
  const [, setLoaded] = useState(0);
  const [failed, setFailed] = useState(null);
  const [attempt, setAttempt] = useState(0);
  const navigate = (path, q) => loc.navigate(path, q);
  const chrome = useChrome({ current: page.id, navigate, query, setQuery });
  const Screen = readyScreen(page.screen);
  React.useEffect(() => { document.title = page.title + ' · St. John the Beloved'; }, [page.id]);
  React.useEffect(() => {
    if (Screen) { prefetchNext(page.screen); return undefined; }
    let live = true;
    setFailed(null);
    loadScreen(page.screen).then(() => { if (live) setLoaded((n) => n + 1); }, (e) => { if (live) setFailed(e); });
    return () => { live = false; };
  }, [page.screen, !!Screen, attempt]);
  React.useEffect(() => onRefreshed(() => setLoaded((n) => n + 1)), []);
  React.useEffect(() => { if (Screen) refreshScreen(page.screen); }, [page.screen, params.id, !!Screen]);   // seen before: drawn at once, read again quietly
  const screen = Object.assign({}, loc, { page, id: params.id, navigate });
  const frame = page.chrome === false ? { header: null, sideNav: null, footer: null } : chrome;
  return (
    <SiteContext.Provider value={{ screen, chrome, navigate }}>
      {Screen
        ? <Screen key={page.id + ':' + (params.id || '')} screen={screen} chrome={frame} />
        : <Opening chrome={frame} page={page} failed={failed} retry={() => setAttempt((n) => n + 1)} />}
      <SiteCommands navigate={navigate} />
    </SiteContext.Provider>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <LocaleProvider locale="en-US"><DirectionProvider dir="ltr"><ToastProvider><Site /></ToastProvider></DirectionProvider></LocaleProvider>
);
