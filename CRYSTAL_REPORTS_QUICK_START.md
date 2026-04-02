# Crystal Reports - Quick Start Guide

## What Was Created

A new tab "Crystal Reports" in the Masters section that allows downloading Crystal Report files.

## Files

1. **ToolsUI/src/Masters/CrystalReports.jsx** - Main component
2. **ToolsUI/src/Masters/hooks/reportApi.js** - API functions
3. **ToolsUI/src/Masters/Master.jsx** - Updated to include new tab

## How to Use

1. Navigate to: **Masters → Crystal Reports**
2. Select a **Group** (required)
3. Select a **Report Type** (required)
4. Select a **Template** (optional)
5. Click **Download Report** or **Preview Report**

## Backend Requirements

Your backend needs to implement these endpoints:

### 1. Get Groups
```javascript
GET /api/groups

Response:
[
  { "groupId": 1, "groupName": "Group A" },
  { "groupId": 2, "groupName": "Group B" }
]
```

### 2. Get Templates
```javascript
GET /api/templates?type=challan_center_wise

Response:
[
  { "id": 1, "name": "Template 1" },
  { "id": 2, "name": "Template 2" }
]
```

### 3. Download Report
```javascript
GET /api/report/download?groupId=1&type=box_breaking&template=1

Response: Binary file (PDF/RPT)
Headers: 
  Content-Type: application/pdf (or application/octet-stream)
  Content-Disposition: attachment; filename="report.pdf"
```

### 4. Preview Report
```javascript
GET /api/report/preview?groupId=1&type=summary_statement

Response: Binary file (PDF)
Headers:
  Content-Type: application/pdf
  Content-Disposition: inline; filename="report.pdf"
```

## C# Backend Example (ASP.NET Core)

```csharp
// Controllers/ReportsController.cs

[ApiController]
[Route("api")]
public class ReportsController : ControllerBase
{
    [HttpGet("groups")]
    public IActionResult GetGroups()
    {
        var groups = _dbContext.Groups
            .Select(g => new { groupId = g.Id, groupName = g.Name })
            .ToList();
        return Ok(groups);
    }

    [HttpGet("templates")]
    public IActionResult GetTemplates([FromQuery] string type)
    {
        var templates = _dbContext.Templates
            .Where(t => t.Type == type)
            .Select(t => new { id = t.Id, name = t.Name })
            .ToList();
        return Ok(templates);
    }

    [HttpGet("report/download")]
    public IActionResult DownloadReport(
        [FromQuery] int groupId, 
        [FromQuery] string type, 
        [FromQuery] int? template)
    {
        // Generate your Crystal Report here
        byte[] reportBytes = GenerateCrystalReport(groupId, type, template);
        
        string fileName = $"report_{type}_{DateTime.Now:yyyyMMdd}.pdf";
        
        return File(reportBytes, "application/pdf", fileName);
    }

    [HttpGet("report/preview")]
    public IActionResult PreviewReport(
        [FromQuery] int groupId, 
        [FromQuery] string type, 
        [FromQuery] int? template)
    {
        byte[] reportBytes = GenerateCrystalReport(groupId, type, template);
        
        return File(reportBytes, "application/pdf");
    }

    private byte[] GenerateCrystalReport(int groupId, string type, int? templateId)
    {
        // Your Crystal Reports logic here
        // Example:
        var reportDocument = new ReportDocument();
        reportDocument.Load(GetReportPath(type, templateId));
        
        // Set parameters
        reportDocument.SetParameterValue("GroupId", groupId);
        
        // Export to PDF
        using (var stream = reportDocument.ExportToStream(ExportFormatType.PortableDocFormat))
        {
            using (var memoryStream = new MemoryStream())
            {
                stream.CopyTo(memoryStream);
                return memoryStream.ToArray();
            }
        }
    }
}
```

## Testing the Component

### 1. Test with Mock Data (Development)

Update `reportApi.js` temporarily:

```javascript
// Mock data for testing
export const getGroups = async () => {
  return [
    { groupId: 1, groupName: "Group A" },
    { groupId: 2, groupName: "Group B" },
    { groupId: 3, groupName: "Group C" }
  ];
};

export const getTemplates = async (type) => {
  return [
    { id: 1, name: "Standard Template" },
    { id: 2, name: "Detailed Template" }
  ];
};
```

### 2. Test API Endpoints

```bash
# Test groups endpoint
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5000/api/groups

# Test templates endpoint
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5000/api/templates?type=box_breaking

# Test download endpoint
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5000/api/report/download?groupId=1&type=box_breaking \
  --output report.pdf
```

## Customization

### Add New Report Type

In `CrystalReports.jsx`, update the `reportTypes` array:

```javascript
const reportTypes = [
  { value: 'challan_center_wise', label: 'Challan Center Wise' },
  { value: 'box_breaking', label: 'Box Breaking' },
  { value: 'summary_statement', label: 'Summary Statement' },
  { value: 'your_new_type', label: 'Your New Report' }, // Add this
];
```

### Change API Endpoints

In `reportApi.js`, update the endpoint paths:

```javascript
// Change from /api/groups to /api/v1/groups
export const getGroups = async () => {
  const response = await API.get('/api/v1/groups');
  return response.data;
};
```

### Add Additional Filters

Add new state and dropdown in `CrystalReports.jsx`:

```javascript
const [selectedDate, setSelectedDate] = useState(null);

// In the JSX
<DatePicker 
  value={selectedDate}
  onChange={setSelectedDate}
  style={{ width: '100%' }}
/>

// Update download function
const handleDownload = async () => {
  await downloadReport({
    groupId: selectedGroup,
    type: selectedReportType,
    template: selectedTemplate,
    date: selectedDate // Add new parameter
  });
};
```

## Common Issues

### Issue: Groups not loading
**Solution:** Check if `/api/groups` endpoint exists and returns correct format

### Issue: Download not working
**Solution:** Verify backend returns proper Content-Disposition header

### Issue: Preview opens blank page
**Solution:** Ensure backend returns PDF with correct Content-Type

### Issue: CORS errors
**Solution:** Configure CORS in backend to allow your frontend origin

## Environment Setup

Make sure your `.env` file has the correct API URL:

```env
VITE_API_URL=http://localhost:5000
```

## Component Props (if needed)

Currently, the component doesn't accept props, but you can extend it:

```javascript
// In Master.jsx
<CrystalReports 
  defaultGroup={1} 
  onDownloadComplete={(filename) => console.log('Downloaded:', filename)}
/>

// In CrystalReports.jsx
const CrystalReports = ({ defaultGroup, onDownloadComplete }) => {
  // Use props...
};
```

## Keyboard Shortcuts (Future Enhancement)

You could add keyboard shortcuts:

```javascript
useEffect(() => {
  const handleKeyPress = (e) => {
    if (e.ctrlKey && e.key === 'd') {
      e.preventDefault();
      handleDownload();
    }
  };
  
  window.addEventListener('keydown', handleKeyPress);
  return () => window.removeEventListener('keydown', handleKeyPress);
}, [selectedGroup, selectedReportType]);
```

## Performance Tips

1. **Memoize expensive computations:**
```javascript
const filteredGroups = useMemo(() => 
  groups.filter(g => g.active), 
  [groups]
);
```

2. **Debounce search if added:**
```javascript
const debouncedSearch = useDebounce(searchTerm, 500);
```

3. **Cache API responses:**
```javascript
const [groupsCache, setGroupsCache] = useState(null);

useEffect(() => {
  if (groupsCache) {
    setGroups(groupsCache);
  } else {
    fetchGroups().then(data => {
      setGroups(data);
      setGroupsCache(data);
    });
  }
}, []);
```

## Next Steps

1. ✅ Component created and integrated
2. ⏳ Implement backend endpoints
3. ⏳ Test with real data
4. ⏳ Deploy to production
5. ⏳ Gather user feedback
6. ⏳ Add enhancements based on feedback

## Support

If you need help:
1. Check the browser console for errors
2. Use React DevTools to inspect component state
3. Check Network tab for API call details
4. Review the full documentation in `CRYSTAL_REPORTS_IMPLEMENTATION.md`
