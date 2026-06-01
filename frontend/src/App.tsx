import { BrowserRouter } from 'react-router-dom';

import { Providers } from './app/providers';
import { AppRoutes } from './app/router';
import { ErrorBoundary } from './shared/components/ErrorBoundary';
import { ScrollToTop } from './shared/components/ScrollToTop';

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <ScrollToTop />
        <Providers>
          <AppRoutes />
        </Providers>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
