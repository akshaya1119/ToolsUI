import API from "../../hooks/api";

export const useMasterConfigSave = (
  groupId,
  typeId,
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
) => {
  const handleSave = async () => {
    try {
      // 1️⃣ Save MasterConfigs including Duplicate Tool
      const masterConfigPayload = {
        groupId: Number(groupId),
        typeId: Number(typeId),
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
        ResetOmrSerialOnCatchChange: resetOmrSerialOnCatchChange,
        IsInnerBundlingDone: isInnerBundlingDone,
        InnerBundlingCriteria: innerBundlingCriteria,
        DuplicateCriteria: duplicateConfig?.duplicateCriteria || [],
        Enhancement: duplicateConfig?.enhancementEnabled
          ? duplicateConfig?.enhancement || 0
          : 0,
      };

      await API.post(`/MasterConfigs`, masterConfigPayload);

      // 2️⃣ Delete existing MasterExtrasConfigurations first
      try {
        await API.delete(`/MasterExtrasConfigurations/${groupId}/${typeId}`);
      } catch (err) {
        // Ignore if no existing configs
        console.log("No existing master extras config to delete");
      }

      // 3️⃣ Save MasterExtrasConfigurations
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
            groupId: Number(groupId),
            typeId: Number(typeId),
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
            API.post(`/MasterExtrasConfigurations`, payload)
          )
        );
      }

      showToast("Master configuration saved successfully!", "success");
      fetchMasterConfigData(groupId, typeId);
      resetForm();
      console.log("Saved:", { masterConfigPayload, extrasPayloads });
    } catch (err) {
      console.error("Failed to save master configuration", err);
      showToast("Failed to save master configuration", err);
      resetForm();
    }
  };

  return { handleSave };
};
