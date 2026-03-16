import API from "../../hooks/api";

export const useProjectConfigSave = (
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
  fetchProjectConfigData,
  showToast,
  resetForm,
  isMasterConfig = false,
  typeId = null,
  groupId = null
) => {
  const handleSave = async () => {
    try {
      // Validation for master config mode
      if (isMasterConfig && (!typeId || !groupId)) {
        showToast("Please select Type and Group first", "error");
        return;
      }

      // Validation for project config mode
      if (!isMasterConfig && !projectId) {
        showToast("Project ID is required", "error");
        return;
      }

      // Determine which endpoint to use
      const projectConfigEndpoint = isMasterConfig ? '/MProjectConfigs' : '/ProjectConfigs';
      const extraConfigEndpoint = isMasterConfig ? '/MExtraConfigs' : '/ExtrasConfigurations';

      // 1️⃣ Save ProjectConfigs including Duplicate Tool
      const projectConfigPayload = {
        ...(isMasterConfig ? { typeId: Number(typeId), groupId: Number(groupId) } : { projectId: Number(projectId) }),
        modules: enabledModules.map(
          (m) => toolModules.find((tm) => tm.name === m)?.id
        ),
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
      };

      await API.post(projectConfigEndpoint, projectConfigPayload);

      // 2️⃣ Delete existing ExtrasConfigurations first (only for non-master mode)
      if (!isMasterConfig) {
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
            ...(isMasterConfig ? { typeId: Number(typeId), groupId: Number(groupId) } : { projectId: Number(projectId) }),
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
      if (!isMasterConfig) {
        fetchProjectConfigData(projectId);
      }
      resetForm();
      console.log("Saved:", { projectConfigPayload, extrasPayloads });
    } catch (err) {
      console.error("Failed to save configuration", err);
      showToast("Failed to save configuration", err);
      resetForm();
    }
  };

  return { handleSave };
};
