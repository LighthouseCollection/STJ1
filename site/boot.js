/* St. John the Beloved test site · the page entry (site/boot.js): before the site draws, the first screen opens: the
   frame's lists (the church, me) and the screen's lists in one request, side by side with the screen's file; then the
   site loads (main.jsx). A screen that could not load is shown again by main.jsx, with Try again. */
import { loadLists } from './data.js';
import { hashParts, loadScreen, match, screenLists } from './screens.js';

const first = match(hashParts()).page.screen;
const lists = loadLists(window.StJohn.coreLists.concat(screenLists(first)));
const screen = loadScreen(first).catch(() => {});
lists.then(() => screen).then(() => { require('./main.jsx'); }).catch((e) => {
  const root = document.getElementById('root');
  root.textContent = 'St. John the Beloved: the parish data could not load. ' + e.message;
  console.error(e);
});
