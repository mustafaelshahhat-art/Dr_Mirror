import { BrowserRouter } from 'react-router-dom';

import { Providers } from './app/providers';
import { AppRoutes } from './app/router';
import { ErrorBoundary } from './shared/components/ErrorBoundary';

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Providers>
          <AppRoutes />
        </Providers>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
