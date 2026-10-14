import { useState, useEffect, useCallback } from 'react';
import type { HealthStatus } from '../types';
import { ApiService } from '../services/api';

export function useHealth() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHealth = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await ApiService.getHealth();
      setHealth(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch health');
      setHealth(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 15000);
    return () => clearInterval(interval);
  }, [fetchHealth]);

  return { health, isLoading, error, refresh: fetchHealth };
}
