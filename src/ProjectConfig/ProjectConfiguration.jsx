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
  // Snapshot of imported configuration (null if no import done)
  const [importedSnapshot, setImportedSnapshot] = useState(null);
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
      setConfigExists(true);

      duplicateConfigRes = {
        duplicateCriteria: Array.isArray(projectConfig.duplicateCriteria)
          ? projectConfig.duplicateCriteria
          : JSON.parse(projectConfig.duplicateCriteria || "[]"),
        enhancement: Number(projectConfig.enhancement) || 0,
        enhancementEnabled: Number(projectConfig.enhancement) > 0,
      };
      setDuplicateConfig(duplicateConfigRes);

    } catch (err) {
      if (err.response?.status === 404) {
        console.warn(`No existing configuration for ProjectId: ${projectId}`);
        setConfigExists(false);
        setDuplicateConfig(duplicateConfigRes);
      } else {
        console.error("Failed to load project config", err.response?.data || err.message);
        setConfigExists(false);
        return null;
      }
    }

    // Fetch extra config data
    try {
      const extrasRes = await API.get(`/ExtrasConfigurations/ByProject/${projectId}`);
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
      resolvedCapacity = projectConfig?.boxCapacity || (boxConfig.length > 0 ? boxConfig[0].id : null);
      setSelectedCapacity(resolvedCapacity);
    } catch (err) {
      console.error("Failed to load box capacities", err.response?.data || err.message);
    }

    // Build values locally (don't rely on state — state is async)
    let parsedValues = {
      enabledModules: [],
      innerEnvelopes: [],
      outerEnvelopes: [],
      selectedEnvelopeFields: [],
      startOmrEnvelopeNumber: 0,
      resetOmrSerialOnCentreChange: false,
      selectedBoxFields: [],
      selectedCapacity: resolvedCapacity,
      startBoxNumber: 0,
      selectedDuplicatefields: [],
      selectedSortingField: [],
      resetOnSymbolChange: false,
      isInnerBundlingDone: false,
      innerBundlingCriteria: [],
      duplicateConfig: duplicateConfigRes,
      extraProcessingConfig: {},
      extraTypeSelection: {},
    };

    if (projectConfig && toolModules.length > 0) {
      const enabledNames = new Set();
      const extraModuleNames = ["Nodal Extra Calculation", "University Extra Calculation"];
      projectConfig.modules?.forEach((moduleId) => {
        const module = toolModules.find((m) => m.id === moduleId);
        if (module) {
          if (extraModuleNames.includes(module.name)) enabledNames.add("Extra Configuration");
          else enabledNames.add(module.name);
        }
      });

      const envelopeParsed = JSON.parse(projectConfig.envelope || "{}");
      const parsedInnerEnvelopes = envelopeParsed.Inner ? [envelopeParsed.Inner] : [];
      const parsedOuterEnvelopes = envelopeParsed.Outer ? [envelopeParsed.Outer] : [];
      const parsedBoxFields = fields
        .filter((f) => projectConfig.boxBreakingCriteria?.includes(f.fieldId))
        .map((f) => f.fieldId);

      parsedValues = {
        ...parsedValues,
        enabledModules: Array.from(enabledNames),
        innerEnvelopes: parsedInnerEnvelopes,
        outerEnvelopes: parsedOuterEnvelopes,
        selectedEnvelopeFields: projectConfig.envelopeMakingCriteria || [],
        startOmrEnvelopeNumber: projectConfig.omrSerialNumber || 0,
        selectedBoxFields: parsedBoxFields,
        startBoxNumber: projectConfig.boxNumber || 0,
        selectedDuplicatefields: projectConfig.duplicateRemoveFields || [],
        selectedSortingField: projectConfig.sortingBoxReport || [],
        resetOnSymbolChange: projectConfig.resetOnSymbolChange ?? false,
        resetOmrSerialOnCentreChange: projectConfig.resetOmrSerialOnCatchChange ?? false,
        isInnerBundlingDone: projectConfig.isInnerBundlingDone ?? false,
        innerBundlingCriteria: projectConfig.innerBundlingCriteria || [],
      };

      setEnabledModules(parsedValues.enabledModules);
      setInnerEnvelopes(parsedValues.innerEnvelopes);
      setOuterEnvelopes(parsedValues.outerEnvelopes);
      setSelectedEnvelopeFields(parsedValues.selectedEnvelopeFields);
      setStartOmrEnvelopeNumber(parsedValues.startOmrEnvelopeNumber);
      setSelectedBoxFields(parsedValues.selectedBoxFields);
      setStartBoxNumber(parsedValues.startBoxNumber);
      setBoxBreakingCriteria(["capacity", ...(projectConfig.boxBreakingCriteria || [])]);
      setSelectedDuplicatefields(parsedValues.selectedDuplicatefields);
      setSelectedSortingField(parsedValues.selectedSortingField);
      setResetOnSymbolChange(parsedValues.resetOnSymbolChange);
      setResetOmrSerialOnCentreChange(parsedValues.resetOmrSerialOnCentreChange);
      setIsInnerBundlingDone(parsedValues.isInnerBundlingDone);
      setInnerBundlingCriteria(parsedValues.innerBundlingCriteria);
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
      const env = item.envelopeType ? JSON.parse(item.envelopeType) : { Inner: "", Outer: "" };
      extraProcessingParsed[type] = {
        envelopeType: { inner: env.Inner ? [env.Inner] : [], outer: env.Outer ? [env.Outer] : [] },
        fixedQty: item.mode === "Fixed" ? parseFloat(item.value) : 0,
        range: item.mode === "Range" ? parseFloat(item.value) : 0,
        percentage: item.mode === "Percentage" ? parseFloat(item.value) : 0,
      };
      extraSelections[type] = item.mode;
    });

    parsedValues.extraProcessingConfig = extraProcessingParsed;
    parsedValues.extraTypeSelection = extraSelections;
    setExtraProcessingConfig(extraProcessingParsed);
    setExtraTypeSelection(extraSelections);

    return parsedValues;
  };

  const handleImport = async (importProjectId) => {
    const parsed = await fetchProjectConfigData(importProjectId);
    if (parsed) {
      setImportedSnapshot(parsed); // snapshot from freshly parsed data — not from stale state
      message.success("Configuration imported successfully! Review and save.");
    }
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
    setImportedSnapshot(null);
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

  // Per-module reset handlers — reverts to snapshot if import was done, else clears
  const resetEnvelopeSetup = () => {
    if (importedSnapshot && importedSnapshot !== "pending") {
      setInnerEnvelopes(importedSnapshot.innerEnvelopes);
      setOuterEnvelopes(importedSnapshot.outerEnvelopes);
    } else {
      setInnerEnvelopes([]);
      setOuterEnvelopes([]);
    }
  };

  const resetEnvelopeMakingCriteria = () => {
    if (importedSnapshot && importedSnapshot !== "pending") {
      setSelectedEnvelopeFields(importedSnapshot.selectedEnvelopeFields);
      setStartOmrEnvelopeNumber(importedSnapshot.startOmrEnvelopeNumber);
      setResetOmrSerialOnCentreChange(importedSnapshot.resetOmrSerialOnCentreChange);
    } else {
      setSelectedEnvelopeFields([]);
      setStartOmrEnvelopeNumber(0);
      setResetOmrSerialOnCentreChange(false);
    }
  };

  const resetBoxBreaking = () => {
    if (importedSnapshot && importedSnapshot !== "pending") {
      setSelectedBoxFields(importedSnapshot.selectedBoxFields);
      setSelectedCapacity(importedSnapshot.selectedCapacity);
      setStartBoxNumber(importedSnapshot.startBoxNumber);
      setSelectedDuplicatefields(importedSnapshot.selectedDuplicatefields);
      setSelectedSortingField(importedSnapshot.selectedSortingField);
      setResetOnSymbolChange(importedSnapshot.resetOnSymbolChange);
      setIsInnerBundlingDone(importedSnapshot.isInnerBundlingDone);
      setInnerBundlingCriteria(importedSnapshot.innerBundlingCriteria);
      setBoxBreakingCriteria(["capacity", ...importedSnapshot.selectedBoxFields]);
    } else {
      setSelectedBoxFields([]);
      setBoxBreakingCriteria(["capacity"]);
      setSelectedCapacity(boxCapacities.length > 0 ? boxCapacities[0].id : null);
      setStartBoxNumber(0);
      setSelectedDuplicatefields([]);
      setSelectedSortingField([]);
      setResetOnSymbolChange(false);
      setIsInnerBundlingDone(false);
      setInnerBundlingCriteria([]);
    }
  };

  const resetExtraProcessing = () => {
    if (importedSnapshot && importedSnapshot !== "pending") {
      setExtraProcessingConfig(importedSnapshot.extraProcessingConfig);
      setExtraTypeSelection(importedSnapshot.extraTypeSelection);
    } else {
      setExtraProcessingConfig({});
      setExtraTypeSelection({});
    }
  };

  const resetDuplicateTool = () => {
    if (importedSnapshot && importedSnapshot !== "pending") {
      setDuplicateConfig(importedSnapshot.duplicateConfig);
    } else {
      setDuplicateConfig({
        duplicateCriteria: [],
        enhancement: 0,
        enhancementEnabled: true,
        enhancementType: "round",
      });
    }
  };

  // Configuration status
  const envelopeConfigured = isEnabled("Envelope Breaking");
  const boxConfigured = isEnabled("Box Breaking");
  const extraConfigured = isEnabled(EXTRA_ALIAS_NAME);
  const duplicateConfigured = isEnabled("Duplicate Tool");

  useEffect(() => {
    if (!projectId) return;
    fetchProjectConfigData(projectId);
  }, [projectId, token, extraTypes, fields, showToast, toolModules]);

  // Once state settles after import, finalize the snapshot
  useEffect(() => {
    if (importedSnapshot !== "pending") return;
    setImportedSnapshot({
      enabledModules,
      innerEnvelopes,
      outerEnvelopes,
      selectedEnvelopeFields,
      startOmrEnvelopeNumber,
      resetOmrSerialOnCentreChange,
      selectedBoxFields,
      selectedCapacity,
      startBoxNumber,
      selectedDuplicatefields,
      selectedSortingField,
      resetOnSymbolChange,
      isInnerBundlingDone,
      innerBundlingCriteria,
      duplicateConfig,
      extraProcessingConfig,
      extraTypeSelection,
    });
  }, [importedSnapshot]);

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
          <DuplicateTool
            isEnabled={isEnabled}
            duplicateConfig={duplicateConfig}
            setDuplicateConfig={setDuplicateConfig}
            onReset={resetDuplicateTool}
            importedSnapshot={importedSnapshot}
          />
          <EnvelopeSetupCard
            isEnabled={isEnabled}
            innerEnvelopes={innerEnvelopes}
            setInnerEnvelopes={setInnerEnvelopes}
            outerEnvelopes={outerEnvelopes}
            setOuterEnvelopes={setOuterEnvelopes}
            envelopeOptions={envelopeOptions}
            onReset={resetEnvelopeSetup}
            importedSnapshot={importedSnapshot}
          />



          <ExtraProcessingCard
            isEnabled={isEnabled}
            extraTypes={extraTypes}
            extraTypeSelection={extraTypeSelection}
            setExtraTypeSelection={setExtraTypeSelection}
            extraProcessingConfig={extraProcessingConfig}
            setExtraProcessingConfig={setExtraProcessingConfig}
            envelopeOptions={envelopeOptions}
            onReset={resetExtraProcessing}
            importedSnapshot={importedSnapshot}
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
            resetOmrSerialOnCentreChange={resetOmrSerialOnCentreChange}
            setResetOmrSerialOnCentreChange={setResetOmrSerialOnCentreChange}
            onReset={resetEnvelopeMakingCriteria}
            importedSnapshot={importedSnapshot}
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
            onReset={resetBoxBreaking}
            importedSnapshot={importedSnapshot}
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
