import { useEffect, useRef, useState } from "react";

/**
 * Hook to detect changes in project configuration
 * Returns a snapshot of current config and a function to check if it has changed
 */
export const useConfigChangeDetection = (
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
  mssInsertPosition
) => {
  const previousSnapshotRef = useRef(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [changedFields, setChangedFields] = useState([]);

  // Create a snapshot of current configuration
  const createSnapshot = () => ({
    enabledModules: JSON.stringify(enabledModules),
    innerEnvelopes: JSON.stringify(innerEnvelopes),
    outerEnvelopes: JSON.stringify(outerEnvelopes),
    selectedBoxFields: JSON.stringify(selectedBoxFields),
    selectedEnvelopeFields: JSON.stringify(selectedEnvelopeFields),
    extraTypeSelection: JSON.stringify(extraTypeSelection),
    selectedCapacity: String(selectedCapacity),
    startBoxNumber: Number(startBoxNumber),
    startOmrEnvelopeNumber: Number(startOmrEnvelopeNumber),
    resetOmrSerialOnCatchChange: Boolean(resetOmrSerialOnCatchChange),
    startBookletSerialNumber: Number(startBookletSerialNumber),
    resetBookletSerialOnCatchChange: Boolean(resetBookletSerialOnCatchChange),
    selectedDuplicatefields: JSON.stringify(selectedDuplicatefields),
    selectedSortingField: JSON.stringify(selectedSortingField),
    resetOnSymbolChange: Boolean(resetOnSymbolChange),
    isInnerBundlingDone: Boolean(isInnerBundlingDone),
    innerBundlingCriteria: JSON.stringify(innerBundlingCriteria),
    extraProcessingConfig: JSON.stringify(extraProcessingConfig),
    duplicateConfig: JSON.stringify(duplicateConfig),
    mssInsertPosition: String(mssInsertPosition),
  });

  // Map field keys to user-friendly names
  const getFieldDisplayName = (fieldKey) => {
    const displayNames = {
      enabledModules: "Enabled Modules",
      innerEnvelopes: "Inner Envelopes",
      outerEnvelopes: "Outer Envelopes",
      selectedBoxFields: "Box Breaking Criteria",
      selectedEnvelopeFields: "Envelope Making Criteria",
      extraTypeSelection: "Extra Configuration",
      selectedCapacity: "Box Capacity",
      startBoxNumber: "Starting Box Number",
      startOmrEnvelopeNumber: "Starting OMR Envelope Number",
      resetOmrSerialOnCatchChange: "Reset OMR Serial on Catch Change",
      startBookletSerialNumber: "Starting Booklet Serial Number",
      resetBookletSerialOnCatchChange: "Reset Booklet Serial on Catch Change",
      selectedDuplicatefields: "Duplicate Removal Fields",
      selectedSortingField: "Sorting Fields",
      resetOnSymbolChange: "Reset on Symbol Change",
      isInnerBundlingDone: "Inner Bundling Status",
      innerBundlingCriteria: "Inner Bundling Criteria",
      extraProcessingConfig: "Extra Processing Configuration",
      duplicateConfig: "Duplicate Configuration",
      mssInsertPosition: "MSS Row Insert Position",
    };
    return displayNames[fieldKey] || fieldKey;
  };

  // Detect changes
  useEffect(() => {
    const currentSnapshot = createSnapshot();

    if (previousSnapshotRef.current) {
      const changed = [];
      Object.keys(currentSnapshot).forEach((key) => {
        if (currentSnapshot[key] !== previousSnapshotRef.current[key]) {
          changed.push(getFieldDisplayName(key));
        }
      });

      if (changed.length > 0) {
        setHasChanges(true);
        setChangedFields(changed);
      } else {
        setHasChanges(false);
        setChangedFields([]);
      }
    }

    previousSnapshotRef.current = currentSnapshot;
  }, [
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
    mssInsertPosition,
  ]);

  // Reset change detection after save
  const resetChangeDetection = () => {
    previousSnapshotRef.current = createSnapshot();
    setHasChanges(false);
    setChangedFields([]);
  };

  return {
    hasChanges,
    changedFields,
    resetChangeDetection,
  };
};
