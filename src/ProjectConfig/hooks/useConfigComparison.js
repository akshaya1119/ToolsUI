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
    const enabledModulesLower = (enabledModules || []).map((m) => String(m).toLowerCase());
    
    // Map enabled modules to their affected reports
    const moduleToReportsMap = {
      "duplicate tool": ["duplicate", "envelope", "box", "envelopeSummary", "catchSummary"],
      "extra configuration": ["extra", "envelope", "box", "envelopeSummary", "catchSummary"],
      "envelope breaking": ["envelope", "envelopeSummary", "catchSummary"],
      "box breaking": ["box", "catchSummary"],
    };

    enabledModules.forEach((module) => {
      changes.changedModules.push(module);
      const reports = moduleToReportsMap[String(module).toLowerCase()] || [];
      reports.forEach((report) => {
        if (!changes.affectedReports.includes(report)) {
          changes.affectedReports.push(report);
        }
      });
    });

    // Check if extras are configured
    if (newExtrasConfig && Object.keys(newExtrasConfig).length > 0) {
      if (!changes.changedModules.includes("Extra Configuration")) {
        changes.changedModules.push("Extra Configuration");
      }
      ["extra", "envelope", "box", "envelopeSummary", "catchSummary"].forEach((report) => {
        if (!changes.affectedReports.includes(report)) {
          changes.affectedReports.push(report);
        }
      });
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
      moduleName: "Enabled Modules",
      affectedReports: ["duplicate", "extra", "envelope", "box", "envelopeSummary", "catchSummary"],
    },
    envelope: {
      moduleName: "Envelope Setup",
      affectedReports: ["envelope", "envelopeSummary", "catchSummary"],
    },
    envelopeMakingCriteria: {
      moduleName: "Envelope Making Criteria",
      affectedReports: ["envelope", "envelopeSummary", "catchSummary"],
    },
    omrSerialNumber: {
      moduleName: "OMR Serial Number",
      affectedReports: ["envelope", "envelopeSummary", "catchSummary"],
    },
    resetOmrSerialOnCatchChange: {
      moduleName: "Reset OMR Serial on Catch Change",
      affectedReports: ["envelope", "envelopeSummary", "catchSummary"],
    },
    bookletSerialNumber: {
      moduleName: "Booklet Serial Number",
      affectedReports: ["envelope", "envelopeSummary", "catchSummary"],
    },
    resetBookletSerialOnCatchChange: {
      moduleName: "Reset Booklet Serial on Catch Change",
      affectedReports: ["envelope", "envelopeSummary", "catchSummary"],
    },
    boxBreakingCriteria: {
      moduleName: "Box Breaking Criteria",
      affectedReports: ["box", "catchSummary"],
    },
    boxCapacity: {
      moduleName: "Box Capacity",
      affectedReports: ["box", "catchSummary"],
    },
    boxNumber: {
      moduleName: "Starting Box Number",
      affectedReports: ["box", "catchSummary"],
    },
    duplicateRemoveFields: {
      moduleName: "Duplicate Removal Fields",
      affectedReports: ["duplicate", "envelope", "box", "envelopeSummary", "catchSummary"],
    },
    sortingBoxReport: {
      moduleName: "Sorting Fields",
      affectedReports: ["box", "catchSummary"],
    },
    resetOnSymbolChange: {
      moduleName: "Reset on Symbol Change",
      affectedReports: ["box", "catchSummary"],
    },
    isInnerBundlingDone: {
      moduleName: "Inner Bundling Status",
      affectedReports: ["box", "catchSummary"],
    },
    innerBundlingCriteria: {
      moduleName: "Inner Bundling Criteria",
      affectedReports: ["box", "catchSummary"],
    },
    duplicateCriteria: {
      moduleName: "Duplicate Criteria",
      affectedReports: ["duplicate", "envelope", "box", "envelopeSummary", "catchSummary"],
    },
    enhancement: {
      moduleName: "Enhancement",
      affectedReports: ["duplicate", "extra", "envelope", "box", "envelopeSummary", "catchSummary"],
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
        moduleName: mapping.moduleName,
        oldValue,
        newValue,
        affectedReports: mapping.affectedReports,
      };

      // Add to changed modules if not already present
      if (!changes.changedModules.includes(mapping.moduleName)) {
        changes.changedModules.push(mapping.moduleName);
      }

      // Add affected reports (avoid duplicates)
      mapping.affectedReports.forEach((report) => {
        if (!changes.affectedReports.includes(report)) {
          changes.affectedReports.push(report);
        }
      });
    }
  });

  // Check for extras configuration changes
  const oldExtrasStr = JSON.stringify(existingExtrasConfig || {});
  const newExtrasStr = JSON.stringify(newExtrasConfig || {});
  
  if (oldExtrasStr !== newExtrasStr) {
    if (!changes.changedModules.includes("Extra Configuration")) {
      changes.changedModules.push("Extra Configuration");
    }
    
    const extrasReports = ["extra", "envelope", "box", "envelopeSummary", "catchSummary"];
    extrasReports.forEach((report) => {
      if (!changes.affectedReports.includes(report)) {
        changes.affectedReports.push(report);
      }
    });
    
    changes.details.extrasConfiguration = {
      moduleName: "Extra Configuration",
      oldValue: existingExtrasConfig,
      newValue: newExtrasConfig,
      affectedReports: extrasReports,
    };
  }

  return changes;
};

/**
 * Extracts the dependency chain for affected reports
 * Only includes reports that are actually needed and enabled
 * - If a report is affected, include it and its dependents (not dependencies)
 * - Only include dependents if they are enabled in the configuration
 * - Don't include upstream reports unless they're directly affected
 */
export const getReportDependencies = (affectedReports, enabledModules = []) => {
  // Normalize enabled modules to lowercase for comparison
  const enabledModulesLower = (enabledModules || []).map((m) => String(m).toLowerCase());

  // Map report keys to module names for checking if enabled
  const reportToModuleMap = {
    duplicate: "duplicate tool",
    extra: "extra configuration",
    envelope: "envelope breaking",
    box: "box breaking",
    envelopeSummary: "envelope summary",
    catchSummary: "catch summary",
  };

  // Define which reports depend on each report (downstream dependencies)
  const dependents = {
    duplicate: ["extra", "envelope", "box", "envelopeSummary", "catchSummary"],
    extra: ["envelope", "box", "envelopeSummary", "catchSummary"],
    envelope: ["box", "envelopeSummary", "catchSummary"],
    box: ["envelopeSummary", "catchSummary"],
    envelopeSummary: [],
    catchSummary: [],
  };

  // Helper to check if a report's module is enabled
  const isReportEnabled = (report) => {
    const moduleName = reportToModuleMap[report];
    if (!moduleName) return true; // If not in map, assume enabled
    return enabledModulesLower.some((m) => m.includes(moduleName));
  };

  const finalReports = new Set();

  // Add affected reports that are enabled
  affectedReports.forEach((report) => {
    if (isReportEnabled(report)) {
      finalReports.add(report);
    }
  });

  // Add downstream dependents only if they are enabled
  affectedReports.forEach((report) => {
    const deps = dependents[report] || [];
    deps.forEach((dep) => {
      if (isReportEnabled(dep)) {
        finalReports.add(dep);
      }
    });
  });

  // Sort by execution order
  const order = ["duplicate", "extra", "envelope", "box", "envelopeSummary", "catchSummary"];
  return order.filter((r) => finalReports.has(r));
};
