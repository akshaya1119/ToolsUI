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
  resetForm
) => {
  const handleSave = async () => {
    try {
      // 1️⃣ Save ProjectConfigs including Duplicate Tool
      const projectConfigPayload = {
        projectId: Number(projectId),
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

      await API.post(`/ProjectConfigs`, projectConfigPayload);

      // 2️⃣ Delete existing ExtrasConfigurations first
      try {
        await API.delete(`/ExtrasConfigurations/${projectId}`);
      } catch (err) {
        // Ignore if no existing configs
        console.log("No existing extras config to delete");
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
          const range = Number(config.range || 0);
          const percentage = Number(config.percentage || 0);

          const allZero =
            fixed === 0 &&
            range === 0 &&
            percentage === 0 &&
            !normalizedEnvelope.Inner &&
            !normalizedEnvelope.Outer;

          // 🚫 Skip if nothing configured
          if (allZero) return null;
          const value =
            mode === "Fixed"
              ? String(fixed)
              : mode === "Range"
                ? String(range)
                : String(percentage);
          return {
            id: 0,
            projectId: Number(projectId),
            extraType: et.extraTypeId,
            mode,
            value,
            envelopeType: JSON.stringify(normalizedEnvelope),
          };
        })
        .filter(Boolean);

      if (extrasPayloads.length > 0) {
        await Promise.all(
          extrasPayloads.map((payload) =>
            API.post(`/ExtrasConfigurations`, payload)
          )
        );
      }

      showToast("Configuration saved successfully!", "success");
      fetchProjectConfigData(projectId);
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
