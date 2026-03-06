# Skipped Rows Report Feature

## Overview
When importing data in the Data Import tool, rows with missing required fields are now tracked and can be downloaded as an Excel report. This helps users identify and fix data issues.

## How It Works

### 1. Row Validation During Upload
When you click "Upload and Validate":
- Each row is checked for missing required fields
- Rows with missing required fields are marked as skipped
- Valid rows are uploaded to the system
- Skipped rows are stored in memory with details

### 2. Skipped Rows Information
For each skipped row, the system tracks:
- **Row Number**: The original row number in the Excel file (header is row 1)
- **Missing Fields**: List of required fields that are empty
- **Reason**: Human-readable explanation of why the row was skipped
- **Original Data**: All the data from the original row

### 3. Download Report
After upload:
- If rows were skipped, a yellow "📥 Download Skipped Rows" button appears
- Click the button to download an Excel file with all skipped rows
- The report includes:
  - Row Number
  - Missing Fields
  - Reason for skipping
  - All original row data (for reference)

### 4. Report File Format
**Filename**: `skipped_rows_report_YYYY-MM-DD.xlsx`

**Columns**:
| Column | Description |
|--------|-------------|
| Row Number | Original row number in source file |
| Missing Fields | Comma-separated list of required fields that are empty |
| Reason | Explanation of why the row was skipped |
| [Original Columns] | All columns from your original Excel file |

## Example

### Original Excel File
```
CatchNo | NodalCode | NRQuantity | ExamDate
--------|-----------|-----------|----------
123     | ABC       | 50        | 2024-01-15
456     | DEF       |           | 2024-01-16
789     | GHI       | 30        | 2024-01-17
```

### Upload Result
- Row 1 (CatchNo=123): ✅ Uploaded
- Row 2 (CatchNo=456): ❌ Skipped (NRQuantity is required)
- Row 3 (CatchNo=789): ✅ Uploaded

### Downloaded Report
```
Row Number | Missing Fields | Reason | CatchNo | NodalCode | NRQuantity | ExamDate
-----------|----------------|--------|---------|-----------|-----------|----------
3          | NRQuantity     | Missing required fields: NRQuantity | 456 | DEF | | 2024-01-16
```

## User Feedback

### Toast Notifications
1. **During Upload**: "⚠️ X rows skipped due to missing required fields"
2. **After Success**: "Validation successful! X rows uploaded, Y rows skipped."
3. **Download**: "Downloaded report with X skipped rows"

### Visual Indicators
- Yellow "Download Skipped Rows" button appears only if rows were skipped
- Button shows count of skipped rows: "📥 Download Skipped Rows (5)"

## Required Fields
Required fields are determined from your project configuration:
- Fields used in Envelope Making Criteria
- Fields used in Box Breaking Criteria
- Fields used in Duplicate Remove Fields
- Fields used in Sorting Box Report
- Fields used in Inner Bundling Criteria
- Fields used in Duplicate Criteria
- **NRQuantity** (always required)

## Workflow

1. **Upload File** → Select and map columns
2. **Click "Upload and Validate"** → System validates rows
3. **View Results** → Toast shows upload status
4. **Download Report** (if needed) → Click yellow button to get skipped rows
5. **Fix Data** → Use report to identify and fix issues
6. **Re-upload** → Upload corrected file

## Benefits

✅ **Transparency**: Know exactly which rows failed and why
✅ **Efficiency**: Quickly identify data issues
✅ **Traceability**: Keep records of failed imports
✅ **Debugging**: Use original data to fix issues
✅ **Batch Processing**: Handle large files with confidence

## Technical Details

### State Management
- `skippedRows`: Array storing all skipped row details
- Updated in `getMappedData()` function
- Cleared when form is reset

### Functions
- `getMappedData()`: Validates rows and populates `skippedRows`
- `downloadSkippedRowsReport()`: Generates and downloads Excel file
- `handleUpload()`: Shows feedback about skipped rows

### Excel Generation
- Uses XLSX library (already in project)
- Auto-adjusts column widths for readability
- Includes timestamp in filename
- Preserves all original data

## Code Location
- **File**: `src/ToolsProcessing/DataImport.jsx`
- **State**: Line ~45 (`const [skippedRows, setSkippedRows]`)
- **Validation**: `getMappedData()` function (~416)
- **Download**: `downloadSkippedRowsReport()` function (~625)
- **UI Button**: Field Mapping section (~835)
