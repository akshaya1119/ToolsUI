# Configuration Change Detection & Automatic Report Re-run Guide

## Overview

This feature automatically detects configuration changes, compares them with existing settings, identifies affected reports, and seamlessly navigates users to the Processing Pipeline with affected modules pre-selected for re-processing.

## How It Works

### 1. Configuration Comparison (`useConfigComparison.js`)

When configuration is saved, the system:

- **Fetches existing config** from the backend
- **Compares field-by-field** with the newly posted configuration
- **Identifies only changed fields** (not all fields)
- **Maps changes to affected reports** based on dependencies
- **Checks which modules are enabled** in the project
- **Resolves report dependencies** to include only enabled downstream reports

**Example:**
```
User changes: Box Breaking Criteria
System identifies:
  - Direct impact: Box Breaking
  - Downstream: Envelope Summary, Catch Summary
  - Enabled modules: Box Breaking ✓, Envelope Summary ✗, Catch Summary ✗
  - Final result: Only Box Breaking re-runs
```

### 2. Module-Aware Dependency Resolution

The system checks if dependent reports are actually enabled before including them:

```
Box Breaking changed
  ↓
Check downstream: Envelope Summary, Catch Summary
  ↓
Envelope Summary enabled? NO → Skip
Catch Summary enabled? NO → Skip
  ↓
Result: Only Box Breaking re-runs
```

### 3. Change Detection & Mapping

The system tracks 19 configuration fields and their impact:

| Field | Affected Reports |
|-------|------------------|
| modules | All reports |
| envelope | Envelope, Summary reports |
| envelopeMakingCriteria | Envelope, Summary reports |
| boxBreakingCriteria | Box, Catch Summary |
| duplicateRemoveFields | All reports |
| enhancement | All reports |
| ... | ... |

### 3. Modal Notification (`ConfigChangeModal.jsx`)

Shows users:
- **What changed** - List of modified configuration fields
- **Which reports will be re-generated** - Only enabled reports affected
- **What happens next** - Step-by-step process

**Modal Content Example (Box Breaking changed, only Box Breaking enabled):**
```
⚠️ Configuration Changes Detected

Your project configuration has been updated. To ensure accurate 
reports, the following modules will be re-processed with the new settings.

Configuration changes:
✓ Box Breaking Criteria

Reports to be re-generated:
✓ Box Breaking

What happens next:
1. You'll be taken to the Processing Pipeline
2. Affected reports will be automatically selected
3. Click 'Start' to re-generate the reports
4. Processing time depends on your data volume
```

### 4. Automatic Navigation & Selection

After user confirms:
1. **Data is stored** in sessionStorage with affected reports (only enabled ones)
2. **Navigation occurs** to `/ProcessingPipeline`
3. **Modules are auto-selected** based on affected reports
4. **User can review** before clicking "Start"

### 5. Processing Pipeline Integration

The Processing Pipeline:
- **Reads sessionStorage** for configuration change data
- **Auto-selects affected modules** on page load
- **Shows alert banner** with changed fields
- **Maintains execution order** with dependencies
- **Clears sessionStorage** after reading

## User Flow

### Step 1: Modify Configuration
User makes changes to any configuration card (e.g., changes box breaking criteria)

### Step 2: Save Configuration
User clicks "Save" button

### Step 3: Backend Comparison
- Existing config is fetched
- New config is compared field-by-field
- Only changed fields are identified
- Affected reports are determined with dependencies

### Step 4: Modal Confirmation
User sees:
- What changed (e.g., "Box Breaking Criteria")
- Which reports will be re-generated
- Clear "Cancel" or "Re-run Reports" options

### Step 5: Automatic Navigation
If user confirms:
- Data is stored in sessionStorage
- User is navigated to Processing Pipeline
- Affected modules are automatically selected
- Alert banner shows what changed

### Step 6: Review & Execute
User can:
- Review selected modules
- Adjust selection if needed
- Click "Start" to begin re-processing

## Technical Implementation

### Configuration Comparison

```javascript
const changes = compareConfigurations(existingConfig, newConfig);
// Returns:
// {
//   changedModules: ["Box Breaking Criteria", "Duplicate Removal Fields"],
//   affectedReports: ["duplicate", "envelope", "box", "catchSummary"],
//   details: {
//     boxBreakingCriteria: {
//       moduleName: "Box Breaking Criteria",
//       oldValue: ["field1"],
//       newValue: ["field1", "field2"],
//       affectedReports: ["box", "catchSummary"]
//     },
//     ...
//   }
// }
```

### Report Dependencies

The system uses **downstream dependencies** - only including reports that depend on the changed report, not upstream reports.

```
Duplicate Processing
    ↓ (depends on: nothing)
Extra Configuration
    ↓ (depends on: Duplicate)
Envelope Breaking
    ↓ (depends on: Extra)
Box Breaking
    ↓ (depends on: Envelope)
Envelope Summary
    ↓ (depends on: Box)
Catch Summary Report
    ↓ (depends on: Envelope Summary)
```

**Examples:**

1. **Change Box Breaking Criteria**
   - Affected: Box Breaking
   - Downstream: Catch Summary (depends on Box)
   - Result: Only Box Breaking + Catch Summary re-run
   - NOT re-run: Duplicate, Extra, Envelope (upstream)

2. **Change Envelope Making Criteria**
   - Affected: Envelope Breaking
   - Downstream: Box, Envelope Summary, Catch Summary
   - Result: Envelope + Box + Envelope Summary + Catch Summary
   - NOT re-run: Duplicate, Extra (upstream)

3. **Change Duplicate Criteria**
   - Affected: Duplicate Processing
   - Downstream: All other reports
   - Result: All 6 reports re-run
   - Reason: Everything depends on Duplicate

### Data Flow

```
ProjectConfiguration
    ↓
useProjectConfigSave (compares configs)
    ↓
ConfigChangeModal (shows changes)
    ↓
sessionStorage (stores affected reports)
    ↓
navigate("/ProcessingPipeline")
    ↓
ProcessingPipeline (reads sessionStorage, auto-selects)
    ↓
User clicks "Start" to re-run
```

## Key Features

✓ **Smart Comparison** - Only identifies actual changes, not all fields
✓ **Dependency Resolution** - Automatically includes dependent reports
✓ **Automatic Navigation** - Seamlessly moves to Processing Pipeline
✓ **Pre-selection** - Affected modules are automatically selected
✓ **User Control** - Can review and adjust before executing
✓ **Clear Communication** - Shows exactly what changed and why
✓ **Non-Intrusive** - Modal can be dismissed if needed

## Configuration Fields & Impact

### High Impact (Affects All Reports)
- `modules` - Enabled modules
- `duplicateCriteria` - Duplicate removal criteria
- `enhancement` - Enhancement settings

### Medium Impact (Affects Multiple Reports)
- `envelope` - Envelope setup
- `envelopeMakingCriteria` - Envelope making criteria
- `duplicateRemoveFields` - Duplicate removal fields

### Low Impact (Affects Specific Reports)
- `boxBreakingCriteria` - Box breaking only
- `boxCapacity` - Box breaking only
- `sortingBoxReport` - Box breaking only

## Report Execution Order

The system maintains this execution order and only includes reports that are affected or depend on affected reports:

```
1. Duplicate Processing (no dependencies)
   ↓
2. Extra Configuration (depends on Duplicate)
   ↓
3. Envelope Breaking (depends on Extra)
   ↓
4. Box Breaking (depends on Envelope)
   ↓
5. Envelope Summary (depends on Box)
   ↓
6. Catch Summary Report (depends on Envelope Summary)
```

**Key Principle:** Only downstream reports are included, not upstream ones.

When a user changes a field, only that report and reports that depend on it are re-run.

**Example:**
- User changes: Box Breaking Criteria
- Direct impact: Box Breaking
- Downstream: Catch Summary (depends on Box)
- Final selection: Box Breaking + Catch Summary (NOT Duplicate, Extra, Envelope)

## Error Handling

- If comparison fails, user is notified but can still save
- If navigation fails, user is shown error message
- If sessionStorage is unavailable, ProcessingPipeline works normally
- If affected reports can't be determined, all modules are available for selection

## Testing Checklist

- [ ] Modify a single field (e.g., box capacity)
- [ ] Verify modal shows only that field as changed
- [ ] Verify only affected reports are listed
- [ ] Confirm navigation to ProcessingPipeline
- [ ] Verify affected modules are pre-selected
- [ ] Test with multiple field changes
- [ ] Test canceling the modal
- [ ] Test with no changes (modal shouldn't appear)

## Troubleshooting

### Modal doesn't appear
- Check if configuration actually changed
- Verify comparison logic is working (check console logs)
- Ensure `onConfigSaved` callback is being called

### Affected reports not selected
- Check sessionStorage in browser DevTools
- Verify ProcessingPipeline is reading sessionStorage
- Check if projectId matches

### Navigation doesn't happen
- Check browser console for errors
- Verify routing is configured for `/ProcessingPipeline`
- Check if `useNavigate` hook is working

### Wrong reports selected
- Verify dependency mapping in `useConfigComparison.js`
- Check if field-to-report mapping is correct
- Review the `getReportDependencies` function logic

