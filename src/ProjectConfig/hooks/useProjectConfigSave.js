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
  selectedDuplicatefields,
  selectedSortingField,
  resetOnSymbolChange,
  resetOmrSerialOnCentreChange,
  isInnerBundlingDone,
  innerBundlingCriteria,
  extraProcessingConfig,
  duplicateConfig,           // ✅ add duplicateConfig here
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
        BoxBreakingCriteria: selectedBoxFields,
        DuplicateRemoveFields: selectedDuplicatefields,
        BoxNumber: startBoxNumber,
        OMRSerialNumber: startOmrEnvelopeNumber,
        EnvelopeMakingCriteria: selectedEnvelopeFields,
        BoxCapacity: selectedCapacity,
        SortingBoxReport: selectedSortingField,
        ResetOnSymbolChange: resetOnSymbolChange,
        ResetOmrSerialOnCentreChange: resetOmrSerialOnCentreChange,
        IsInnerBundlingDone: isInnerBundlingDone,
        InnerBundlingCriteria: innerBundlingCriteria,
        DuplicateCriteria: duplicateConfig?.duplicateCriteria || [], // ✅
        Enhancement: duplicateConfig?.enhancementEnabled
          ? duplicateConfig?.enhancement || 0
          : 0, // ✅
      };

      await API.post(`/ProjectConfigs`, projectConfigPayload);

      // 2️⃣ Save ExtrasConfigurations
      const extrasPayloads = Object.entries(extraTypeSelection)
        .map(([typeName, mode]) => {
          const et = extraTypes.find((t) => t.type === typeName);
          if (!et) return null;

          const config = extraProcessingConfig[typeName] || {};

          const normalizedEnvelope = {
            Inner: String(config.envelopeType?.inner || ""),
            Outer: String(config.envelopeType?.outer || ""),
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
