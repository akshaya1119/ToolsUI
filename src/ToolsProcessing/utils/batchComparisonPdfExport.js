import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { categorizeComparisonRecords, formatChangeValueForExcel } from './batchComparisonExcelExport';

/**
 * Main export function to generate and download the PDF report with heading-wise tab records
 */
export const exportBatchComparisonPDF = ({
  rawItems = [],
  comparedBatch = null,
  lotNo = null,
  projectName = ""
}) => {
  const categorized = categorizeComparisonRecords(rawItems);

  // Extract non-unique and catch-level fields from dataset
  const uniqueFields = new Set();
  const nonUniqueFields = new Set();
  const catchLevelFields = new Set();

  rawItems.forEach(item => {
    (item.changes || []).forEach(change => {
      if (change.isConsistentCatchLevelChange) {
        catchLevelFields.add(change.field);
      } else if (change.isUniqueField) {
        uniqueFields.add(change.field);
      } else {
        nonUniqueFields.add(change.field);
      }
    });
  });

  const sortedNonUnique = Array.from(nonUniqueFields).sort((a, b) => a === 'Difference' ? 1 : b === 'Difference' ? -1 : 0);
  const sortedCatchLevel = Array.from(catchLevelFields).sort((a, b) => a === 'Difference' ? 1 : b === 'Difference' ? -1 : 0);

  const displayFieldsToShow = sortedNonUnique.length > 0
    ? sortedNonUnique
    : ["NRQuantity", "CenterCode", "NodalCode", "Difference"];

  const catchLevelDisplayFields = sortedCatchLevel.length > 0
    ? sortedCatchLevel
    : ["SubjectName", "ExamDate"];

  // Tab definitions matching UI
  const tabSections = [
    {
      name: "All Changes",
      data: categorized.allChangesData,
      type: "standard"
    },
    {
      name: "Catch-Level Changes",
      data: categorized.catchLevelData,
      type: "catchLevel"
    },
    {
      name: "Added",
      data: categorized.addedData,
      type: "standard"
    },
    {
      name: "Removed",
      data: categorized.removedData,
      type: "standard"
    },
    {
      name: "Centre Qty Changed",
      data: categorized.centreQtyData,
      type: "standard"
    },
    {
      name: "Nodal Change",
      data: categorized.nodalData,
      type: "standard"
    },
    {
      name: "Center Code Changed",
      data: categorized.centerCodeData,
      type: "standard"
    }
  ];

  // Filter out tabs with 0 records
  const sectionsToExport = tabSections.filter(({ data }) => data && data.length > 0);

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'pt',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;

  // Title Header
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(31, 65, 114);
  doc.text('Changed NR Upload - Batch Comparison Report', 30, 36);

  // Subtitle metadata
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);

  const lotText = lotNo && lotNo !== 0 ? `Lot: ${lotNo}` : 'All Lots';
  const batchText = `Compared Batch: Batch ${comparedBatch || 'Selected'} (vs Batch 1)`;
  const generatedText = `Generated on: ${new Date().toLocaleString()}`;

  doc.text(`${batchText}   |   ${lotText}   |   ${generatedText}`, 30, 52);

  // Divider line
  doc.setDrawColor(220, 224, 230);
  doc.setLineWidth(1);
  doc.line(30, 60, pageWidth - 30, 60);

  let currentY = 75;

  if (sectionsToExport.length === 0) {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(140, 140, 140);
    doc.text('No changes found between the compared batches.', 30, currentY + 20);
  } else {
    sectionsToExport.forEach((section, index) => {
      const { name, data, type } = section;

      // Check if we need a new page for heading
      if (currentY > pageHeight - 110) {
        doc.addPage();
        currentY = 40;
      }

      // Section Heading
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 41, 59);
      doc.text(`${index + 1}. ${name} (${data.length} ${data.length === 1 ? 'record' : 'records'})`, 30, currentY);

      // Underline under section heading
      doc.setDrawColor(22, 119, 255);
      doc.setLineWidth(1.5);
      doc.line(30, currentY + 4, 30 + 180, currentY + 4);

      currentY += 12;

      // Build headers and rows
      let headers = [];
      let rows = [];

      if (type === 'catchLevel') {
        const fields = catchLevelDisplayFields.filter(f => f !== 'Record');
        headers = [
          "Catch No",
          "Centers Affected",
          "Centers List",
          "Status",
          ...fields,
          "Recommendation"
        ];

        rows = data.map(item => {
          const recommendation = item.catchLevelRecommendation
            || item.originalItem?.catchLevelRecommendation
            || (item.changes && Object.values(item.changes).filter(c => c.isConsistentCatchLevelChange).length > 0
              ? "Update " + Object.values(item.changes).filter(c => c.isConsistentCatchLevelChange).map(c => (c.field || '').replace(/([a-z])([A-Z])/g, '$1 $2')).join(' and ')
              : item.originalItem?.recommendation || "—");

          return [
            item.catchNo || "—",
            item.centerCount ? `${item.centerCount} centers` : "—",
            (item.centers && item.centers.length > 0) ? item.centers.join(", ") : "—",
            item.status || "Catch-Level Change",
            ...fields.map(field => {
              const change = item.changes?.[field];
              return formatChangeValueForExcel(change, field);
            }),
            recommendation
          ];
        });
      } else {
        const fields = displayFieldsToShow.filter(f => f !== 'Record');
        headers = [
          "Catch No",
          "Centre Code",
          "Status",
          ...fields,
          "Recommendation"
        ];

        rows = data.map(item => {
          let centreCodeValue = item.centerCode || "—";
          const centerChange = item.changes?.CenterCode || item.changes?.centerCode;
          if (centerChange && centerChange.previousValue && centerChange.newValue) {
            centreCodeValue = `- ${centerChange.previousValue} / + ${centerChange.newValue}`;
          }

          return [
            item.catchNo || "—",
            centreCodeValue,
            item.status || "—",
            ...fields.map(field => {
              const change = item.changes?.[field];
              return formatChangeValueForExcel(change, field);
            }),
            item.originalItem?.recommendation || "—"
          ];
        });
      }

      autoTable(doc, {
        startY: currentY + 4,
        head: [headers],
        body: rows,
        theme: 'grid',
        headStyles: {
          fillColor: [31, 65, 114],
          textColor: [255, 255, 255],
          fontSize: 8,
          fontStyle: 'bold',
          halign: 'center',
          valign: 'middle'
        },
        bodyStyles: {
          fontSize: 7.5,
          textColor: [35, 35, 35],
          valign: 'middle'
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252]
        },
        styles: {
          cellPadding: 4,
          overflow: 'linebreak'
        },
        margin: { left: 30, right: 30, bottom: 40 },
        willDrawCell: (data) => {
          if (data.section === 'body') {
            const text = data.cell.raw;
            if (typeof text === 'string') {
              if (text.startsWith('Enhanced Qty:') || text.includes('- ') || text.includes('+ ')) {
                // Clear the text array strings so autoTable doesn't draw them, but keep the array length to maintain row height
                if (Array.isArray(data.cell.text)) {
                  data.cell.text = data.cell.text.map(() => '');
                } else {
                  data.cell.text = '';
                }
              }
            }
          }
        },
        didDrawCell: (data) => {
          if (data.section === 'body') {
            const text = data.cell.raw;
            if (typeof text === 'string') {
              if (text.startsWith('Enhanced Qty:') || text.includes('- ') || text.includes('+ ')) {
                const doc = data.doc;
                const padLeft = data.cell.padding('left') || 4;
                const padRight = data.cell.padding('right') || 4;
                const padTop = data.cell.padding('top') || 4;
                let x = data.cell.x + padLeft;
                let y = data.cell.y + padTop + 7; // approximate baseline

                // Important: tell jspdf which font to use before calculating text width!
                doc.setFont(data.cell.styles.font, data.cell.styles.fontStyle);
                doc.setFontSize(7.5);

                const drawBadge = (str, bg, fg) => {
                  const tWidth = doc.getTextWidth(str);
                  const bWidth = tWidth + 8;
                  
                  if (x + bWidth > data.cell.x + data.cell.width - padRight) {
                    x = data.cell.x + padLeft;
                    y += 12;
                  }
                  
                  doc.setFillColor(...bg);
                  doc.rect(x, y - 7.5, bWidth, 11, 'F');
                  doc.setTextColor(...fg);
                  doc.text(str, x + 4, y);
                  x += bWidth + 4;
                };

                const drawText = (str, fg) => {
                  const tWidth = doc.getTextWidth(str);
                  
                  if (x + tWidth > data.cell.x + data.cell.width - padRight) {
                    x = data.cell.x + padLeft;
                    y += 12;
                  }
                  
                  doc.setTextColor(...fg);
                  doc.text(str, x, y);
                  x += tWidth + 4;
                };

                if (text.startsWith('Enhanced Qty:')) {
                  const parts = text.split('\u00A0\u00A0\u00A0|\u00A0\u00A0\u00A0');
                  if (parts.length >= 3) {
                    drawBadge(parts[0], [255, 242, 240], [207, 19, 34]);
                    drawBadge(parts[1], [246, 255, 237], [39, 78, 10]);
                    
                    const stat = parts[2];
                    if (stat.includes('Not Fulfilled')) {
                      drawText(stat, [207, 19, 34]);
                    } else {
                      drawText(stat, [56, 158, 13]);
                    }
                  } else {
                    drawText(text, [35, 35, 35]);
                  }
                } else {
                  const parts = text.split('\u00A0\u00A0\u00A0/\u00A0\u00A0\u00A0');
                  parts.forEach(p => {
                    if (p.startsWith('- ')) {
                      drawBadge(p, [255, 242, 240], [207, 19, 34]);
                    } else if (p.startsWith('+ ')) {
                      drawBadge(p, [246, 255, 237], [39, 78, 10]);
                    } else {
                      drawText(p, [35, 35, 35]);
                    }
                  });
                }
              }
            }
          }
        }
      });

      currentY = (doc.lastAutoTable?.finalY || currentY) + 24;
    });
  }

  // Add Page Numbers and Footer
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(140, 140, 140);

    // Left footer
    doc.text(
      `Changed NR Comparison Report | Batch ${comparedBatch || 'Comparison'}`,
      30,
      pageHeight - 16
    );

    // Right footer
    doc.text(
      `Page ${i} of ${totalPages}`,
      pageWidth - 30,
      pageHeight - 16,
      { align: 'right' }
    );
  }

  const dateStr = new Date().toISOString().slice(0, 10);
  const lotStr = lotNo && lotNo !== 0 ? `_Lot${lotNo}` : "";
  const batchStr = comparedBatch ? `_Batch${comparedBatch}` : "";
  const filename = `Changed_NR_Comparison${batchStr}${lotStr}_${dateStr}.pdf`;

  doc.save(filename);
};
