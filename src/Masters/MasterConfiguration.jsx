import React, { useState, useEffect } from "react";
import { Row, Col, Typography, Select, Form } from "antd";
import { useToast } from "../hooks/useToast";
import { useMasterConfigData } from "./hooks/useMasterConfigData";
import { useMasterConfigSave } from "./hooks/useMasterConfigSave";
import ModuleSelectionCard from "../ProjectConfig/components/ModuleSelectionCard";
import EnvelopeSetupCard from "../ProjectConfig/components/EnvelopeSetupCard";
import EnvelopeMakingCriteriaCard from "../ProjectConfig/components/EnvelopeMakingCriteriaCard";
import ExtraProcessingCard from "../ProjectConfig/components/ExtraProcessingCard";
import BoxBreakingCard from "../ProjectConfig/components/BoxBreakingCard";
import ConfigSummaryCard from "../ProjectConfig/components/ConfigSummaryCard";
import { EXTRA_ALIAS_NAME } from "../ProjectConfig/components/constants";
import DuplicateTool from "../ToolsProcessing/DuplicateTool";
import API from "../hooks/api";

const MasterConfiguration = () => {
  const { showToast } = useToast();
  const token = localStorage.getItem("token");

  // Group and Type selection
  const [groups, setGroups] = useState([]);
  const [types, setTypes] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [selectedType, setSelectedType] = useState(null);

  // State management (same as ProjectConfiguration)
  const [enabledModules, setEnabledModules] = useState([]);
  const [boxBreakingCriteria, setBoxBreakingCriteria] = useState(["capacity"]);
  const [innerEnvelopes, setInnerEnvelopes] = useState([]);
  const [outerEnvelopes, setOuterEnvelopes] = useState([]);
  const [extraProcessingConfig, setExtraProcessingConfig] = useState({});
  const [selectedEnvelopeFields, setSelectedEnvelopeFields] = useState([]);
  const [selectedBoxFields, setSelectedBoxFields] = useState([]);
  const [boxCapacities, setBoxCapacities] = useState([]);
  const [selectedCapacity, setSelectedCapacity] = useState(null);
  const [configExists, setConfigExists] = useState(false);
  const [startBoxNumber, setStartBoxNumber] = useState(0);
  const [startOmrEnvelopeNumber, setStartOmrEnvelopeNumber] = useState(0);
  const [selectedDuplicatefields, setSelectedDuplicatefields] = useState([]);
  const [selectedSortingField, setSelectedSortingField] = useState([]);
  const [resetOnSymbolChange, setResetOnSymbolChange] = useState(false);
  const [resetOmrSerialOnCatchChange, setResetOmrSerialOnCatchChange] = useState(false);
  const [isInnerBundlingDone, setIsInnerBundlingDone] = useState(false);
  const [innerBundlingCriteria, setInnerBundlingCriteria] = useState([]);
  const [duplicateConfig, setDuplicateConfig] = useState({
    duplicateCriteria: [],
    enhancement: 0,
    enhancementEnabled: false,
    enhancementType: "round",
  });

  // Fetch data using custom hook
  const {
    toolModules,
    envelopeOptions,
    extraTypes,
    fields,
    mergedModules,
    extraTypeSelection,
    setExtraTypeSelection,
  } = useMasterConfigData(token);

  // Fetch groups and types
  useEffect(() => {
    const fetchGroupsAndTypes = async () => {
      try {
        // Assuming API endpoints exist for groups and types
        const groupsRes = await API.get("/Groups");
        const typesRes = await API.get("/Types");
        setGroups(groupsRes.data);
        setTypes(typesRes.data);
      } catch (err) {
        console.error("Failed to fetch groups/types", err);
      }
    };
    fetchGroupsAndTypes();
  }, []);

  const fetchMasterConfigData = async (groupId, typeId) => {
    console.log("Fetching config data for group:", groupId, "type:", typeId);

    let masterConfig = null;
    let extrasConfig = [];
    let duplicateConfigRes = {
      duplicateCriteria: [],
      enhancement: 0,
      enhancementEnabled: false,
    };

    // Fetch master config
    try {
      const res = await API.get(`/MasterConfigs/ByGroupAndType/${groupId}/${typeId}`);
      masterConfig = res.data;
      console.log("Parsed Master Config:", masterConfig);
      setConfigExists(true);

      duplicateConfigRes = {
        duplicateCriteria: Array.isArray(masterConfig.duplicateCriteria)
          ? [...masterConfig.duplicateCriteria]
          : JSON.parse(masterConfig.duplicateCriteria || "[]"),
        enhancement: Number(masterConfig.enhancement) || 0,
        enhancementEnabled: Number(masterConfig.enhancement) > 0,
      };
      setDuplicateConfig(JSON.parse(JSON.stringify(duplicateConfigRes)));
    } catch (err) {
      if (err.response?.status === 404) {
        console.warn(`No existing configuration for GroupId: ${groupId}, TypeId: ${typeId}`);
        setConfigExists(false);
        setDuplicateConfig(duplicateConfigRes);
      } else {
        console.error("Failed to load master config", err.response?.data || err.message);
        setConfigExists(false);
        return null;
      }
    }

    // Fetch extra config data
    try {
      const extrasRes = await API.get(`/MasterExtrasConfigurations/ByGroupAndType/${groupId}/${typeId}`);
      extrasConfig = extrasRes.data;
    } catch (err) {
      if (err.response?.status !== 404) {
        console.error("Failed to load extras config", err.response?.data || err.message);
      }
    }

    // Fetch box capacities
    let resolvedCapacity = null;
    try {
      const boxRes = await API.get(`/BoxCapacities`);
      const boxConfig = boxRes.data;
      setBoxCapacities(boxConfig);
      resolvedCapacity = masterConfig?.boxCapacity || (boxConfig.length > 0 ? boxConfig[0].id : null);
      setSelectedCapacity(resolvedCapacity);
    } catch (err) {
      console.error("Failed to load box capacities", err.response?.data || err.message);
    }

    if (masterConfig && toolModules.length > 0) {
      const enabledNames = new Set();
      const extraModuleNames = ["Nodal Extra Calculation", "University Extra Calculation"];
      masterConfig.modules?.forEach((moduleId) => {
        const module = toolModules.find((m) => m.id === moduleId);
        if (module) {
          if (extraModuleNames.includes(module.name)) enabledNames.add("Extra Configuration");
          else enabledNames.add(module.name);
        }
      });

      const envelopeParsed = JSON.parse(masterConfig.envelope || "{}");
      const parsedInnerEnvelopes = envelopeParsed.Inner ? [envelopeParsed.Inner] : [];
      const parsedOuterEnvelopes = envelopeParsed.Outer ? [envelopeParsed.Outer] : [];
      const parsedBoxFields = fields
        .filter((f) => masterConfig.boxBreakingCriteria?.includes(f.fieldId))
        .map((f) => f.fieldId);

      setEnabledModules(Array.from(enabledNames));
      setInnerEnvelopes(parsedInnerEnvelopes);
      setOuterEnvelopes(parsedOuterEnvelopes);
      setSelectedEnvelopeFields(masterConfig.envelopeMakingCriteria || []);
      setStartOmrEnvelopeNumber(masterConfig.omrSerialNumber || 0);
      setSelectedBoxFields(parsedBoxFields);
      setStartBoxNumber(masterConfig.boxNumber || 0);
      setBoxBreakingCriteria(["capacity", ...(masterConfig.boxBreakingCriteria || [])]);
      setSelectedDuplicatefields(masterConfig.duplicateRemoveFields || []);
      setSelectedSortingField(masterConfig.sortingBoxReport || []);
      setResetOnSymbolChange(masterConfig.resetOnSymbolChange ?? false);
      setResetOmrSerialOnCatchChange(masterConfig.resetOmrSerialOnCatchChange ?? false);
      setIsInnerBundlingDone(masterConfig.isInnerBundlingDone ?? false);
      setInnerBundlingCriteria(masterConfig.innerBundlingCriteria || []);
    } else {
      resetForm();
    }

    // Process Extra Configurations
    const extraProcessingParsed = {};
    const extraSelections = {};
    extrasConfig.forEach((item) => {
      const type = extraTypes.find((e) => e.extraTypeId === item.extraType)?.type;
      if (!type) return;
      const env = item.envelopeType ? JSON.parse(item.envelopeType) : { Inner: "", Outer: "" };
      extraProcessingParsed[type] = {
        envelopeType: { inner: env.Inner ? [env.Inner] : [], outer: env.Outer ? [env.Outer] : [] },
        fixedQty: item.mode === "Fixed" ? parseFloat(item.value) : 0,
        range: item.mode === "Range" ? parseFloat(item.value) : 0,
        percentage: item.mode === "Percentage" ? parseFloat(item.value) : 0,
      };
      extraSelections[type] = item.mode;
    });

    setExtraProcessingConfig(JSON.parse(JSON.stringify(extraProcessingParsed)));
    setExtraTypeSelection(JSON.parse(JSON.stringify(extraSelections)));
  };

  // Reset form function
  const resetForm = () => {
    setEnabledModules([]);
    setInnerEnvelopes([]);
    setOuterEnvelopes([]);
    setSelectedBoxFields([]);
    setSelectedEnvelopeFields([]);
    setExtraTypeSelection({});
    setExtraProcessingConfig({});
    setStartBoxNumber(0);
    setStartOmrEnvelopeNumber(0);
    setSelectedCapacity(null);
    setSelectedDuplicatefields([]);
    setSelectedSortingField([]);
    setResetOnSymbolChange(false);
    setResetOmrSerialOnCatchChange(false);
    setIsInnerBundlingDone(false);
    setInnerBundlingCriteria([]);
    setDuplicateConfig({
      duplicateCriteria: [],
      enhancement: 0,
      enhancementEnabled: false,
      enhancementType: "round",
    });
  };

  // Save logic using custom hook
  const { handleSave } = useMasterConfigSave(
    selectedGroup,
    selectedType,
    enabledModules,
    toolModules,
    innerEnvelopes,
    outerEnvelopes,
    selectedBoxFields,
    selectedEnvelopeFields,
    extraTypeSelection,
    extraTypes,
    selectedCapacity,
    startBoxNumber,
    startOmrEnvelopeNumber,
    selectedDuplicatefields,
    selectedSortingField,
    resetOnSymbolChange,
    resetOmrSerialOnCatchChange,
    isInnerBundlingDone,
    innerBundlingCriteria,
    extraProcessingConfig,
    duplicateConfig,
    fetchMasterConfigData,
    showToast,
    resetForm
  );

  // Helper function
  const isEnabled = (toolName) => enabledModules.includes(toolName);

  // Configuration status
  const envelopeConfigured = isEnabled("Envelope Breaking");
  const boxConfigured = isEnabled("Box Breaking");
  const extraConfigured = isEnabled(EXTRA_ALIAS_NAME);
  const duplicateConfigured = isEnabled("Duplicate Tool");

  useEffect(() => {
    if (!selectedGroup || !selectedType) return;
    fetchMasterConfigData(selectedGroup, selectedType);
  }, [selectedGroup, selectedType, token, extraTypes, fields, toolModules]);

  return (
    <div style={{ padding: 16 }}>
      {/* === PAGE HEADER === */}
      <div style={{ marginBottom: 24 }}>
        <Typography.Title level={3} style={{ margin: 0 }}>
          Master Configuration
        </Typography.Title>
      </div>

      {/* Group and Type Selection */}
      <Form layout="inline" style={{ marginBottom: 24 }}>
        <Form.Item label="Select Group" required>
          <Select
            placeholder="Select a group"
            style={{ width: 200 }}
            value={selectedGroup}
            onChange={(value) => {
              setSelectedGroup(value);
              resetForm();
            }}
          >
            {groups.map((group) => (
              <Select.Option key={group.id} value={group.id}>
                {group.name}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item label="Select Type" required>
          <Select
            placeholder="Select a type"
            style={{ width: 200 }}
            value={selectedType}
            onChange={(value) => {
              setSelectedType(value);
              resetForm();
            }}
          >
            {types.map((type) => (
              <Select.Option key={type.id} value={type.id}>
                {type.name}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>
      </Form>

      {selectedGroup && selectedType ? (
        <Row gutter={16} align="top">
          {/* LEFT SIDE */}
          <Col xs={24} md={16}>
            <ModuleSelectionCard
              mergedModules={mergedModules}
              enabledModules={enabledModules}
              setEnabledModules={setEnabledModules}
            />
            <DuplicateTool
              isEnabled={isEnabled}
              duplicateConfig={duplicateConfig}
              setDuplicateConfig={setDuplicateConfig}
              onReset={resetForm}
              importedSnapshot={null}
            />
            <EnvelopeSetupCard
              isEnabled={isEnabled}
              innerEnvelopes={innerEnvelopes}
              setInnerEnvelopes={setInnerEnvelopes}
              outerEnvelopes={outerEnvelopes}
              setOuterEnvelopes={setOuterEnvelopes}
              envelopeOptions={envelopeOptions}
              onReset={resetForm}
              importedSnapshot={null}
            />
            <ExtraProcessingCard
              isEnabled={isEnabled}
              extraTypes={extraTypes}
              extraTypeSelection={extraTypeSelection}
              setExtraTypeSelection={setExtraTypeSelection}
              extraProcessingConfig={extraProcessingConfig}
              setExtraProcessingConfig={setExtraProcessingConfig}
              envelopeOptions={envelopeOptions}
              onReset={resetForm}
              importedSnapshot={null}
            />
          </Col>

          {/* RIGHT SIDE */}
          <Col xs={24} md={8}>
            <EnvelopeMakingCriteriaCard
              isEnabled={isEnabled}
              fields={fields}
              selectedEnvelopeFields={selectedEnvelopeFields}
              setSelectedEnvelopeFields={setSelectedEnvelopeFields}
              setStartOmrEnvelopeNumber={setStartOmrEnvelopeNumber}
              startOmrEnvelopeNumber={startOmrEnvelopeNumber}
              resetOmrSerialOnCatchChange={resetOmrSerialOnCatchChange}
              setResetOmrSerialOnCatchChange={setResetOmrSerialOnCatchChange}
              onReset={resetForm}
              importedSnapshot={null}
            />
            <BoxBreakingCard
              isEnabled={isEnabled}
              boxBreakingCriteria={boxBreakingCriteria}
              setBoxBreakingCriteria={setBoxBreakingCriteria}
              fields={fields}
              selectedBoxFields={selectedBoxFields}
              setSelectedBoxFields={setSelectedBoxFields}
              boxCapacities={boxCapacities}
              selectedCapacity={selectedCapacity}
              setSelectedCapacity={setSelectedCapacity}
              setBoxCapacity={setBoxCapacities}
              startBoxNumber={startBoxNumber}
              setStartBoxNumber={setStartBoxNumber}
              selectedDuplicatefields={selectedDuplicatefields}
              setSelectedDuplicatefields={setSelectedDuplicatefields}
              selectedSortingField={selectedSortingField}
              setSelectedSortingField={setSelectedSortingField}
              resetOnSymbolChange={resetOnSymbolChange}
              setResetOnSymbolChange={setResetOnSymbolChange}
              isInnerBundlingDone={isInnerBundlingDone}
              setIsInnerBundlingDone={setIsInnerBundlingDone}
              innerBundlingCriteria={innerBundlingCriteria}
              setInnerBundlingCriteria={setInnerBundlingCriteria}
              onReset={resetForm}
              importedSnapshot={null}
            />
            <ConfigSummaryCard
              enabledModules={enabledModules}
              envelopeConfigured={envelopeConfigured}
              boxConfigured={boxConfigured}
              extraConfigured={extraConfigured}
              duplicateConfigured={duplicateConfigured}
              handleSave={handleSave}
              projectId={selectedGroup && selectedType ? `${selectedGroup}-${selectedType}` : null}
            />
          </Col>
        </Row>
      ) : (
        <Typography.Text type="secondary">
          Please select both Group and Type to configure master settings.
        </Typography.Text>
      )}
    </div>
  );
};

export default MasterConfiguration;
