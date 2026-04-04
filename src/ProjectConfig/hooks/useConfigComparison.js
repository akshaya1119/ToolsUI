/**
 * Compares posted configuration with existing configuration
 * Returns only the modules/fields that have actually changed
 * Only includes dependent reports if they are enabled in the configuration
 * If no existing config, treats all enabled modules as changed
 */
export const compareConfigurations = (existingConfig, newConfig, enabledModules = [], existingExtrasConfig = null, newExtrasConfig = null) => {
  const changes = {
    changedModules: [],
    affectedReports: [],
    details: {},
  };

  if (!newConfig) {
    return changes;
  }

  // If no existing config, treat all enabled modules as changed
  if (!existingConfig) {
    (enabledModules || []).forEach((module) => {
      changes.changedModules.push(module);
      // Add module name to affectedReports (we now use module names as seeds for dependency resolution)
      if (!changes.affectedReports.includes(module)) {
        changes.affectedReports.push(module);
      }
    });

    // Check if extras are configured
    if (newExtrasConfig && Object.keys(newExtrasConfig).length > 0) {
      if (!changes.changedModules.includes("Extra Configuration")) {
        changes.changedModules.push("Extra Configuration");
      }
      if (!changes.affectedReports.includes("Extra Configuration")) {
        changes.affectedReports.push("Extra Configuration");
      }
    }

    return changes;
  }

  // Normalize enabled modules to lowercase for comparison
  const enabledModulesLower = (enabledModules || []).map((m) => String(m).toLowerCase());

  // Helper to safely compare values
  const hasChanged = (oldVal, newVal) => {
    const oldStr = JSON.stringify(oldVal);
    const newStr = JSON.stringify(newVal);
    return oldStr !== newStr;
  };

  // Map of config fields to their corresponding modules and affected reports
  const fieldToModuleMap = {
    modules: {
      label: "Enabled Modules",
      moduleName: "Duplicate Tool",
    },
    envelope: {
      label: "Envelope Setup",
      moduleName: "Envelope Setup and Enhancement",
    },
    envelopeMakingCriteria: {
      label: "Envelope Making Criteria",
      moduleName: "Envelope Setup and Enhancement",
    },
    omrSerialNumber: {
      label: "OMR Serial Number",
      moduleName: "Envelope Setup and Enhancement",
    },
    resetOmrSerialOnCatchChange: {
      label: "Reset OMR Serial on Catch Change",
      moduleName: "Envelope Setup and Enhancement",
    },
    bookletSerialNumber: {
      label: "Booklet Serial Number",
      moduleName: "Envelope Setup and Enhancement",
    },
    resetBookletSerialOnCatchChange: {
      label: "Reset Booklet Serial on Catch Change",
      moduleName: "Envelope Setup and Enhancement",
    },
    boxBreakingCriteria: {
      label: "Box Breaking Criteria",
      moduleName: "Box Breaking",
    },
    boxCapacity: {
      label: "Box Capacity",
      moduleName: "Box Breaking",
    },
    boxNumber: {
      label: "Starting Box Number",
      moduleName: "Box Breaking",
    },
    duplicateRemoveFields: {
      label: "Duplicate Removal Fields",
      moduleName: "Duplicate Tool",
    },
    sortingBoxReport: {
      label: "Sorting Fields",
      moduleName: "Box Breaking",
    },
    resetOnSymbolChange: {
      label: "Reset on Symbol Change",
      moduleName: "Box Breaking",
    },
    isInnerBundlingDone: {
      label: "Inner Bundling Status",
      moduleName: "Box Breaking",
    },
    innerBundlingCriteria: {
      label: "Inner Bundling Criteria",
      moduleName: "Box Breaking",
    },
    duplicateCriteria: {
      label: "Duplicate Criteria",
      moduleName: "Duplicate Tool",
    },
    enhancement: {
      label: "Enhancement",
      moduleName: "Envelope Setup and Enhancement",
    },
    mssTypes: {
      label: "MSS Types",
      moduleName: "Envelope Setup and Enhancement",
    },
    mssAttached: {
      label: "MSS Row Insert Position",
      moduleName: "Envelope Setup and Enhancement",
    },
  };

  // Check for extras configuration changes
  // Extras are handled separately, so we need to detect if extraTypeSelection or extraProcessingConfig changed
  // This is passed separately to the comparison function, so we'll handle it after the main field checks

  // Check each field for changes
  Object.keys(fieldToModuleMap).forEach((field) => {
    const oldValue = existingConfig[field];
    const newValue = newConfig[field];

    if (hasChanged(oldValue, newValue)) {
      const mapping = fieldToModuleMap[field];
      changes.details[field] = {
        label: mapping.label,
        oldValue,
        newValue,
        moduleName: mapping.moduleName,
      };

      // Add to changed modules (the human readable label)
      if (!changes.changedModules.includes(mapping.label)) {
        changes.changedModules.push(mapping.label);
      }

      // Add affected module DB name (avoid duplicates)
      if (!changes.affectedReports.includes(mapping.moduleName)) {
        changes.affectedReports.push(mapping.moduleName);
      }
    }
  });

  // Check for extras configuration changes
  // Remove empty entries (where no mode is selected or nothing is configured)
  const filterEmptyExtras = (config) => {
    const filtered = {};
    Object.entries(config || {}).forEach(([type, item]) => {
      const hasEnvelope = item.envelopeType && (item.envelopeType.Inner || item.envelopeType.Outer);
      const hasRange = item.rangeConfig && Array.isArray(item.rangeConfig.ranges) && item.rangeConfig.ranges.length > 0;
      
      const hasContent = item.mode && (
        (item.value && String(item.value) !== "0") || 
        hasEnvelope || 
        hasRange
      );
      if (hasContent) {
        filtered[type] = item;
      }
    });
    return filtered;
  };

  const oldExtrasFiltered = filterEmptyExtras(existingExtrasConfig);
  const newExtrasFiltered = filterEmptyExtras(newExtrasConfig);

  const oldExtrasStr = JSON.stringify(oldExtrasFiltered);
  const newExtrasStr = JSON.stringify(newExtrasFiltered);
  
  if (oldExtrasStr !== newExtrasStr) {
    if (!changes.changedModules.includes("Extra Configuration")) {
      changes.changedModules.push("Extra Configuration");
    }
    
    if (!changes.affectedReports.includes("Extra Configuration")) {
      changes.affectedReports.push("Extra Configuration");
    }
    
    changes.details.extrasConfiguration = {
      moduleName: "Extra Configuration",
      oldValue: oldExtrasFiltered,
      newValue: newExtrasFiltered,
      moduleDbName: "Extra Configuration",
    };
  }

  return changes;
};

/**
 * Extracts the dependency chain for affected reports
 * Only includes reports that are actually needed and enabled
 * - If a report is affected, include it and its dependents (not dependencies)
 * - Only include dependents if they are enabled in the configuration
 */
export const getReportDependencies = (affectedModules, enabledModules = [], toolModules = []) => {
  // Normalize enabled modules to lowercase for comparison
  const enabledModulesLower = (enabledModules || []).map((m) => String(m).toLowerCase());

  // If toolModules is provided, use it to build dependencies dynamically
  if (toolModules && toolModules.length > 0) {
    const reportList = ["duplicate", "extra", "envelope", "box", "envelopeSummary", "catchSummary", "catchOmrSerialing"];
    
    // Reverse mapping: Database module name -> Report key
    const moduleToReportKeyMap = {
      "duplicate tool": "duplicate",
      "extra configuration": "extra",
      "envelope breaking": "envelope",
      "box breaking": "box",
      "envelope summary": "envelopeSummary",
      "catch summary report": "catchSummary",
      "catchomrserialingreport": "catchOmrSerialing",
    };

    // Find module info from toolModules
    const moduleMap = {};
    toolModules.forEach(m => {
      moduleMap[m.id] = m;
      moduleMap[m.name.toLowerCase()] = m;
    });

    // Build downstream dependents map
    const dependentsMap = {};
    toolModules.forEach(m => {
      const parentIds = m.parentModuleIds || (m.parentModuleId ? [m.parentModuleId] : []);
      parentIds.forEach(parentId => {
        const parent = moduleMap[parentId];
        if (parent) {
          const parentName = parent.name.toLowerCase();
          if (!dependentsMap[parentName]) dependentsMap[parentName] = [];
          
          if (!dependentsMap[parentName].includes(m.name.toLowerCase())) {
            dependentsMap[parentName].push(m.name.toLowerCase());
          }
        }
      });
    });

    // Check if a module name is enabled
    const isModuleEnabled = (name) => enabledModulesLower.some(m => m.includes(name));

    const finalModules = new Set();

    // Start with explicitly affected modules
    affectedModules.forEach(moduleNameOrKey => {
      const nameLower = String(moduleNameOrKey).toLowerCase();
      // It might be a report key (fallback) or a module name
      const modName = moduleToReportKeyMap[nameLower] ? nameLower : 
                     Object.keys(moduleToReportKeyMap).find(k => k.includes(nameLower)) || nameLower;
      
      if (isModuleEnabled(modName)) {
        finalModules.add(modName);
      }
    });

    // Recursively add downstream dependents
    const addDependents = (moduleName) => {
      const children = dependentsMap[moduleName] || [];
      children.forEach(child => {
        if (isModuleEnabled(child) && !finalModules.has(child)) {
          finalModules.add(child);
          addDependents(child);
        }
      });
    };

    const initialModules = Array.from(finalModules);
    initialModules.forEach(addDependents);

    const resultReports = Array.from(finalModules)
      .map(m => moduleToReportKeyMap[m])
      .filter(Boolean);

    // Sort by standard execution order
    return reportList.filter(r => resultReports.includes(r));
  }

  // Unify the argument name to affectedModules and update the fallback logic to handle module names reliably. This ensures consistency when toolModules is not available.
  const moduleToReportKeyMap = {
    "duplicate tool": "duplicate",
    "extra configuration": "extra",
    "envelope breaking": "envelope",
    "box breaking": "box",
    "envelope summary": "envelopeSummary",
    "catch summary report": "catchSummary",
    "catchomrserialingreport": "catchOmrSerialing",
  };

  const finalReports = new Set();
  
  // Standardize input (could be module name or report key)
  affectedModules.forEach((item) => {
    const itemLower = String(item).toLowerCase();
    const reportKey = moduleToReportKeyMap[itemLower] || itemLower;
    
    if (Object.values(moduleToReportKeyMap).includes(reportKey)) {
      finalReports.add(reportKey);
    }
  });

  // NOTE: We no longer have hardcoded downstream dependency resolution here.
  // Dependency resolution is now fully driven by toolModules data from the database.

  const order = ["duplicate", "extra", "envelope", "box", "envelopeSummary", "catchSummary", "catchOmrSerialing"];
  return order.filter((r) => finalReports.has(r));
};
