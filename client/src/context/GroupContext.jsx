import React, { createContext, useContext, useState, useCallback } from 'react';
import { groupService } from '../services/groupService';
import { settlementService } from '../services/settlementService';

const GroupContext = createContext(null);

export const GroupProvider = ({ children }) => {
  const [groups, setGroups] = useState([]);
  const [activeGroup, setActiveGroup] = useState(null);
  const [activeUserRole, setActiveUserRole] = useState('member');
  const [groupBalances, setGroupBalances] = useState(null);
  const [globalSummary, setGlobalSummary] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchMyGroups = useCallback(async (params = {}) => {
    try {
      setLoading(true);
      const data = await groupService.getMyGroups(params);
      setGroups(data);
      return data;
    } catch (err) {
      console.error('Failed to fetch groups:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchGlobalSummary = useCallback(async () => {
    try {
      const data = await settlementService.getUserGlobalSummary();
      setGlobalSummary(data);
      return data;
    } catch (err) {
      console.error('Failed to fetch global summary:', err);
    }
  }, []);

  const loadGroupDetails = useCallback(async (groupId) => {
    try {
      setLoading(true);
      const data = await groupService.getGroupDetails(groupId);
      setActiveGroup(data.group);
      setActiveUserRole(data.userRole || 'member');
      setGroupBalances(data.balances);
      return data;
    } catch (err) {
      console.error('Failed to load group:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshBalances = useCallback(async (groupId) => {
    try {
      const data = await settlementService.getGroupBalances(groupId);
      setGroupBalances(data);
      fetchGlobalSummary();
      return data;
    } catch (err) {
      console.error('Failed to refresh balances:', err);
    }
  }, [fetchGlobalSummary]);

  return (
    <GroupContext.Provider
      value={{
        groups,
        activeGroup,
        activeUserRole,
        groupBalances,
        globalSummary,
        loading,
        fetchMyGroups,
        fetchGlobalSummary,
        loadGroupDetails,
        refreshBalances,
        setActiveGroup,
        setActiveUserRole
      }}
    >
      {children}
    </GroupContext.Provider>
  );
};

export const useGroup = () => {
  const context = useContext(GroupContext);
  if (!context) {
    throw new Error('useGroup must be used within a GroupProvider');
  }
  return context;
};
