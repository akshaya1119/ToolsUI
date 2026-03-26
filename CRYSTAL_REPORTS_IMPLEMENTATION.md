# Crystal Reports Implementation Guide

## Overview
A new "Crystal Reports" tab has been added to the Masters section, allowing users to download Crystal Report (.rpt) based reports with a clean, user-friendly interface.

## Files Created

### 1. `ToolsUI/src/Masters/CrystalReports.jsx`
Main component for the Crystal Reports interface.

**Features:**
- Clean card-based layout
- Three dropdown selectors (Group, Report Type, Template)
- Download and Preview buttons
- Loading states and validation
- Success/error notifications

**State Management:**
- `groups`: List of available groups
- `templates`: List of templates based on selected report type
- `selectedGroup`: Currently selected group ID
- `selectedReportType`: Currently selected report type
- `selectedTemplate`: Currently selected template ID
- Loading states for async operations

**Validation:**
- All required fields must be selected before download/preview
- Buttons are disabled during operations
- User-friendly error messages

### 2. `ToolsUI/src/Masters/hooks/reportApi.js`
API service layer for report-related operations.

**Functions:**

#### `getGroups()`
Fetches all available groups from `/api/groups`
- Returns: Array of `{ groupId, groupName }`

#### `getTemplates(type)`
Fetches templates based on report type from `/api/templates?type={type}`
- Parameters: `type` - Report type string
- Returns: Array of `{ id, name }`

#### `downloadReport({ groupId, type, template })`
Downloads report file from `/api/report/download`
- Parameters:
  - `groupId`: Selected group ID (required)
  - `type`: Report type (required)
  - `template`: Template ID (optional)
- Handles file download with proper filename extraction
- Uses blob response type for binary data

#### `previewReport({ groupId, type, template })`
Opens report preview in new tab from `/api/report/preview`
- Parameters: Same as downloadReport
- Opens in new browser tab
- Handles popup blockers

### 3. `ToolsUI/src/Masters/Master.jsx` (Updated)
Added new tab to the Masters section.

**Changes:**
- Imported `CrystalReports` component
- Imported `FileTextOutlined` icon
- Added new tab item with key '8'

## Component Structure

```
CrystalReports
├── Card (Container)
│   ├── Select (Group Dropdown) *required
│   ├── Select (Report Type Dropdown) *required
│   ├── Select (Template Dropdown) *optional
│   └── Button Group
│       ├── Preview Button
│       └── Download Button
```

## Report Types

The following report types are available:
1. **Challan Center Wise** (`challan_center_wise`)
2. **Box Breaking** (`box_breaking`)
3. **Summary Statement** (`summary_statement`)

## API Endpoints

### Expected Backend Endpoints:

#### 1. Get Groups
```
GET /api/groups
Response: [
  { "groupId": 1, "groupName": "Group A" },
  { "groupId": 2, "groupName": "Group B" }
]
```

#### 2. Get Templates
```
GET /api/templates?type={reportType}
Response: [
  { "id": 1, "name": "Template 1" },
  { "id": 2, "name": "Template 2" }
]
```

#### 3. Download Report
```
GET /api/report/download?groupId={id}&type={type}&template={id}
Response: Binary file (PDF/RPT)
Headers: Content-Disposition: attachment; filename="report.pdf"
```

#### 4. Preview Report
```
GET /api/report/preview?groupId={id}&type={type}&template={id}
Response: Binary file (PDF) for inline display
```

## User Flow

1. User navigates to Masters → Crystal Reports tab
2. User selects a group from dropdown (auto-loads on mount)
3. User selects a report type
4. Templates load automatically based on report type
5. User optionally selects a template
6. User clicks "Preview Report" or "Download Report"
7. System validates selections
8. System shows loading spinner
9. On success: File downloads or opens in new tab
10. On error: Error notification displayed

## Validation Rules

- **Group**: Required - Must be selected before download/preview
- **Report Type**: Required - Must be selected before download/preview
- **Template**: Optional - Auto-selects if only one available
- Buttons disabled during loading states
- Warning message shown if required fields missing

## UI/UX Features

### Loading States
- Spinner shown while fetching groups
- Spinner shown while fetching templates
- Button loading state during download/preview
- Disabled buttons prevent multiple clicks

### Notifications
- Success message after successful download
- Error notification with details on failure
- Warning for missing required fields
- Info message for popup blockers

### Responsive Design
- Card centered with max-width 800px
- Full-width dropdowns
- Proper spacing and padding
- Mobile-friendly layout

## Styling

Uses Ant Design components with consistent styling:
- Primary color: `#1890ff`
- Card padding: `24px`
- Space between elements: `large`
- Icons: Ant Design icons
- Required field indicator: Red asterisk

## Error Handling

### Frontend
- Try-catch blocks for all API calls
- User-friendly error messages
- Console logging for debugging
- Graceful fallbacks

### Network Errors
- Displays error notification
- Logs error details to console
- Maintains UI state (doesn't crash)

## Testing Checklist

- [ ] Groups load on component mount
- [ ] Report type selection works
- [ ] Templates load based on report type
- [ ] Template auto-selects when only one available
- [ ] Download button disabled without selections
- [ ] Preview button disabled without selections
- [ ] Download triggers file download
- [ ] Preview opens in new tab
- [ ] Loading states display correctly
- [ ] Error notifications show on API failure
- [ ] Success notifications show on success
- [ ] Validation messages display correctly
- [ ] Popup blocker handling works

## Integration Steps

1. Ensure backend endpoints are implemented
2. Update API base URL in `.env` file
3. Test API endpoints with Postman/curl
4. Verify authentication token is passed
5. Test file download functionality
6. Test preview functionality
7. Verify error handling

## Dependencies

All dependencies are already included in the project:
- `react`: Core React library
- `antd`: Ant Design components
- `axios`: HTTP client (via API wrapper)
- `@ant-design/icons`: Icon library

## Future Enhancements

Potential improvements:
- Add date range filters
- Add export format selection (PDF/Excel/RPT)
- Add report scheduling
- Add report history
- Add favorite reports
- Add bulk download
- Add email report functionality
- Add report parameters customization

## Troubleshooting

### Groups not loading
- Check API endpoint `/api/groups`
- Verify authentication token
- Check network tab in browser DevTools

### Templates not loading
- Verify report type is selected
- Check API endpoint `/api/templates`
- Verify query parameter format

### Download not working
- Check browser download settings
- Verify Content-Disposition header
- Check file MIME type
- Verify blob handling

### Preview not opening
- Check popup blocker settings
- Verify new tab permissions
- Check browser console for errors

## Code Quality

- Clean, readable code
- Proper error handling
- Consistent naming conventions
- Comprehensive comments
- Reusable API functions
- Separation of concerns
- React best practices
- Ant Design guidelines

## Maintenance

To modify report types:
1. Update `reportTypes` array in `CrystalReports.jsx`
2. Ensure backend supports new types
3. Update documentation

To add new fields:
1. Add state variable
2. Add dropdown component
3. Update validation logic
4. Update API call parameters

## Support

For issues or questions:
1. Check browser console for errors
2. Verify API endpoints are working
3. Check network requests in DevTools
4. Review error messages
5. Consult this documentation
