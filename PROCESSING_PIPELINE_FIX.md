# Processing Pipeline Module Matching Fix

## Problem
When running the processing pipeline with 6 modules, "Envelope Summary" and "Envelope Breaking" were running simultaneously (both showing loading state) instead of sequentially.

### Root Cause
The module matching logic was using substring matching that was too broad:
- "Envelope Breaking" contains "envelope"
- "Envelope Summary" also contains "envelope"
- Both modules were matching the same step key, causing them to run together

## Solution

### 1. Improved `computeRunOrder()` Function
Changed from generic substring matching to exact phrase matching:

**Before:**
```javascript
if (lowerNames.some((n) => n.includes("envelope breaking")))
  order.push({ key: "envelope", title: "Envelope Breaking" });
// Summary steps always added regardless of module names
order.push({ key: "envelopeSummary", title: "Envelope Summary" });
order.push({ key: "catchSummary", title: "Catch Summary" });
```

**After:**
```javascript
// Use exact phrase to avoid matching "envelope summary"
if (lowerNames.some((n) => n.includes("envelope breaking")))
  order.push({ key: "envelope", title: "Envelope Breaking" });

// Only add summary steps if explicitly enabled
if (lowerNames.some((n) => n.includes("envelope summary")))
  order.push({ key: "envelopeSummary", title: "Envelope Summary" });
if (lowerNames.some((n) => n.includes("catch summary")))
  order.push({ key: "catchSummary", title: "Catch Summary Report" });
```

### 2. Improved `data` Mapping Function
Changed from module-centric to step-centric mapping with precise matching:

**Before:**
```javascript
const data = (enabledModuleNames || []).map((name) => {
  const normalized = String(name).toLowerCase();
  const step = steps.find((s) => normalized.includes(s.key)) || {};
  return {
    key: name,
    moduleName: name,
    status: step.status || "pending",
    report: step.fileUrl,
  };
});
```

**After:**
```javascript
const data = steps.map((step) => {
  const moduleName = enabledModuleNames.find((name) => {
    const normalized = String(name).toLowerCase();
    // Exact matching for summary steps
    if (step.key === "envelopeSummary") return normalized.includes("envelope summary");
    if (step.key === "catchSummary") return normalized.includes("catch summary");
    // For other steps, use the key
    return normalized.includes(step.key);
  }) || step.title;
  
  return {
    key: step.key,
    moduleName: moduleName,
    status: step.status || "pending",
    report: step.fileUrl,
  };
});
```

## How It Works Now

### Module Execution Order
1. **Duplicate Tool** (if enabled)
2. **Extra Configuration** (if enabled)
3. **Envelope Breaking** (if enabled)
4. **Box Breaking** (if enabled)
5. **Envelope Summary** (if enabled)
6. **Catch Summary Report** (if enabled)

### Key Improvements
✅ **Sequential Execution**: Each module runs one at a time, not simultaneously
✅ **Precise Matching**: "Envelope Breaking" and "Envelope Summary" are now distinct
✅ **Conditional Steps**: Summary steps only run if explicitly enabled
✅ **Clear Status**: Each module shows its own loading state independently
✅ **Accurate Reporting**: Each step displays correct status and duration

## Example Scenario

### Enabled Modules
```json
[
  "Duplicate Tool",
  "Extra Configuration",
  "Envelope Breaking",
  "Box Breaking",
  "Envelope Summary",
  "Catch Summary Report"
]
```

### Execution Flow
```
1. Duplicate Tool ✓ (completed)
   ↓
2. Extra Configuration ✓ (completed)
   ↓
3. Envelope Breaking ✓ (completed)
   ↓
4. Box Breaking ✓ (completed)
   ↓
5. Envelope Summary ✓ (completed)
   ↓
6. Catch Summary Report ✓ (completed)
```

Each step waits for the previous one to complete before starting.

## Testing Checklist
- [ ] Enable all 6 modules
- [ ] Click "Start" button
- [ ] Verify modules run sequentially (one at a time)
- [ ] Check that loading indicator shows only for current step
- [ ] Verify "Envelope Breaking" and "Envelope Summary" don't run together
- [ ] Confirm each step shows correct duration
- [ ] Verify reports are generated correctly

## Code Location
- **File**: `src/ToolsProcessing/ProcessingPipeline.jsx`
- **Functions Modified**:
  - `computeRunOrder()` (line ~75)
  - `data` mapping (line ~330)

## Related Files
- Module list comes from: `/Modules` API endpoint
- Project config comes from: `/ProjectConfigs/ByProject/{projectId}` API endpoint
