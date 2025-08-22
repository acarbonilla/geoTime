# PDF Download Feature for Request Lists

## Overview
This feature adds PDF download functionality to three main request list components in the GeoTime system:
- Leave Request List
- Change Schedule Request List  
- Overtime Request List

## Features
- **Professional PDF Design**: Each PDF follows a consistent design pattern with:
  - Blue header with "GEO TIME SYSTEM" branding
  - Clear section headers (Employee Information, Request Details, Status Information, Approver Comments)
  - Professional formatting and layout
  - Generation timestamp in footer

- **Individual Request PDFs**: Users can download PDFs for individual requests
- **Smart Filenames**: PDFs are automatically named with relevant information (e.g., `LeaveRequest_JohnDoe_2025-01-15.pdf`)

## Implementation Details

### PDF Generator Utility (`src/utils/pdfGenerator.js`)
The utility provides three main functions:
- `generateLeaveRequestPDF(request)` - Creates leave request PDFs
- `generateChangeScheduleRequestPDF(request)` - Creates change schedule request PDFs  
- `generateOvertimeRequestPDF(request)` - Creates overtime request PDFs
- `downloadPDF(doc, filename)` - Handles PDF download

### Components Updated
1. **LeaveRequestList.js**
   - Added PDF download button in Actions column
   - PDF includes: employee info, dates, duration, leave type, reason, status, approver comments

2. **ChangeScheduleRequestList.js**
   - Added PDF download button in Actions column
   - PDF includes: employee info, original vs requested schedule details, reason, status, approver comments

3. **OvertimeRequestsList.js**
   - Added PDF download button in Actions column
   - PDF includes: employee info, date, time range, reason, status, approver comments

## User Experience
- **PDF Button**: Blue "PDF" button with download icon appears in the Actions column for each request
- **One-Click Download**: Clicking the PDF button immediately generates and downloads the PDF
- **Error Handling**: If PDF generation fails, user receives a friendly error message
- **Consistent Design**: All three request types follow the same visual design pattern

## Technical Requirements
- **Dependencies**: Uses `jspdf` and `jspdf-autotable` (already installed)
- **Browser Support**: Works in all modern browsers that support PDF downloads
- **File Size**: Generated PDFs are optimized for reasonable file sizes

## PDF Layout Structure
```
┌─────────────────────────────────────┐
│           GEO TIME SYSTEM           │ ← Blue Header
├─────────────────────────────────────┤
│        [REQUEST TYPE] REPORT        │ ← Main Title
├─────────────────────────────────────┤
│ Employee Information:               │
│ • Name: [Employee Name]            │
│ • Date: [Request Details]          │
│ • [Other relevant info]            │
│                                     │
│ Request Details:                    │
│ • [Request-specific fields]         │
│                                     │
│ Status Information:                 │
│ • Status: [Approved/Pending/Rejected]│
│ • Approved Date: [Date if approved] │
│                                     │
│ Approver Comments:                  │
│ [Comments or "No comments"]         │
├─────────────────────────────────────┤
│ Generated on [Date] at [Time]      │ ← Footer
└─────────────────────────────────────┘
```

## Future Enhancements
- **Bulk PDF Download**: Option to download multiple requests as a single PDF
- **Customizable Templates**: Different PDF layouts for different use cases
- **Email Integration**: Direct email functionality for generated PDFs
- **Print Optimization**: Better formatting for printed versions

## Usage Example
1. Navigate to any of the three request list pages
2. Locate the request you want to download
3. Click the blue "PDF" button in the Actions column
4. PDF will automatically download with a descriptive filename
5. Open the PDF to view the professional report format

## Troubleshooting
- **PDF Won't Download**: Check browser download settings and ensure no popup blockers
- **PDF Generation Error**: Refresh the page and try again
- **Missing Data**: Some fields may show "-" if data is not available in the request

