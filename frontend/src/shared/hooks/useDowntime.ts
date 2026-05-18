import { createContext, useContext } from 'react';
import { type AxiosError } from 'axios';

interface DowntimeState {
  isDowntime: boolean;
  dismiss: () => void;
}

const DowntimeContext = createContext<DowntimeState>({
  isDowntime: false,
  dismiss: () => {},
});

export function useDowntime() {
  return useContext(DowntimeContext);
}

export const CONSECUTIVE_THRESHOLD = 2;
export const TIME_WINDOW_MS = 30_000;

export function isNetworkOr503(error: AxiosError): boolean {
  if (!error.response) return true;
  return error.response.status === 503;
}

export { DowntimeContext };
export type { DowntimeState };
