import React, { useState, useEffect } from "react";
import { Row, Col, Typography, message } from "antd";
import { useToast } from "../hooks/useToast";
import useStore from "../stores/ProjectData";
import { useProjectConfigData } from "./hooks/useProjectConfigData"; // Custom hook for fetching config data
import { useProjectConfigSave } from "./hooks/useProjectConfigSave";
import ModuleSelectionCard from "./components/ModuleSelectionCard";
import EnvelopeSetupCard from "./components/EnvelopeSetupCard";
import EnvelopeMakingCriteriaCard from "./components/EnvelopeMakingCriteriaCard";
import ExtraProcessingCard from "./components/ExtraProcessingCard";
import BoxBreakingCard from "./components/BoxBreakingCard";
import ConfigSummaryCard from "./components/ConfigSummaryCard";
import { EXTRA_ALIAS_NAME } from "./components/constants";
import DuplicateTool from "../ToolsProcessing/DuplicateTool";
import API from "../hooks/api";
import ImportConfig from "./components/ImportConfig";

const ProjectConfiguration = () => {
  const { showToast } = useToast();
  const projectId = useStore((state) => state.projectId);
  const token = localStorage.getItem("token");

  // State management
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
  const [resetOmrSerialOnCentreChange, setResetOmrSerialOnCentreChange] = useState(false);
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
  } = useProjectConfigData(token);

  const fetchProjectConfigData = async (projectId) => {
    console.log("Fetching config data for project:", projectId);

    let projectConfig = null;
    let extrasConfig = [];
    let duplicateConfigRes = {
      duplicateCriteria: [],
      enhancement: 0,
      enhancementEnabled: false,
    };

    // Fetch project config
    try {
      const res = await API.get(`/ProjectConfigs/ByProject/${projectId}`);
      projectConfig = res.data;
      console.log("Parsed Project Config:", projectConfig);
      setConfigExists(true); // Config exists

      // Normalize duplicate config from project config
      duplicateConfigRes = {
        duplicateCriteria: Array.isArray(projectConfig.duplicateCriteria)
          ? projectConfig.duplicateCriteria
          : JSON.parse(projectConfig.duplicateCriteria || "[]"),
        enhancement: Number(projectConfig.enhancement) || 0,
        enhancementEnabled: Number(projectConfig.enhancement) > 0,
      };
      setDuplicateConfig(duplicateConfigRes);
      console.log("Duplicate Tool Config (Mapped):", duplicateConfigRes);

    } catch (err) {
      if (err.response?.status === 404) {
        console.warn(`No existing configuration for ProjectId: ${projectId}`);
        setConfigExists(false);
        setDuplicateConfig(duplicateConfigRes); // Set defaults
      } else {
        console.error(
          "Failed to load project config",
          err.response?.data || err.message
        );
        setConfigExists(false);
        return;
      }
    }

    // Fetch extra config data
    try {
      const extrasRes = await API.get(`/ExtrasConfigurations/ByProject/${projectId}`);
      extrasConfig = extrasRes.data;
      console.log("Extras Config:", extrasConfig);
    } catch (err) {
      if (err.response?.status === 404) {
        console.warn(`No extra configuration for ProjectId: ${projectId}`);
      } else {
        console.error(
          "Failed to load extras config",
          err.response?.data || err.message
        );
      }
    }

    // Fetch box capacities
    try {
      const boxRes = await API.get(`/BoxCapacities`);
      const boxConfig = boxRes.data;
      console.log("Box Capacities:", boxConfig);
      setBoxCapacities(boxConfig);

      const selectedBoxCapacity = projectConfig?.boxCapacity;
      setSelectedCapacity(
        selectedBoxCapacity || (boxConfig.length > 0 ? boxConfig[0].id : null)
      );
    } catch (err) {
      console.error(
        "Failed to load box capacities",
        err.response?.data || err.message
      );
    }

    // Initialize project config states
    if (projectConfig && toolModules.length > 0) {
      const enabledNames = new Set();
      const extraModuleNames = [
        "Nodal Extra Calculation",
        "University Extra Calculation",
      ];

      projectConfig.modules?.forEach((moduleId) => {
        const module = toolModules.find((m) => m.id === moduleId);
        if (module) {
          if (extraModuleNames.includes(module.name)) {
            enabledNames.add("Extra Configuration");
          } else {
            enabledNames.add(module.name);
          }
        }
      });

      setEnabledModules(Array.from(enabledNames));

      // Envelope Setup
      const envelopeParsed = JSON.parse(projectConfig.envelope || "{}");
      setInnerEnvelopes(envelopeParsed.Inner ? [envelopeParsed.Inner] : []);
      setOuterEnvelopes(envelopeParsed.Outer ? [envelopeParsed.Outer] : []);

      // Envelope Making Criteria
      setSelectedEnvelopeFields(projectConfig.envelopeMakingCriteria || []);
      setStartOmrEnvelopeNumber(projectConfig.omrSerialNumber);
      // Box Breaking Criteria
      setSelectedBoxFields(
        fields
          .filter((f) => projectConfig.boxBreakingCriteria?.includes(f.fieldId))
          .map((f) => f.fieldId)
      );

      setStartBoxNumber(projectConfig.boxNumber)
      setBoxBreakingCriteria([
        "capacity",
        ...(projectConfig.boxBreakingCriteria || []),
      ]);
      setSelectedDuplicatefields(
        projectConfig.duplicateRemoveFields || []
      );
      setSelectedSortingField(projectConfig.sortingBoxReport || []);
      setResetOnSymbolChange(projectConfig.resetOnSymbolChange ?? false);
      setResetOmrSerialOnCentreChange(projectConfig.resetOmrSerialOnCatchChange ?? false);
      setIsInnerBundlingDone(projectConfig.isInnerBundlingDone ?? false);
      setInnerBundlingCriteria(projectConfig.innerBundlingCriteria || []);
    } else {
      setEnabledModules([]);
      setInnerEnvelopes([]);
      setOuterEnvelopes([]);
      setSelectedEnvelopeFields([]);
      setSelectedBoxFields([]);
      setBoxBreakingCriteria(["capacity"]);
      setSelectedDuplicatefields([]);
      setSelectedSortingField([]);
      setResetOnSymbolChange(false);
      setResetOmrSerialOnCentreChange(false);
      setIsInnerBundlingDone(false);
      setInnerBundlingCriteria([]);
    }

    // Process Extra Configurations
    const extraProcessingParsed = {};
    const extraSelections = {};

    extrasConfig.forEach((item) => {
      const type = extraTypes.find((e) => e.extraTypeId === item.extraType)?.type;
      if (!type) return;

      const env = item.envelopeType
        ? JSON.parse(item.envelopeType)
        : { Inner: "", Outer: "" };

      extraProcessingParsed[type] = {
        envelopeType: {
          inner: env.Inner ? [env.Inner] : [],
          outer: env.Outer ? [env.Outer] : [],
        },
        fixedQty: item.mode === "Fixed" ? parseFloat(item.value) : 0,
        range: item.mode === "Range" ? parseFloat(item.value) : 0,
        percentage: item.mode === "Percentage" ? parseFloat(item.value) : 0,
      };
      extraSelections[type] = item.mode;
    });

    setExtraProcessingConfig(extraProcessingParsed);
    setExtraTypeSelection(extraSelections);
  };


  const handleImport = async (importProjectId) => {
    await fetchProjectConfigData(importProjectId);
    message.success("Configuration imported successfully! Review and save.");

  };

  // Reset form function
  const resetForm = () => {
    setEnabledModules([]);
    setInnerEnvelopes([]);
    setOuterEnvelopes([]);
    setSelectedBoxFields([]);
    setSelectedEnvelopeFields([]);
    setExtraTypeSelection({});
    setBoxCapacities([]);
    setStartBoxNumber();
    setStartOmrEnvelopeNumber();
    setSelectedCapacity();
    setSelectedDuplicatefields([]);
    setSelectedSortingField([]);
    setResetOnSymbolChange(false);
    setResetOmrSerialOnCentreChange(false);
    setIsInnerBundlingDone(false);
    setInnerBundlingCriteria([]);
  };

  // Save logic using custom hook
  const { handleSave } = useProjectConfigSave(
    projectId,
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
    resetOmrSerialOnCentreChange,
    isInnerBundlingDone,
    innerBundlingCriteria,
    extraProcessingConfig,
    duplicateConfig,
    fetchProjectConfigData,
    showToast,
    resetForm
  );
  console.log(selectedCapacity);
  console.log("Type of selectedCapacity:", typeof selectedCapacity);

  // Helper function
  const isEnabled = (toolName) => enabledModules.includes(toolName);

  // Configuration status
  const envelopeConfigured = isEnabled("Envelope Breaking");
  const boxConfigured = isEnabled("Box Breaking");
  const extraConfigured = isEnabled(EXTRA_ALIAS_NAME);
  const duplicateConfigured = isEnabled("Duplicate Tool");

  useEffect(() => {
    if (!projectId) return;
    fetchProjectConfigData(projectId);
  }, [projectId, token, extraTypes, fields, showToast, toolModules]);

  useEffect(() => {
    console.log("Box Capacities Updated:", boxCapacities);
  }, [boxCapacities]);

  return (
    <div style={{ padding: 16 }}>
      {/* === PAGE HEADER === */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <Typography.Title level={3} style={{ margin: 0 }}>
          Project Configuration
        </Typography.Title>

        <ImportConfig onImport={handleImport} disabled={configExists} />
      </div>

      <Row gutter={16} align="top">
        {/* LEFT SIDE */}
        <Col xs={24} md={16}>
          <ModuleSelectionCard
            mergedModules={mergedModules}
            enabledModules={enabledModules}
            setEnabledModules={setEnabledModules}
          />

          <EnvelopeSetupCard
            isEnabled={isEnabled}
            innerEnvelopes={innerEnvelopes}
            setInnerEnvelopes={setInnerEnvelopes}
            outerEnvelopes={outerEnvelopes}
            setOuterEnvelopes={setOuterEnvelopes}
            envelopeOptions={envelopeOptions}
          />

          <EnvelopeMakingCriteriaCard
            isEnabled={isEnabled}
            fields={fields}
            selectedEnvelopeFields={selectedEnvelopeFields}
            setSelectedEnvelopeFields={setSelectedEnvelopeFields}
            setStartOmrEnvelopeNumber={setStartOmrEnvelopeNumber}
            startOmrEnvelopeNumber={startOmrEnvelopeNumber}
            resetOmrSerialOnCentreChange={resetOmrSerialOnCentreChange}
            setResetOmrSerialOnCentreChange={setResetOmrSerialOnCentreChange}
          />

          <ExtraProcessingCard
            isEnabled={isEnabled}
            extraTypes={extraTypes}
            extraTypeSelection={extraTypeSelection}
            setExtraTypeSelection={setExtraTypeSelection}
            extraProcessingConfig={extraProcessingConfig}
            setExtraProcessingConfig={setExtraProcessingConfig}
            envelopeOptions={envelopeOptions}
          />
        </Col>

        {/* RIGHT SIDE */}
        <Col xs={24} md={8}>
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
          />

          <DuplicateTool
            isEnabled={isEnabled}
            duplicateConfig={duplicateConfig}
            setDuplicateConfig={setDuplicateConfig}
          />

          <ConfigSummaryCard
            enabledModules={enabledModules}
            envelopeConfigured={envelopeConfigured}
            boxConfigured={boxConfigured}
            extraConfigured={extraConfigured}
            duplicateConfigured={duplicateConfigured}
            handleSave={handleSave}
            projectId={projectId}
          />
        </Col>
      </Row>
    </div>
  );
};

export default ProjectConfiguration;
