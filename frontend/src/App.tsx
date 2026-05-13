import { BrowserRouter } from 'react-router-dom';

import { Providers } from './app/providers';
import { AppRoutes } from './app/router';

/**
 * App entrypoint:
 *   BrowserRouter (must wrap Providers because the navigate/useHref hooks
 *     inside Providers depend on the Router context)
 *     → Providers (theme, HeroUI/RAC, query, i18n, direction sync)
 *       → AppRoutes
 */
export default function App() {
  return (
    <BrowserRouter>
      <Providers>
        <AppRoutes />
      </Providers>
    </BrowserRouter>
  );
}
