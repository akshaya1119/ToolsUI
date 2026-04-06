import React, { useState, useEffect } from "react";

import { Row, Col, Typography, message, Card, Select, Space, Button } from "antd";
import { ReloadOutlined } from "@ant-design/icons";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { useToast } from "../hooks/useToast";
import useStore from "../stores/ProjectData";
import { useProjectConfigData } from "./hooks/useProjectConfigData";
import { useProjectConfigSave } from "./hooks/useProjectConfigSave";
import { useConfigChangeDetection } from "./hooks/useConfigChangeDetection";
import ModuleSelectionCard from "./components/ModuleSelectionCard";
import EnvelopeSetupCard from "./components/EnvelopeSetupCard";
import EnvelopeMakingCriteriaCard from "./components/EnvelopeMakingCriteriaCard";
import ExtraProcessingCard from "./components/ExtraProcessingCard";
import BoxBreakingCard from "./components/BoxBreakingCard";
import ConfigSummaryCard from "./components/ConfigSummaryCard";
import ConfigChangeModal from "./components/ConfigChangeModal";
import { EXTRA_ALIAS_NAME } from "./components/constants";
import DuplicateTool from "../ToolsProcessing/DuplicateTool";
import API from "../hooks/api";
import ImportConfig from "./components/ImportConfig";

const ProjectConfiguration = ({ isMasterConfig = false, selectedType = null, selectedGroup = null, onTypeChange = null, onGroupChange = null, typeOptions: propTypeOptions = [], groupOptions: propGroupOptions = [], onReset = null, onResetAll = null }) => {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const projectId = useStore((state) => state.projectId);
  const url = import.meta.env.VITE_API_BASE_URL;
  const [mssInsertPosition, setMssInsertPosition] = useState("end");
  // Group and Type options - use props if provided, otherwise fetch
  const [groupOptions, setGroupOptions] = useState(propGroupOptions || []);
  const [typeOptions, setTypeOptions] = useState(propTypeOptions || []);
  const [groupLabel, setGroupLabel] = useState('');
  const [typeLabel, setTypeLabel] = useState('');

  // Update options when props change (from MasterConfig)
  useEffect(() => {
    if (isMasterConfig) {
      if (propGroupOptions && propGroupOptions.length > 0) {
        setGroupOptions(propGroupOptions);
      }
      if (propTypeOptions && propTypeOptions.length > 0) {
        setTypeOptions(propTypeOptions);
      }
    }
  }, [isMasterConfig, propGroupOptions, propTypeOptions]);

  // Only fetch if not in master config mode (props will be provided)
  useEffect(() => {
    if (!isMasterConfig) {
      fetchGroup();
      fetchType();
    }
  }, [isMasterConfig]);

  // Fetch groups
  const fetchGroup = async () => {
    try {
      const res = await axios.get(`${url}/Groups`);
      const formatted = (res.data || []).map(group => ({
        label: group.name || group.groupName,
        value: group.id || group.groupId,
      }));
      setGroupOptions(formatted);
      // Set label if selectedGroup exists
      if (selectedGroup) {
        const found = formatted.find(g => g.value === selectedGroup);
        setGroupLabel(found?.label || selectedGroup);
      }
    } catch (err) {
      console.error("Failed to fetch groups", err);
    }
  };

  // Fetch types
  const fetchType = async () => {
    try {
      const res = await axios.get(`${url}/PaperTypes`);
      const formatted = (res.data || []).map(type => ({
        label: type.types,
        value: type.typeId,
      }));
      setTypeOptions(formatted);
      // Set label if selectedType exists
      if (selectedType) {
        const found = formatted.find(t => t.value === selectedType);
        setTypeLabel(found?.label || selectedType);
      }
    } catch (err) {
      console.error("Failed to fetch paper types", err);
    }
  };

  // Update labels when selectedGroup or selectedType changes
  useEffect(() => {
    if (selectedGroup && groupOptions.length > 0) {
      const found = groupOptions.find(g => g.value === selectedGroup);
      setGroupLabel(found?.label || selectedGroup);
    }
  }, [selectedGroup, groupOptions]);

  useEffect(() => {
    if (selectedType && typeOptions.length > 0) {
      const found = typeOptions.find(t => t.value === selectedType);
      setTypeLabel(found?.label || selectedType);
    }
  }, [selectedType, typeOptions]);
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
  const [startBookletSerialNumber, setStartBookletSerialNumber] = useState(0);
  const [resetBookletSerialOnCatchChange, setResetBookletSerialOnCatchChange] =
    useState(false);
  const [selectedDuplicatefields, setSelectedDuplicatefields] = useState([]);
  const [selectedSortingField, setSelectedSortingField] = useState([]);
  const [resetOnSymbolChange, setResetOnSymbolChange] = useState(false);
  const [resetOmrSerialOnCatchChange, setResetOmrSerialOnCatchChange] =
    useState(false);
  const [isInnerBundlingDone, setIsInnerBundlingDone] = useState(false);
  const [innerBundlingCriteria, setInnerBundlingCriteria] = useState([]);
  const [duplicateConfig, setDuplicateConfig] = useState({
    duplicateCriteria: [],
    enhancement: 0,
    enhancementEnabled: false,
    enhancementType: "round",
  });
  const [importedSnapshot, setImportedSnapshot] = useState(null);
  const [showChangeModal, setShowChangeModal] = useState(false);
  const [isRerunning, setIsRerunning] = useState(false);
  const [changeData, setChangeData] = useState(null);
  const {
    toolModules,
    envelopeOptions,
    extraTypes,
    fields,
    mergedModules,
    extraTypeSelection,
    setExtraTypeSelection,
  } = useProjectConfigData(token);
  const [mss, setMss] = useState([]);
  const [selectedMss, setSelectedMss] = useState([]);


  // Change detection hook
  const { hasChanges, changedFields, resetChangeDetection } =
    useConfigChangeDetection(
      enabledModules,
      innerEnvelopes,
      outerEnvelopes,
      selectedBoxFields,
      selectedEnvelopeFields,
      extraTypeSelection,
      selectedCapacity,
      startBoxNumber,
      startOmrEnvelopeNumber,
      resetOmrSerialOnCatchChange,
      startBookletSerialNumber,
      resetBookletSerialOnCatchChange,
      selectedDuplicatefields,
      selectedSortingField,
      resetOnSymbolChange,
      isInnerBundlingDone,
      innerBundlingCriteria,
      extraProcessingConfig,
      duplicateConfig,
      selectedMss,
      mssInsertPosition
    );

  const fetchProjectConfigData = async (projectId, typeId = null, groupId = null) => {
    if (isMasterConfig && (!typeId || !groupId)) {
      console.log("Master config mode: waiting for type and group selection");
      resetForm();
      return;
    }

    console.log("Fetching config data for project:", projectId);

    let projectConfig = null;
    let extrasConfig = [];
    let duplicateConfigRes = {
      duplicateCriteria: [],
      enhancement: 0,
      enhancementEnabled: false,
    };

    // Determine endpoints based on mode
    const projectConfigEndpoint = isMasterConfig
      ? `/MProjectConfigs/ByTypeGroup/${typeId}/${groupId}`
      : `/ProjectConfigs/ByProject/${projectId}`;
    const extrasConfigEndpoint = isMasterConfig
      ? `/MExtraConfigs/ByTypeGroup/${typeId}/${groupId}`
      : `/ExtrasConfigurations/ByProject/${projectId}`;

    // Fetch project config
    try {
      const res = await API.get(projectConfigEndpoint);
      projectConfig = res.data;
      console.log("Parsed Project Config:", projectConfig);
      setConfigExists(true);

      duplicateConfigRes = {
        duplicateCriteria: Array.isArray(projectConfig.duplicateCriteria)
          ? [...projectConfig.duplicateCriteria]
          : JSON.parse(projectConfig.duplicateCriteria || "[]"),
        enhancement: Number(projectConfig.enhancement) || 0,
        enhancementEnabled: Number(projectConfig.enhancement) > 0,
      };
      setDuplicateConfig(JSON.parse(JSON.stringify(duplicateConfigRes)));
    } catch (err) {
      if (err.response?.status === 404) {
        console.warn(`No existing configuration for ${isMasterConfig ? `typeId: ${typeId}, groupId: ${groupId}` : `projectId: ${projectId}`}`);
        setConfigExists(false);
        setDuplicateConfig(duplicateConfigRes);
      } else {
        console.error(
          "Failed to load project config",
          err.response?.data || err.message,
        );
        setConfigExists(false);
        return null;
      }
    }

    // Fetch extra config data
    try {
      const extrasRes = await API.get(extrasConfigEndpoint);
      extrasConfig = extrasRes.data;
    } catch (err) {
      if (err.response?.status !== 404) {
        console.error(
          "Failed to load extras config",
          err.response?.data || err.message,
        );
      }
    }

    // Fetch box capacities
    let resolvedCapacity = null;
    try {
      const boxRes = await API.get(`/BoxCapacities`);
      const boxConfig = boxRes.data;
      setBoxCapacities(boxConfig);
      resolvedCapacity =
        projectConfig?.boxCapacity ||
        (boxConfig.length > 0 ? boxConfig[0].id : null);
      setSelectedCapacity(resolvedCapacity);
    } catch (err) {
      console.error(
        "Failed to load box capacities",
        err.response?.data || err.message,
      );
    }

    let fetchedMss = [];
    try {
      const typeToUse = typeId || selectedType || localStorage.getItem("selectedType");
      if (typeToUse) {
        const response = await API.get(`Projects/GetMssByType?typeId=${typeToUse}`);
        fetchedMss = response.data;
        setMss(fetchedMss);
      }
    } catch (err) {
      console.error(
        "Failed to get MSS",
        err.response?.data || err.message,
      );
    }

    // Build values locally (don't rely on state — state is async)
    let parsedValues = {
      enabledModules: [],
      innerEnvelopes: [],
      outerEnvelopes: [],
      selectedEnvelopeFields: [],
      startOmrEnvelopeNumber: 0,
      resetOmrSerialOnCatchChange: false,
      startBookletSerialNumber: 0,
      resetBookletSerialOnCatchChange: false,
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
      selectedMss: fetchedMss.map(m => m.id),
      mssInsertPosition: "end",
    };

    if (projectConfig && toolModules.length > 0) {
      const enabledNames = new Set();
      const extraModuleNames = [
        "Nodal Extra Calculation",
        "University Extra Calculation",
      ];
      projectConfig.modules?.forEach((moduleId) => {
        const module = toolModules.find((m) => m.id === moduleId);
        if (module) {
          if (extraModuleNames.includes(module.name))
            enabledNames.add("Extra Configuration");
          else enabledNames.add(module.name);
        }
      });

      const envelopeParsed = JSON.parse(projectConfig.envelope || "{}");
      const parsedInnerEnvelopes = envelopeParsed.Inner
        ? [envelopeParsed.Inner]
        : [];
      const parsedOuterEnvelopes = envelopeParsed.Outer
        ? [envelopeParsed.Outer]
        : [];
      const parsedBoxFields = (projectConfig.boxBreakingCriteria || [])
        .filter((fieldId) => fields.some((f) => f.fieldId === fieldId))
        .map((fieldId) => fieldId);
      const parsedEnvelopeFields = (
        projectConfig.envelopeMakingCriteria || []
      ).filter((fieldId) => fields.some((f) => f.fieldId === fieldId));
      const parsedDuplicateFields = (
        projectConfig.duplicateRemoveFields || []
      ).filter((fieldId) => fields.some((f) => f.fieldId === fieldId));
      const parsedSortingFields = (projectConfig.sortingBoxReport || []).filter(
        (fieldId) => fields.some((f) => f.fieldId === fieldId),
      );
      const parsedInnerBundlingCriteria = (
        projectConfig.innerBundlingCriteria || []
      ).filter((fieldId) => fields.some((f) => f.fieldId === fieldId));

      parsedValues = {
        ...parsedValues,
        enabledModules: Array.from(enabledNames),
        innerEnvelopes: parsedInnerEnvelopes,
        outerEnvelopes: parsedOuterEnvelopes,
        selectedEnvelopeFields: parsedEnvelopeFields,
        startOmrEnvelopeNumber: projectConfig.omrSerialNumber || 0,
        resetOmrSerialOnCatchChange:
          projectConfig.resetOmrSerialOnCatchChange ?? false,
        startBookletSerialNumber: projectConfig.bookletSerialNumber || 0,
        resetBookletSerialOnCatchChange:
          projectConfig.resetBookletSerialOnCatchChange ?? false,
        selectedBoxFields: parsedBoxFields,
        startBoxNumber: projectConfig.boxNumber || 0,
        selectedDuplicatefields: parsedDuplicateFields,
        selectedSortingField: parsedSortingFields,
        resetOnSymbolChange: projectConfig.resetOnSymbolChange ?? false,
        isInnerBundlingDone: projectConfig.isInnerBundlingDone ?? false,
        innerBundlingCriteria: parsedInnerBundlingCriteria,
        selectedMss: projectConfig.mssTypes ?? fetchedMss.map(m => m.id),
        mssInsertPosition: projectConfig.mssAttached || "end",
      };

      setEnabledModules([...parsedValues.enabledModules]);
      setInnerEnvelopes([...parsedValues.innerEnvelopes]);
      setOuterEnvelopes([...parsedValues.outerEnvelopes]);
      setSelectedEnvelopeFields([...parsedValues.selectedEnvelopeFields]);
      setStartOmrEnvelopeNumber(parsedValues.startOmrEnvelopeNumber);
      setResetOmrSerialOnCatchChange(parsedValues.resetOmrSerialOnCatchChange);
      setStartBookletSerialNumber(parsedValues.startBookletSerialNumber);
      setResetBookletSerialOnCatchChange(
        parsedValues.resetBookletSerialOnCatchChange,
      );
      setSelectedBoxFields([...parsedValues.selectedBoxFields]);
      setStartBoxNumber(parsedValues.startBoxNumber);
      setBoxBreakingCriteria([
        "capacity",
        ...(projectConfig.boxBreakingCriteria || []),
      ]);
      setSelectedDuplicatefields([...parsedValues.selectedDuplicatefields]);
      setSelectedSortingField([...parsedValues.selectedSortingField]);
      setResetOnSymbolChange(parsedValues.resetOnSymbolChange);
      setIsInnerBundlingDone(parsedValues.isInnerBundlingDone);
      setInnerBundlingCriteria([...parsedValues.innerBundlingCriteria]);
      setSelectedMss([...parsedValues.selectedMss]);
      setMssInsertPosition(parsedValues.mssInsertPosition);
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
      setResetOmrSerialOnCatchChange(false);
      setStartOmrEnvelopeNumber(0);
      setResetBookletSerialOnCatchChange(false);
      setStartBookletSerialNumber(0);
      setIsInnerBundlingDone(false);
      setInnerBundlingCriteria([]);
      setSelectedMss(fetchedMss.map(m => m.id));
      setMssInsertPosition("end");
    }

    // Process Extra Configurations
    const extraProcessingParsed = {};
    const extraSelections = {};
    extrasConfig.forEach((item) => {
      const type = extraTypes.find(
        (e) => e.extraTypeId === item.extraType,
      )?.type;
      if (!type) return;
      const env = item.envelopeType
        ? JSON.parse(item.envelopeType)
        : { Inner: "", Outer: "" };

      let config = {
        envelopeType: {
          inner: env.Inner ? [env.Inner] : [],
          outer: env.Outer ? [env.Outer] : [],
        },
        fixedQty: item.mode === "Fixed" ? parseFloat(item.value) : 0,
        percentage: item.mode === "Percentage" ? parseFloat(item.value) : 0,
      };

      // Handle Range mode with RangeConfig
      if (item.mode === "Range" && item.rangeConfig) {
        try {
          const rangeData = JSON.parse(item.rangeConfig);
          config.range = rangeData.ranges || [];
          config.rangeType = rangeData.rangeType || "Fixed";
        } catch (e) {
          config.range = [];
          config.rangeType = "Fixed";
        }
      } else {
        config.range = [];
        config.rangeType = "Fixed";
      }

      extraProcessingParsed[type] = config;
      extraSelections[type] = item.mode;
    });

    parsedValues.extraProcessingConfig = JSON.parse(
      JSON.stringify(extraProcessingParsed),
    );
    parsedValues.extraTypeSelection = JSON.parse(
      JSON.stringify(extraSelections),
    );
    setExtraProcessingConfig(JSON.parse(JSON.stringify(extraProcessingParsed)));
    setExtraTypeSelection(JSON.parse(JSON.stringify(extraSelections)));
    setImportedSnapshot(parsedValues);

    return parsedValues;
  };

  const handleImport = async (importData) => {
    let parsed = null;

    if (importData.projectId) {
      parsed = await fetchProjectConfigData(importData.projectId);
    } else if (importData.typeId && importData.groupId) {
      // Temporarily bypass the isMasterConfig check inside fetchProjectConfigData
      // and call the endpoints directly to get the imported snapshot
      const fetchGroupTypeConfigParams = async (typeId, groupId) => {
        let projectConfig = null;
        let extrasConfig = [];
        let duplicateConfigRes = {
          duplicateCriteria: [],
          enhancement: 0,
          enhancementEnabled: false,
        };

        try {
          const res = await API.get(`/MProjectConfigs/ByTypeGroup/${typeId}/${groupId}`);
          projectConfig = res.data;

          duplicateConfigRes = {
            duplicateCriteria: Array.isArray(projectConfig.duplicateCriteria)
              ? [...projectConfig.duplicateCriteria]
              : JSON.parse(projectConfig.duplicateCriteria || "[]"),
            enhancement: Number(projectConfig.enhancement) || 0,
            enhancementEnabled: Number(projectConfig.enhancement) > 0,
          };
          setDuplicateConfig(JSON.parse(JSON.stringify(duplicateConfigRes)));
        } catch (err) {
          if (err.response?.status === 404) {
            message.warning("No Master Configuration found for this Group and Type");
          } else {
            message.error("Error fetching Master Configuration");
          }
          return null;
        }

        try {
          const extrasRes = await API.get(`/MExtraConfigs/ByTypeGroup/${typeId}/${groupId}`);
          extrasConfig = extrasRes.data;
        } catch (err) {
          console.warn("Failed to load Master extras config");
        }

        // Use existing fetch flow structure to build `parsedValues`
        // We inject the temporarily fetched data

        // This is a cleaner approach: just override the parameters
        const originalIsMasterConfig = isMasterConfig;

        let parsedValues = {
          enabledModules: [],
          innerEnvelopes: [],
          outerEnvelopes: [],
          selectedEnvelopeFields: [],
          startOmrEnvelopeNumber: 0,
          resetOmrSerialOnCatchChange: false,
          startBookletSerialNumber: 0,
          resetBookletSerialOnCatchChange: false,
          selectedBoxFields: [],
          selectedCapacity: selectedCapacity,
          startBoxNumber: 0,
          selectedDuplicatefields: [],
          selectedSortingField: [],
          resetOnSymbolChange: false,
          isInnerBundlingDone: false,
          innerBundlingCriteria: [],
          duplicateConfig: duplicateConfigRes,
          extraProcessingConfig: {},
          extraTypeSelection: {},
          selectedMss: mss.map(m => m.id),
          mssInsertPosition: "end",
        };

        if (projectConfig && toolModules.length > 0) {
          const enabledNames = new Set();
          const extraModuleNames = [
            "Nodal Extra Calculation",
            "University Extra Calculation",
          ];
          projectConfig.modules?.forEach((moduleId) => {
            const module = toolModules.find((m) => m.id === moduleId);
            if (module) {
              if (extraModuleNames.includes(module.name))
                enabledNames.add("Extra Configuration");
              else enabledNames.add(module.name);
            }
          });

          const envelopeParsed = JSON.parse(projectConfig.envelope || "{}");
          const parsedInnerEnvelopes = envelopeParsed.Inner
            ? [envelopeParsed.Inner]
            : [];
          const parsedOuterEnvelopes = envelopeParsed.Outer
            ? [envelopeParsed.Outer]
            : [];
          const parsedBoxFields = (projectConfig.boxBreakingCriteria || [])
            .filter((fieldId) => fields.some((f) => f.fieldId === fieldId))
            .map((fieldId) => fieldId);
          const parsedEnvelopeFields = (
            projectConfig.envelopeMakingCriteria || []
          ).filter((fieldId) => fields.some((f) => f.fieldId === fieldId));
          const parsedDuplicateFields = (
            projectConfig.duplicateRemoveFields || []
          ).filter((fieldId) => fields.some((f) => f.fieldId === fieldId));
          const parsedSortingFields = (projectConfig.sortingBoxReport || []).filter(
            (fieldId) => fields.some((f) => f.fieldId === fieldId),
          );
          const parsedInnerBundlingCriteria = (
            projectConfig.innerBundlingCriteria || []
          ).filter((fieldId) => fields.some((f) => f.fieldId === fieldId));

          parsedValues = {
            ...parsedValues,
            enabledModules: Array.from(enabledNames),
            innerEnvelopes: parsedInnerEnvelopes,
            outerEnvelopes: parsedOuterEnvelopes,
            selectedEnvelopeFields: parsedEnvelopeFields,
            startOmrEnvelopeNumber: projectConfig.omrSerialNumber || 0,
            resetOmrSerialOnCatchChange:
              projectConfig.resetOmrSerialOnCatchChange ?? false,
            startBookletSerialNumber: projectConfig.bookletSerialNumber || 0,
            resetBookletSerialOnCatchChange:
              projectConfig.resetBookletSerialOnCatchChange ?? false,
            selectedBoxFields: parsedBoxFields,
            startBoxNumber: projectConfig.boxNumber || 0,
            selectedDuplicatefields: parsedDuplicateFields,
            selectedSortingField: parsedSortingFields,
            resetOnSymbolChange: projectConfig.resetOnSymbolChange ?? false,
            isInnerBundlingDone: projectConfig.isInnerBundlingDone ?? false,
            innerBundlingCriteria: parsedInnerBundlingCriteria,
            selectedMss: projectConfig.mssTypes ?? mss.map(m => m.id),
            mssInsertPosition: projectConfig.mssAttached || "end",
          };

          setEnabledModules([...parsedValues.enabledModules]);
          setInnerEnvelopes([...parsedValues.innerEnvelopes]);
          setOuterEnvelopes([...parsedValues.outerEnvelopes]);
          setSelectedEnvelopeFields([...parsedValues.selectedEnvelopeFields]);
          setStartOmrEnvelopeNumber(parsedValues.startOmrEnvelopeNumber);
          setResetOmrSerialOnCatchChange(parsedValues.resetOmrSerialOnCatchChange);
          setStartBookletSerialNumber(parsedValues.startBookletSerialNumber);
          setResetBookletSerialOnCatchChange(
            parsedValues.resetBookletSerialOnCatchChange,
          );
          setSelectedBoxFields([...parsedValues.selectedBoxFields]);
          setStartBoxNumber(parsedValues.startBoxNumber);
          setBoxBreakingCriteria([
            "capacity",
            ...(projectConfig.boxBreakingCriteria || []),
          ]);
          setSelectedDuplicatefields([...parsedValues.selectedDuplicatefields]);
          setSelectedSortingField([...parsedValues.selectedSortingField]);
          setResetOnSymbolChange(parsedValues.resetOnSymbolChange);
          setIsInnerBundlingDone(parsedValues.isInnerBundlingDone);
          setInnerBundlingCriteria([...parsedValues.innerBundlingCriteria]);
          setSelectedMss([...parsedValues.selectedMss]);
          setMssInsertPosition(parsedValues.mssInsertPosition);
        }

        // Process Extra Configurations
        const extraProcessingParsed = {};
        const extraSelections = {};
        extrasConfig.forEach((item) => {
          const type = extraTypes.find(
            (e) => e.extraTypeId === item.extraType,
          )?.type;
          if (!type) return;
          const env = item.envelopeType
            ? JSON.parse(item.envelopeType)
            : { Inner: "", Outer: "" };

          let config = {
            envelopeType: {
              inner: env.Inner ? [env.Inner] : [],
              outer: env.Outer ? [env.Outer] : [],
            },
            fixedQty: item.mode === "Fixed" ? parseFloat(item.value) : 0,
            percentage: item.mode === "Percentage" ? parseFloat(item.value) : 0,
          };

          // Handle Range mode with RangeConfig
          if (item.mode === "Range" && item.rangeConfig) {
            try {
              const rangeData = JSON.parse(item.rangeConfig);
              config.range = rangeData.ranges || [];
              config.rangeType = rangeData.rangeType || "Fixed";
            } catch (e) {
              config.range = [];
              config.rangeType = "Fixed";
            }
          } else {
            config.range = [];
            config.rangeType = "Fixed";
          }

          extraProcessingParsed[type] = config;
          extraSelections[type] = item.mode;
        });

        parsedValues.extraProcessingConfig = JSON.parse(
          JSON.stringify(extraProcessingParsed),
        );
        parsedValues.extraTypeSelection = JSON.parse(
          JSON.stringify(extraSelections),
        );
        setExtraProcessingConfig(JSON.parse(JSON.stringify(extraProcessingParsed)));
        setExtraTypeSelection(JSON.parse(JSON.stringify(extraSelections)));

        return parsedValues;
      };

      parsed = await fetchGroupTypeConfigParams(importData.typeId, importData.groupId);
    }

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
    setExtraProcessingConfig({});
    setBoxCapacities([]);
    setStartBoxNumber(0);
    setStartOmrEnvelopeNumber(0);
    setResetOmrSerialOnCatchChange(false);
    setStartBookletSerialNumber(0);
    setResetBookletSerialOnCatchChange(false);
    setSelectedCapacity(null);
    setSelectedDuplicatefields([]);
    setSelectedSortingField([]);
    setResetOnSymbolChange(false);
    setIsInnerBundlingDone(false);
    setInnerBundlingCriteria([]);
    setDuplicateConfig({
      duplicateCriteria: [],
      enhancement: 0,
      enhancementEnabled: false,
      enhancementType: "round",
    });
    setSelectedMss(mss.map(m => m.id));
    setMssInsertPosition("end");
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
    resetOmrSerialOnCatchChange,
    startBookletSerialNumber,
    resetBookletSerialOnCatchChange,
    selectedDuplicatefields,
    selectedSortingField,
    resetOnSymbolChange,
    isInnerBundlingDone,
    innerBundlingCriteria,
    extraProcessingConfig,
    duplicateConfig,
    selectedMss,
    mssInsertPosition,
    fetchProjectConfigData,
    showToast,
    resetForm,
    (saveData) => {
      // Callback when config is successfully saved
      console.log("ConfigChangeModal callback triggered with saveData:", saveData);
      if (saveData && saveData.affectedReports && saveData.affectedReports.length > 0) {
        console.log("Setting change data and showing modal");
        if (
          saveData &&
          saveData.affectedReports &&
          saveData.affectedReports.length > 0
        ) {
          setChangeData(saveData);
          setShowChangeModal(true);
        } else {
          console.log("No affected reports or saveData is empty");
        }
      }
    },
    isMasterConfig,
    selectedType,
    selectedGroup
  );
  console.log(selectedCapacity);
  console.log("Type of selectedCapacity:", typeof selectedCapacity);

  // Helper function
  const isEnabled = (toolName) => enabledModules.includes(toolName);

  // Per-module reset handlers — reverts to snapshot if import was done, else clears
  const resetEnvelopeSetup = () => {
    if (importedSnapshot && importedSnapshot !== "pending") {
      setInnerEnvelopes([...importedSnapshot.innerEnvelopes]);
      setOuterEnvelopes([...importedSnapshot.outerEnvelopes]);
    } else {
      setInnerEnvelopes([]);
      setOuterEnvelopes([]);
    }
  };

  const resetEnvelopeMakingCriteria = () => {
    if (importedSnapshot && importedSnapshot !== "pending") {
      setSelectedEnvelopeFields([...importedSnapshot.selectedEnvelopeFields]);
      setStartOmrEnvelopeNumber(importedSnapshot.startOmrEnvelopeNumber);
      setResetOmrSerialOnCatchChange(
        importedSnapshot.resetOmrSerialOnCatchChange,
      );
      setStartBookletSerialNumber(importedSnapshot.startBookletSerialNumber);
      setResetBookletSerialOnCatchChange(
        importedSnapshot.resetBookletSerialOnCatchChange,
      );
      setSelectedMss([...(importedSnapshot.selectedMss || [])]);
      setMssInsertPosition(importedSnapshot.mssInsertPosition || "end");
    } else {
      setSelectedEnvelopeFields([]);
      setStartOmrEnvelopeNumber(0);
      setResetOmrSerialOnCatchChange(false);
      setStartBookletSerialNumber(0);
      setResetBookletSerialOnCatchChange(false);
      setSelectedMss(mss.map(m => m.id));
      setMssInsertPosition("end");
    }
  };

  const resetBoxBreaking = () => {
    if (importedSnapshot && importedSnapshot !== "pending") {
      setSelectedBoxFields([...importedSnapshot.selectedBoxFields]);
      setSelectedCapacity(importedSnapshot.selectedCapacity);
      setStartBoxNumber(importedSnapshot.startBoxNumber);
      setSelectedDuplicatefields([...importedSnapshot.selectedDuplicatefields]);
      setSelectedSortingField([...importedSnapshot.selectedSortingField]);
      setResetOnSymbolChange(importedSnapshot.resetOnSymbolChange);
      setIsInnerBundlingDone(importedSnapshot.isInnerBundlingDone);
      setInnerBundlingCriteria([...importedSnapshot.innerBundlingCriteria]);
      setBoxBreakingCriteria([
        "capacity",
        ...importedSnapshot.selectedBoxFields,
      ]);
    } else {
      setSelectedBoxFields([]);
      setBoxBreakingCriteria(["capacity"]);
      setSelectedCapacity(
        boxCapacities.length > 0 ? boxCapacities[0].id : null,
      );
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
      setExtraProcessingConfig(
        JSON.parse(JSON.stringify(importedSnapshot.extraProcessingConfig)),
      );
      setExtraTypeSelection(
        JSON.parse(JSON.stringify(importedSnapshot.extraTypeSelection)),
      );
    } else {
      setExtraProcessingConfig({});
      setExtraTypeSelection({});
    }
  };

  const resetDuplicateTool = () => {
    if (importedSnapshot && importedSnapshot !== "pending") {
      setDuplicateConfig(
        JSON.parse(JSON.stringify(importedSnapshot.duplicateConfig)),
      );
    } else {
      setDuplicateConfig({
        duplicateCriteria: [],
        enhancement: 0,
        enhancementEnabled: false,
        enhancementType: "round",
      });
    }
  };

  // Configuration status
  const envelopeConfigured =
    isEnabled("Envelope Setup and Enhancement");
  const boxConfigured = isEnabled("Box Breaking");
  const extraConfigured = isEnabled(EXTRA_ALIAS_NAME);
  const duplicateConfigured = isEnabled("Duplicate Tool");

  useEffect(() => {
    if (isMasterConfig) {
      // In master config mode, fetch when type and group are selected
      if (selectedType && selectedGroup) {
        fetchProjectConfigData(null, selectedType, selectedGroup);
      }
    } else {
      // In project config mode, fetch when projectId is available
      if (!projectId) return;
      fetchProjectConfigData(projectId);
    }
  }, [isMasterConfig, projectId, selectedType, selectedGroup, token, extraTypes, fields, showToast, toolModules]);

  // Fetch box capacities independently
  useEffect(() => {
    const fetchBoxCapacitiesData = async () => {
      try {
        const boxRes = await API.get(`/BoxCapacities`);
        setBoxCapacities(boxRes.data);
      } catch (err) {
        console.error("Failed to load box capacities", err);
      }
    };
    fetchBoxCapacitiesData();
  }, []);

  // Once state settles after import, finalize the snapshot
  useEffect(() => {
    if (importedSnapshot !== "pending") return;
    setImportedSnapshot({
      enabledModules: [...enabledModules],
      innerEnvelopes: [...innerEnvelopes],
      outerEnvelopes: [...outerEnvelopes],
      selectedEnvelopeFields: [...selectedEnvelopeFields],
      startOmrEnvelopeNumber,
      resetOmrSerialOnCatchChange,
      startBookletSerialNumber,
      resetBookletSerialOnCatchChange,
      selectedBoxFields: [...selectedBoxFields],
      selectedCapacity,
      startBoxNumber,
      selectedDuplicatefields: [...selectedDuplicatefields],
      selectedSortingField: [...selectedSortingField],
      resetOnSymbolChange,
      isInnerBundlingDone,
      innerBundlingCriteria: [...innerBundlingCriteria],
      duplicateConfig: JSON.parse(JSON.stringify(duplicateConfig)),
      extraProcessingConfig: JSON.parse(JSON.stringify(extraProcessingConfig)),
      extraTypeSelection: JSON.parse(JSON.stringify(extraTypeSelection)),
      selectedMss: [...selectedMss],
      mssInsertPosition,
    });
  }, [importedSnapshot]);

  useEffect(() => {
    console.log("Box Capacities Updated:", boxCapacities);
  }, [boxCapacities]);

  const handleConfirmRerun = async () => {
    setIsRerunning(true);
    try {
      // Map affected report keys to module IDs
      const moduleIds = [];
      const reportToModuleNameMap = {
        duplicate: "duplicate tool",
        extra: "extra configuration",
        envelope: "envelope breaking",
        box: "box breaking",
        envelopeSummary: "envelope summary",
        catchSummary: "catch summary report",
        catchOmrSerialing: "catchomrserialingreport",
      };

      if (changeData && changeData.affectedReports && toolModules) {
        changeData.affectedReports.forEach((reportKey) => {
          const targetModuleName = reportToModuleNameMap[reportKey] || reportKey;
          const module = toolModules.find(
            (m) => m.name.toLowerCase().includes(targetModuleName.toLowerCase())
          );
          if (module && module.id) {
            moduleIds.push(Number(module.id));
          }
        });
      }

      // Send the POST API call if we have module IDs
      if (moduleIds.length > 0) {
        console.log("Sending rerun API call for moduleIds:", moduleIds);
        await API.post("/ProjectConfigs/DeleteModuleReports", {
          projectId: Number(projectId),
          moduleIds: moduleIds,
        });
      }

      setShowChangeModal(false);

      // Store the affected reports in sessionStorage for ProcessingPipeline to pick up
      if (changeData) {
        sessionStorage.setItem(
          "configChangeData",
          JSON.stringify({
            projectId,
            affectedReports: changeData.affectedReports,
            changedModules: changeData.changedModules,
            changes: changeData.changes,
          }),
        );
      }

      // Navigate to ProcessingPipeline
      navigate("/ProcessingPipeline");
      message.success("Reports re-generation initiated successfully");
    } catch (err) {
      console.error("Error during rerun:", err);
      message.error(err.response?.data?.message || "Failed to initiate report re-run");
    } finally {
      setIsRerunning(false);
    }
  };

  const handleCancelModal = () => {
    setShowChangeModal(false);
  };

  const effectiveTypeId = selectedType ?? localStorage.getItem("selectedType");

  return (
    <div style={{ padding: 16 }}>

      <ConfigChangeModal
        visible={showChangeModal}
        changedFields={changeData?.changedModules || []}
        affectedReports={changeData?.affectedReports || []}
        onConfirm={handleConfirmRerun}
        onCancel={handleCancelModal}
        loading={isRerunning}
      />

      {/* === PAGE HEADER WITH TYPE/GROUP SELECTION (Master Config Mode) === */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', gap: 16 }}>
        <Typography.Title level={3} style={{ margin: 0, minWidth: 'fit-content' }}>
          {isMasterConfig ? 'Master Configuration' : 'Project Configuration'}</Typography.Title>

        {isMasterConfig && (
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', flex: 1, maxWidth: 500 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <Select
                placeholder="Select Group"
                value={selectedGroup}
                onChange={onGroupChange}
                options={groupOptions}
                style={{ width: '100%' }}
                size="large"
                allowClear
                clearIcon={<span style={{ fontSize: 12 }}>✕</span>}
              />
              {!selectedGroup && (
                <Typography.Text type="danger" style={{ fontSize: 11, display: 'block', marginTop: 2 }}>
                  Please select a group
                </Typography.Text>
              )}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <Select
                placeholder="Select Type"
                value={selectedType}
                onChange={onTypeChange}
                options={typeOptions}
                style={{ width: '100%' }}
                size="large"
                allowClear
                clearIcon={<span style={{ fontSize: 12 }}>✕</span>}
              />
              {!selectedType && (
                <Typography.Text type="danger" style={{ fontSize: 11, display: 'block', marginTop: 2 }}>
                  Please select a type
                </Typography.Text>
              )}
            </div>
          </div>
        )}

        {!isMasterConfig && <ImportConfig onImport={handleImport} disabled={configExists} />}
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
            duplicateConfig={duplicateConfig}
            setDuplicateConfig={setDuplicateConfig}
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
            resetOmrSerialOnCatchChange={resetOmrSerialOnCatchChange}
            setResetOmrSerialOnCatchChange={setResetOmrSerialOnCatchChange}
            startBookletSerialNumber={startBookletSerialNumber}
            setStartBookletSerialNumber={setStartBookletSerialNumber}
            resetBookletSerialOnCatchChange={resetBookletSerialOnCatchChange}
            setResetBookletSerialOnCatchChange={
              setResetBookletSerialOnCatchChange
            }
            onReset={resetEnvelopeMakingCriteria}
            importedSnapshot={importedSnapshot}
            typeId={effectiveTypeId}
            mssList={mss}
            selectedMss={selectedMss}
            setSelectedMss={setSelectedMss}
            mssInsertPosition={mssInsertPosition}
            setMssInsertPosition={setMssInsertPosition}
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
            isMasterConfig={isMasterConfig}
            selectedType={selectedType}
            selectedGroup={selectedGroup}
          />
        </Col>
      </Row>
    </div>
  );
};

export default ProjectConfiguration;
