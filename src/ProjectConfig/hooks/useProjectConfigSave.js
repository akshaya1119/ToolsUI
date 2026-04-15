import API from "../../hooks/api";
import { compareConfigurations, getReportDependencies } from "./useConfigComparison";
import { EXTRA_ALIAS_NAME, NODAL_MODULE, UNIVERSITY_MODULE } from "../components/constants";

export const useProjectConfigSave = (
  projectId,
  enabledModules,
  setEnabledModules,
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
  onConfigSaved = null,
  isMasterConfig = false,
  typeId = null,
  groupId = null
) => {
  const handleSave = async (overrideIsMasterConfig = false, overrideTypeId = null, overrideGroupId = null, skipChangeDetection = false) => {
    let existingConfig = null;
    const finalIsMasterConfig = overrideIsMasterConfig || isMasterConfig;
    const finalTypeId = overrideTypeId || typeId;
    const finalGroupId = overrideGroupId || groupId;

    try {
      const res = await API.get(`/ProjectConfigs/ByProject/${projectId}`);
      existingConfig = res.data;
    } catch (err) {
      if (err.response?.status !== 404) {
        console.warn("Could not fetch existing config for comparison");
      }
    }
    try {
      // Validation for master config mode
      if (finalIsMasterConfig && (!finalTypeId || !finalGroupId)) {
        showToast("Please select Type and Group first", "error");
        return;
      }

      // Validation for project config mode
      if (!finalIsMasterConfig && !projectId) {
        showToast("Project ID is required", "error");
        return;
      }

      console.log(finalGroupId)
      // Determine which endpoint to use
      const projectConfigEndpoint = finalIsMasterConfig ? '/MProjectConfigs' : '/ProjectConfigs';
      const extraConfigEndpoint = finalIsMasterConfig ? '/MExtraConfigs' : '/ExtrasConfigurations';

      // 0️⃣ Validation & Auto-uncheck for Extra Configuration
      let finalEnabledModules = [...enabledModules];
      if (enabledModules.includes(EXTRA_ALIAS_NAME)) {
        // Check if anything is actually configured in the extras processing
        const hasConfigurations = Object.entries(extraTypeSelection).some(([typeName, mode]) => {
          const config = extraProcessingConfig[typeName] || {};
          const normalizedEnvelope = {
            Inner: Array.isArray(config.envelopeType?.inner) ? config.envelopeType.inner[0] || "" : config.envelopeType?.inner || "",
            Outer: Array.isArray(config.envelopeType?.outer) ? config.envelopeType.outer[0] || "" : config.envelopeType?.outer || "",
          };
          const hasEnvelope = normalizedEnvelope.Inner || normalizedEnvelope.Outer;
          
          let hasValue = false;
          if (mode === "Fixed") hasValue = Number(config.fixedQty || 0) > 0;
          else if (mode === "Percentage") hasValue = Number(config.percentage || 0) > 0;
          else if (mode === "Range") hasValue = Array.isArray(config.range) && config.range.length > 0;
          
          return hasEnvelope || hasValue;
        });

        if (!hasConfigurations) {
          finalEnabledModules = finalEnabledModules.filter(m => m !== EXTRA_ALIAS_NAME);
          setEnabledModules(finalEnabledModules);
          showToast(`${EXTRA_ALIAS_NAME} was not configured, so it has been unchecked.`, "warning");
        }
      }

      // 1️⃣ Save ProjectConfigs including Duplicate Tool
      const projectConfigPayload = {
        ...(finalIsMasterConfig ? { typeId: Number(finalTypeId), groupId: Number(finalGroupId) } : { projectId: Number(projectId) }),
        modules: finalEnabledModules.flatMap((m) => {
          if (m === EXTRA_ALIAS_NAME) {
            // Expand alias into actual module IDs
            return toolModules
              .filter((tm) => tm.name === NODAL_MODULE || tm.name === UNIVERSITY_MODULE)
              .map((tm) => tm.id);
          }
          const mod = toolModules.find((tm) => tm.name === m);
          return mod ? [mod.id] : [];
        }),
        envelope: JSON.stringify({
          Inner: innerEnvelopes.join(","),
          Outer: outerEnvelopes.join(","),
        }),
        boxBreakingCriteria: selectedBoxFields,
        duplicateRemoveFields: selectedDuplicatefields,
        boxNumber: startBoxNumber,
        omrSerialNumber: startOmrEnvelopeNumber,
        resetOmrSerialOnCatchChange: resetOmrSerialOnCatchChange,
        bookletSerialNumber: startBookletSerialNumber,
        resetBookletSerialOnCatchChange: resetBookletSerialOnCatchChange,
        envelopeMakingCriteria: selectedEnvelopeFields,
        boxCapacity: selectedCapacity,
        sortingBoxReport: selectedSortingField,
        resetOnSymbolChange: resetOnSymbolChange,
        isInnerBundlingDone: isInnerBundlingDone,
        innerBundlingCriteria: innerBundlingCriteria,
        duplicateCriteria: duplicateConfig?.duplicateCriteria || [],
        enhancement: duplicateConfig?.enhancement || 0,
        mssTypes: selectedMss || [],
        mssAttached: mssInsertPosition || "end",
      };

      await API.post(projectConfigEndpoint, projectConfigPayload);

      // Prepare extras config for comparison — normalize it to match API structure
      const newExtrasConfig = {};
      Object.entries(extraTypeSelection).forEach(([typeName, mode]) => {
        const et = extraTypes.find((t) => t.type === typeName);
        if (!et) return;
        
        const config = extraProcessingConfig[typeName] || {};
        const normalizedEnvelope = {
          Inner: Array.isArray(config.envelopeType?.inner)
            ? config.envelopeType.inner[0] || ""
            : config.envelopeType?.inner || "",
          Outer: Array.isArray(config.envelopeType?.outer)
            ? config.envelopeType.outer[0] || ""
            : config.envelopeType?.outer || "",
        };

        const item = {
          mode,
          value: "",
          envelopeType: normalizedEnvelope,
          rangeConfig: null,
        };

        if (mode === "Fixed") {
          item.value = String(Number(config.fixedQty || 0));
        } else if (mode === "Percentage") {
          item.value = String(Number(config.percentage || 0));
        } else if (mode === "Range") {
          const rangesWithFrom = (config.range || []).map((r, idx) => {
            const from = idx === 0 ? 0 : (config.range[idx - 1]?.to ?? 0) + 1;
            return { from, to: r.to, value: r.value };
          });
          item.rangeConfig = {
            rangeType: config.rangeType || "Fixed",
            ranges: rangesWithFrom,
          };
        }

        newExtrasConfig[typeName] = item;
      });

      // Get existing extras config for comparison
      let existingExtrasConfig = null;
      if (existingConfig) {
        try {
          const extrasConfigEndpoint = isMasterConfig 
            ? `/MExtraConfigs/ByTypeGroup/${typeId}/${groupId}` 
            : `/ExtrasConfigurations/ByProject/${projectId}`;
          const extrasRes = await API.get(extrasConfigEndpoint);
          const extrasData = extrasRes.data || [];
          
          existingExtrasConfig = {};
          extrasData.forEach((item) => {
            const etFound = extraTypes.find((e) => e.extraTypeId === item.extraType);
            const type = etFound?.type;
            if (type) {
              existingExtrasConfig[type] = {
                mode: item.mode,
                value: item.value ? String(item.value) : "",
                envelopeType: item.envelopeType ? JSON.parse(item.envelopeType) : { Inner: "", Outer: "" },
                rangeConfig: item.rangeConfig ? JSON.parse(item.rangeConfig) : null,
              };
            }
          });
        } catch (err) {
          console.log("No existing extras config to compare");
        }
      }

      // Compare configurations to identify changes
      const changes = compareConfigurations(existingConfig, projectConfigPayload, finalEnabledModules, existingExtrasConfig, newExtrasConfig);
      const affectedReportsWithDeps = getReportDependencies(changes.affectedReports, finalEnabledModules, toolModules);

      console.log("Existing Config:", existingConfig);
      console.log("New Config Payload:", projectConfigPayload);
      console.log("Configuration Changes:", changes);
      console.log("Affected Reports with Dependencies:", affectedReportsWithDeps);

      // 2️⃣ Delete existing ExtrasConfigurations first (only for non-master mode)
      if (!finalIsMasterConfig) {
        try {
          await API.delete(`/ExtrasConfigurations/${projectId}`);
        } catch (err) {
          // Ignore if no existing configs
          console.log("No existing extras config to delete");
        }
      }

      // 3️⃣ Save ExtrasConfigurations
      const extrasPayloads = Object.entries(extraTypeSelection)
        .map(([typeName, mode]) => {
          const et = extraTypes.find((t) => t.type === typeName);
          if (!et) return null;

          const config = extraProcessingConfig[typeName] || {};

          const normalizedEnvelope = {
            Inner: Array.isArray(config.envelopeType?.inner)
              ? config.envelopeType.inner[0] || ""
              : config.envelopeType?.inner || "",
            Outer: Array.isArray(config.envelopeType?.outer)
              ? config.envelopeType.outer[0] || ""
              : config.envelopeType?.outer || "",
          };
          const fixed = Number(config.fixedQty || 0);
          const percentage = Number(config.percentage || 0);

          // Check if anything is configured based on mode
          let hasValue = false;
          if (mode === "Fixed") {
            hasValue = fixed > 0;
          } else if (mode === "Range") {
            hasValue = Array.isArray(config.range) && config.range.length > 0;
          } else if (mode === "Percentage") {
            hasValue = percentage > 0;
          }

          const hasEnvelope = normalizedEnvelope.Inner || normalizedEnvelope.Outer;

          // Skip if nothing configured
          if (!hasValue && !hasEnvelope) return null;

          const payload = {
            id: 0,
            ...(finalIsMasterConfig ? { typeId: Number(finalTypeId), groupId: Number(finalGroupId) } : { projectId: Number(projectId) }),
            extraType: et.extraTypeId,
            mode,
            envelopeType: JSON.stringify(normalizedEnvelope),
          };

          // Add value based on mode
          if (mode === "Fixed") {
            payload.value = String(fixed);
          } else if (mode === "Range") {
            payload.value = ""; // Empty value for range mode
            // Calculate from values for each range
            const rangesWithFrom = (config.range || []).map((r, idx) => {
              const from = idx === 0 ? 0 : (config.range[idx - 1]?.to ?? 0) + 1;
              return {
                from,
                to: r.to,
                value: r.value,
              };
            });
            payload.rangeConfig = JSON.stringify({
              rangeType: config.rangeType || "Fixed",
              ranges: rangesWithFrom,
            });
          } else if (mode === "Percentage") {
            payload.value = String(percentage);
          }

          return payload;
        })
        .filter(Boolean);

      if (extrasPayloads.length > 0) {
        await Promise.all(
          extrasPayloads.map((payload) =>
            API.post(extraConfigEndpoint, payload)
          )
        );
      }

      showToast("Configuration saved successfully!", "success");
      resetForm();
      fetchProjectConfigData(projectId);

      // Trigger callback with change information only if not skipping change detection
      // (i.e., when saving as master config, don't show the modal)
      if (onConfigSaved && !isMasterConfig && !skipChangeDetection) {
        try {
          // Only show the modal if the project already has data (NR data > 0)
          const nrRes = await API.get(`/NRDatas/Counts?ProjectId=${projectId}`);
          if (nrRes.data && nrRes.data.nrData > 0) {
            console.log("Calling onConfigSaved callback with:", {
              changes,
              affectedReports: affectedReportsWithDeps,
              changedModules: changes.changedModules,
            });
            onConfigSaved({
              changes,
              affectedReports: affectedReportsWithDeps,
              changedModules: changes.changedModules,
            });
          } else {
            console.log("No NR data found for project, skipping configuration change modal");
          }
        } catch (err) {
          console.warn("Could not check NR data counts, defaulting to showing modal if changes exist", err);
          onConfigSaved({
            changes,
            affectedReports: affectedReportsWithDeps,
            changedModules: changes.changedModules,
          });
        }
      } else {
        console.log("No onConfigSaved callback provided or in master config mode or skipping change detection");
      }

      console.log("Saved:", { projectConfigPayload, extrasPayloads });
    } catch (err) {
      console.error("Failed to save configuration", err);
      showToast("Failed to save configuration", err);
      resetForm();
    }
  };

  return { handleSave };
};
