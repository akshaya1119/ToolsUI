# Data Import: Required Fields Handling

## Current Behavior: SKIPS ROWS WITH MISSING REQUIRED FIELDS

When importing data, if a row has any missing required fields, the **entire row is skipped** and not uploaded.

## How It Works

### 1. Required Fields Definition
Required fields are determined from the project configuration:
- All fields used in **Envelope Making Criteria**
- All fields used in **Box Breaking Criteria**
- All fields used in **Duplicate Remove Fields**
- All fields used in **Sorting Box Report**
- All fields used in **Inner Bundling Criteria**
- All fields used in **Duplicate Criteria**
- **NRQuantity** (always mandatory)

### 2. Validation Logic (in `getMappedData()` function)

```javascript
const getMappedData = () => {
  if (!excelData.length || !fileHeaders.length) return [];
  return excelData.map((row, rowIndex) => {
    const mappedRow = {};
    let isRowValid = true;  // ← Assume row is valid initially
    
    expectedFields.forEach((field) => {
      const column = fieldMappings[field.fieldId];
      if (column) {
        let value = row[column] ?? null;
        
        // Check if this is a required field and if it's empty
        if (requiredFieldNames.includes(field.name) && (value === null || value === "")) {
          isRowValid = false;  // ← Mark row as INVALID
        }
        mappedRow[field.name] = value;
      }
    });
    
    return isRowValid ? mappedRow : null;  // ← Return null if invalid
  })
    .filter(row => row !== null);  // ← Filter out null rows (SKIP THEM)
};
```

### 3. What Happens

**Scenario 1: Row with Missing Required Field**
```
Excel Row: CatchNo=123, NodalCode=ABC, NRQuantity=(empty)
Result: ❌ SKIPPED (NRQuantity is required)
```

**Scenario 2: Row with All Required Fields**
```
Excel Row: CatchNo=123, NodalCode=ABC, NRQuantity=50
Result: ✅ UPLOADED
```

**Scenario 3: Row with Missing Optional Field**
```
Excel Row: CatchNo=123, NodalCode=ABC, NRQuantity=50, ExamDate=(empty)
Result: ✅ UPLOADED (ExamDate is optional, so row is valid)
```

## Upload Process

1. User uploads Excel file
2. System maps columns to fields
3. `getMappedData()` is called to validate and map data
4. Rows with missing required fields are filtered out
5. Only valid rows are sent to backend
6. User sees success message with uploaded data count

## Error Handling

### Before Upload
- User sees error: `"Please map all required fields: [field names]"`
- Upload is blocked if required fields aren't mapped

### During Upload
- Rows with missing required values are silently skipped
- No error message shown for individual rows
- Only valid rows are uploaded

## Current Limitations

1. **No feedback on skipped rows**: User doesn't know which rows were skipped
2. **Silent filtering**: Rows disappear without notification
3. **No row-level error report**: Can't see why specific rows were rejected

## Recommended Improvements

To provide better user feedback, consider:

1. **Show skipped rows count**: Display "X rows skipped due to missing required fields"
2. **Detailed error report**: Show which rows failed and why
3. **Preview before upload**: Let users see which rows will be skipped
4. **Validation warnings**: Highlight rows with missing required fields in preview

## Code Location

- **File**: `src/ToolsProcessing/DataImport.jsx`
- **Function**: `getMappedData()` (line ~416)
- **Validation**: Lines 430-433
- **Filtering**: Line 437

## Related Functions

- `areRequiredFieldsMapped()` - Checks if all required fields are mapped (line ~410)
- `handleUpload()` - Initiates the upload process (line ~360)
- `getMappedData()` - Validates and maps data (line ~416)
