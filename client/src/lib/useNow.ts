import { useEffect, useState } from 'react';

/** `Date.now()`, refreshed every `intervalMs`, for relative times ("2 min ago") that stay true. */
export function useNow(intervalMs = 60_000): number {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const id = window.setInterval(() => {
      setNow(Date.now());
    }, intervalMs);
    return () => {
      window.clearInterval(id);
    };
  }, [intervalMs]);
  return now;
}
