import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import ProjectConfiguration from '../ProjectConfig/ProjectConfiguration';

const MasterConfig = () => {
  const url = import.meta.env.VITE_API_BASE_URL;

  // Type and Group selection
  const [typeOptions, setTypeOptions] = useState([]);
  const [groupOptions, setGroupOptions] = useState([]);

  const [selectedType, setSelectedType] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState(null);

  // Fetch groups
  const fetchGroup = async () => {
    try {
      const res = await axios.get(`${url}/Groups`);
      const formattedGroups = (res.data || []).map(group => ({
        label: group.name || group.groupName,
        value: group.id || group.groupId,
      }));
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

  const handleReset = () => {
    setSelectedType(null);
    setSelectedGroup(null);
  };

  const handleResetAll = () => {
    setSelectedType(null);
    setSelectedGroup(null);
  };

  // Memoize options to prevent unnecessary re-renders
  const memoizedTypeOptions = useMemo(() => typeOptions, [typeOptions]);
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
