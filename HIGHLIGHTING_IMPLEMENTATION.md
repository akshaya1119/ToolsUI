# Field Change Highlighting Implementation

## Overview
Implemented visual highlighting for modified fields in the Project Configuration form. When a configuration is imported, any changes made to the imported values are now highlighted with a golden left border.

## Changes Made

### 1. **EnvelopeMakingCriteriaCard.jsx**
- Added `importedSnapshot` prop
- Implemented `isDirty()` function to compare current values with imported snapshot
- Applied `DIRTY_STYLE` (golden left border) to:
  - Selected envelope fields
  - Reset OMR Serial on Catch Change checkbox
  - Starting OMR Serial Number input

### 2. **BoxBreakingCard.jsx**
- Added `importedSnapshot` prop
- Implemented `isDirty()` function
- Applied `DIRTY_STYLE` to:
  - Box capacity and starting box number
  - Reset Box Number on Course Change checkbox
  - Fields on which Duplicates has to be removed
  - Sorting Report Fields
  - Inner Bundling checkbox and criteria
  - Select Box Breaking field

### 3. **EnvelopeSetupCard.jsx**
- Already had highlighting implemented (no changes needed)

### 4. **ExtraProcessingCard.jsx**
- Added `importedSnapshot` prop
- Implemented `isDirty()` function
- Applied `DIRTY_STYLE` to each extra type configuration box
- Highlights the entire extra type section when any field within it changes

### 5. **DuplicateTool.jsx**
- Added `importedSnapshot` prop
- Implemented `isDirty()` function
- Applied `DIRTY_STYLE` to:
  - Duplicate criteria fields selection
  - Enhancement percentage input

### 6. **ProjectConfiguration.jsx**
- Already passing `importedSnapshot` to all child components
- No changes needed (already properly configured)

## How It Works

### Highlighting Logic
```javascript
const isDirty = (current, snapshotVal) => {
  if (!importedSnapshot || importedSnapshot === "pending") return false;
  return JSON.stringify(current) !== JSON.stringify(snapshotVal);
};

const DIRTY_STYLE = { borderLeft: "3px solid #faad14", paddingLeft: 6, borderRadius: 2 };
```

### Behavior
1. **After Import**: When configuration is imported, `importedSnapshot` is set with the imported values
2. **On Change**: Any modification to a field triggers the `isDirty()` check
3. **Visual Feedback**: Changed fields show a golden (#faad14) left border
4. **On Reset**: 
   - If import was done: Fields revert to imported values, highlighting disappears
   - If no import: Fields are cleared, highlighting doesn't appear

## User Experience

### Scenario 1: Import Configuration
1. User imports configuration from another project
2. All fields are populated with imported values
3. User modifies any field → that field gets highlighted with golden border
4. User clicks Reset → field reverts to imported value, highlighting disappears

### Scenario 2: No Import
1. User manually fills in configuration
2. No highlighting appears (no snapshot to compare against)
3. User clicks Reset → fields are cleared
4. No highlighting appears (no snapshot exists)

## Visual Indicator
- **Golden Left Border**: `#faad14` color indicates a field has been modified from the imported state
- **Border Width**: 3px for clear visibility
- **Padding**: 6px left padding to accommodate the border
- **Border Radius**: 2px for subtle rounded corners

## Testing Checklist
- [ ] Import configuration and verify fields are populated
- [ ] Modify a field and verify golden border appears
- [ ] Click Reset and verify field reverts and border disappears
- [ ] Test without importing and verify no highlighting appears
- [ ] Test Reset without import and verify fields clear
- [ ] Test all card components (Envelope, Box Breaking, Extra Processing, Duplicate Tool)
