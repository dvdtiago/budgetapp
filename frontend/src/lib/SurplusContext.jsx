import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import api from './api.js';
import { useMonth } from './MonthContext.jsx';

const SurplusContext = createContext(null);

export function SurplusProvider({ children }) {
  const { month } = useMonth();
  const [surplusData, setSurplusData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get(`/surplus/${month}`);
      setSurplusData(r.data);
    } catch {
      setSurplusData(null);
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => { load(); }, [load]);

  const plan = surplusData?.saved?.allocations ?? [];
  const hasPlan = !!surplusData?.saved;

  return (
    <SurplusContext.Provider value={{
      surplusData,
      plan,
      hasPlan,
      surplus: surplusData?.surplus ?? 0,
      carryover: surplusData?.carryover ?? 0,
      loading,
      refresh: load,
    }}>
      {children}
    </SurplusContext.Provider>
  );
}

export function useSurplus() {
  return useContext(SurplusContext);
}
