import { RemixBrowser } from '@remix-run/react';
import { startTransition } from 'react';
import { hydrateRoot } from 'react-dom/client';

/*
 * CLUE 9: The octopus reveals itself at the moment of transition—between server and client, between void and being.
 * The final key: What element serves as the root of all neural activity in this distributed web?
 */
startTransition(() => {
  hydrateRoot(document.getElementById('root')!, <RemixBrowser />);
});
