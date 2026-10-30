import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import API from '../hooks/api';
import ProjectConfiguration from '../ProjectConfig/ProjectConfiguration';

const MasterConfig = () => {
  const url = import.meta.env.VITE_API_BASE_URL;

  // Type and Group selection
  const [typeOptions, setTypeOptions] = useState([]);
  const [groupOptions, setGroupOptions] = useState([]);
  const [configuredGroupIds, setConfiguredGroupIds] = useState([]);
  const [configuredTypeIds, setConfiguredTypeIds] = useState([]);

  const [selectedType, setSelectedType] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState(null);

  // Fetch groups and configured groups
  const fetchGroup = async () => {
    try {
      const [groupsRes, configuredRes] = await Promise.allSettled([
        axios.get(`${url}/Groups`),
        API.get('/MProjectConfigs')
      ]);

      const confIds = configuredRes.status === 'fulfilled' && Array.isArray(configuredRes.value?.data)
        ? configuredRes.value.data
        : [];
      setConfiguredGroupIds(confIds);

      const rawGroups = groupsRes.status === 'fulfilled' ? (groupsRes.value.data || []) : [];
      const formattedGroups = rawGroups.map(group => {
        const id = group.id || group.groupId;
        const isConfigured = confIds.includes(id);
        return {
          label: isConfigured ? `${group.name || group.groupName} ✓ (Configured)` : (group.name || group.groupName),
          value: id,
          isConfigured,
        };
      });

      // Sort: Configured groups first, then others alphabetically
      formattedGroups.sort((a, b) => {
        if (a.isConfigured && !b.isConfigured) return -1;
        if (!a.isConfigured && b.isConfigured) return 1;
        return (a.label || '').localeCompare(b.label || '');
      });

      setGroupOptions(formattedGroups);
    } catch (err) {
      console.error("Failed to fetch groups", err);
    }
  };

  // Fetch types
  const fetchType = async () => {
    try {
      const res = await axios.get(`${url}/PaperTypes`);
      const formattedTypes = (res.data || []).map(type => ({
        label: type.types,
        value: type.typeId,
      }));
      setTypeOptions(formattedTypes);
    } catch (err) {
      console.error("Failed to fetch paper types", err);
    }
  };

  useEffect(() => {
    fetchGroup();
    fetchType();
  }, []);

  // When selectedGroup changes, check which types are configured for it
  useEffect(() => {
    if (!selectedGroup) {
      setConfiguredTypeIds([]);
      return;
    }
    API.get(`/MProjectConfigs/SelectedGroup?GroupId=${selectedGroup}`)
      .then(res => {
        const tIds = Array.isArray(res.data) ? res.data : [];
        setConfiguredTypeIds(tIds);
      })
      .catch(err => {
        console.warn("Failed to fetch configured types for group", err);
        setConfiguredTypeIds([]);
      });
  }, [selectedGroup]);

  const handleReset = () => {
    setSelectedType(null);
    setSelectedGroup(null);
  };

  const handleResetAll = () => {
    setSelectedType(null);
    setSelectedGroup(null);
  };

  // Memoize options to prevent unnecessary re-renders
  const memoizedTypeOptions = useMemo(() => {
    if (!configuredTypeIds.length) return typeOptions;
    return typeOptions.map(t => ({
      ...t,
      label: configuredTypeIds.includes(t.value) ? `${t.label} ✓ (Configured)` : t.label,
    }));
  }, [typeOptions, configuredTypeIds]);

  const memoizedGroupOptions = useMemo(() => groupOptions, [groupOptions]);

  return (
    <div style={{ padding: 16 }}>
      {/* ProjectConfiguration Component with Type and Group selection */}
      <ProjectConfiguration 
        isMasterConfig={true}
        selectedType={selectedType}
        selectedGroup={selectedGroup}
        onTypeChange={setSelectedType}
        onGroupChange={setSelectedGroup}
        typeOptions={memoizedTypeOptions}
        groupOptions={memoizedGroupOptions}
        onReset={handleReset}
        onResetAll={handleResetAll}
      />
    </div>
  );
};

export default MasterConfig;
