import { useEffect, useRef, useState, type ReactNode } from 'react';

import { api } from '../lib/api-client';
import {
  CONSECUTIVE_THRESHOLD,
  DowntimeContext,
  TIME_WINDOW_MS,
  isNetworkOr503,
} from '../hooks/useDowntime';

export function DowntimeProvider({ children }: { children: ReactNode }) {
  const [isDowntime, setIsDowntime] = useState(false);
  const failureSlots = useRef<number[]>([]);
  const registered = useRef(false);

  useEffect(() => {
    if (registered.current) return;
    registered.current = true;

    const resInterceptor = api.interceptors.response.use(
      (response) => {
        failureSlots.current = [];
        setIsDowntime(false);
        return response;
      },
      (error: import('axios').AxiosError) => {
        if (isNetworkOr503(error)) {
          const now = Date.now();
          failureSlots.current.push(now);
          failureSlots.current = failureSlots.current.filter(
            (t) => now - t < TIME_WINDOW_MS,
          );
          if (failureSlots.current.length >= CONSECUTIVE_THRESHOLD) {
            setIsDowntime(true);
          }
        }
        return Promise.reject(error);
      },
    );

    return () => {
      api.interceptors.response.eject(resInterceptor);
    };
  }, []);

  const dismiss = () => setIsDowntime(false);

  return (
    <DowntimeContext.Provider value={{ isDowntime, dismiss }}>
      {children}
    </DowntimeContext.Provider>
  );
}
