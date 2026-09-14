import API from "../../hooks/api";
import { NODAL_MODULE, UNIVERSITY_MODULE, EXTRA_ALIAS_NAME } from "../../ProjectConfig/components/constants";

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
  // Helper function to log audit trail
  const logAuditTrail = (action, isPost, oldValue, newValue, details = {}) => {
    const user = localStorage.getItem("userName") || localStorage.getItem("user") || "Unknown User";
    const timestamp = new Date().toISOString();
    const actionType = isPost ? "POST (CREATE)" : "PUT (UPDATE)";
    
    const auditLog = {
      timestamp,
      user,
      groupId: Number(groupId),
      typeId: Number(typeId),
      action: `${action} - ${actionType}`,
      changes: {
        oldValue: oldValue ? JSON.stringify(oldValue, null, 2) : "N/A (New Record)",
        newValue: JSON.stringify(newValue, null, 2),
        ...details,
      },
    };
    
    console.log(
      `%c[MASTER AUDIT LOG] ${action} - ${actionType}`,
      "color: #1890ff; font-weight: bold; font-size: 12px;",
      auditLog
    );
    
    return auditLog;
  };

  const handleSave = async (passcode = null) => {
    const requestHeaders = passcode ? { headers: { 'X-Master-Auth-Passcode': passcode, 'X-Group-Id': groupId || 0 } } : {};
    try {
      // Fetch existing config to compare (for updates)
      let existingMasterConfig = null;
      let existingExtrasConfig = [];
      
      try {
        const existingRes = await API.get(`/MasterConfigs/ByGroupAndType/${groupId}/${typeId}`);
        existingMasterConfig = existingRes.data;
      } catch (err) {
        console.log("No existing master config found - this will be a new record");
      }

      try {
        const extrasRes = await API.get(`/MasterExtrasConfigurations/ByGroupAndType/${groupId}/${typeId}`);
        existingExtrasConfig = Array.isArray(extrasRes.data) ? extrasRes.data : [];
      } catch (err) {
        console.log("No existing extras config found");
      }

      // 1️⃣ Save MasterConfigs including Duplicate Tool
      const masterConfigPayload = {
        groupId: Number(groupId),
        typeId: Number(typeId),
        modules: enabledModules.flatMap((m) => {
          if (m === EXTRA_ALIAS_NAME) {
            const extraModuleIds = toolModules
              .filter((tm) => {
                if (tm.name === NODAL_MODULE || tm.name === UNIVERSITY_MODULE) return true;
                if (tm.name && tm.name.toLowerCase().includes("extra")) return true;
                if (tm.description && tm.description.toLowerCase().includes("extra")) return true;
                return false;
              })
              .map((tm) => tm.id);
            
            console.log(`Expanding ${EXTRA_ALIAS_NAME} to module IDs:`, extraModuleIds);
            console.log("toolModules available:", toolModules.map(tm => ({ id: tm.id, name: tm.name, description: tm.description })));
            return extraModuleIds;
          }
          const mod = toolModules.find((tm) => tm.name === m);
          return mod ? [mod.id] : [];
        }),
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

      // Log MasterConfig changes
      const isNewMasterConfig = !existingMasterConfig;
      logAuditTrail(
        "Master Configuration",
        isNewMasterConfig,
        existingMasterConfig,
        masterConfigPayload,
        {
          operationType: isNewMasterConfig ? "CREATE_NEW_CONFIG" : "UPDATE_EXISTING_CONFIG",
          moduleChanges: {
            oldModules: existingMasterConfig?.modules || [],
            newModules: masterConfigPayload.modules,
          },
          envelopeChanges: {
            oldEnvelope: existingMasterConfig?.envelope,
            newEnvelope: masterConfigPayload.envelope,
          },
        }
      );

      const masterSaveResponse = await API.post(`/MasterConfigs`, masterConfigPayload, requestHeaders);
      console.log(
        "%c[MASTER SAVE SUCCESS] Master Configuration saved",
        "color: #52c41a; font-weight: bold;",
        masterSaveResponse.data
      );

      // 2️⃣ Delete existing MasterExtrasConfigurations first
      try {
        await API.delete(`/MasterExtrasConfigurations/${groupId}/${typeId}`, requestHeaders);
        console.log(
          "%c[MASTER AUDIT LOG] Deleted existing extras configurations",
          "color: #faad14; font-weight: bold;",
          { groupId, typeId, deletedCount: existingExtrasConfig.length }
        );
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

          //  Skip if nothing configured
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
        // Log each extras configuration being saved
        extrasPayloads.forEach((payload, index) => {
          const oldExtras = existingExtrasConfig.find(e => e.extraType === payload.extraType);
          logAuditTrail(
            `Extras Configuration #${index + 1}`,
            true,
            oldExtras,
            payload,
            {
              extraType: payload.extraType,
              mode: payload.mode,
              value: payload.value,
            }
          );
        });

        await Promise.all(
          extrasPayloads.map((payload) =>
            API.post(`/MasterExtrasConfigurations`, payload, requestHeaders)
          )
        );
        
        console.log(
          "%c[MASTER SAVE SUCCESS] Extras configurations saved",
          "color: #52c41a; font-weight: bold;",
          { count: extrasPayloads.length, payloads: extrasPayloads }
        );
      }

      showToast("Master configuration saved successfully!", "success");
      fetchMasterConfigData(groupId, typeId);
      resetForm();
      console.log("Saved:", { masterConfigPayload, extrasPayloads });
    } catch (err) {
      console.error("Failed to save master configuration", err);
      
      // Log error to audit trail
      const errorLog = {
        timestamp: new Date().toISOString(),
        user: localStorage.getItem("userName") || localStorage.getItem("user") || "Unknown User",
        groupId: Number(groupId),
        typeId: Number(typeId),
        action: "Master Configuration Save - FAILED",
        error: err.response?.data?.message || err.message,
        errorDetails: err.response?.data,
      };
      
      console.error(
        "%c[MASTER AUDIT LOG] Save FAILED",
        "color: #f5222d; font-weight: bold;",
        errorLog
      );
      
      showToast("Failed to save master configuration", err);
      resetForm();
    }
  };

  return { handleSave };
};
