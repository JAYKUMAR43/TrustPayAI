import React, { createContext, useContext, useState, useEffect } from 'react';
import * as api from '../services/api';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [health, setHealth] = useState(null);
  const [stats, setStats] = useState(null);
  const [scenarios, setScenarios] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [policies, setPolicies] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [currentPurchase, setCurrentPurchase] = useState(null);
  const [activeMandateId, setActiveMandateId] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refreshAll = async () => {
    setIsRefreshing(true);
    try {
      const [h, s, sc, p, pol, a] = await Promise.all([
        api.fetchHealth().catch(() => null),
        api.fetchStats().catch(() => null),
        api.fetchScenarios().catch(() => []),
        api.fetchHistory().catch(() => []),
        api.fetchPolicies().catch(() => []),
        api.fetchAuditLogs().catch(() => [])
      ]);
      setHealth(h);
      setStats(s);
      setScenarios(sc);
      setPurchases(p);
      setPolicies(pol);
      setAuditLogs(a);

      if (p && p.length > 0 && !currentPurchase) {
        setCurrentPurchase(p[0]);
        if (p[0].mandate_id) setActiveMandateId(p[0].mandate_id);
      }
    } catch (err) {
      console.error('Error refreshing state:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    refreshAll();
    const timer = setInterval(refreshAll, 12000);
    return () => clearInterval(timer);
  }, []);

  return (
    <AppContext.Provider
      value={{
        health,
        stats,
        scenarios,
        purchases,
        policies,
        auditLogs,
        currentPurchase,
        setCurrentPurchase,
        activeMandateId,
        setActiveMandateId,
        isRefreshing,
        refreshAll
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
