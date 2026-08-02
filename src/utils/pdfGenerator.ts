import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import QRCode from 'qrcode';
import { BorrowRequest, ComponentItem, SystemOverviewStats } from '../types';
import { formatDateOnly, formatTimestamp } from './timestamp';

/**
 * Helper to format the purpose field for PDF cell rendering
 */
const formatPurposeForPdf = (purposeStr: string): string => {
  if (!purposeStr) return 'N/A';
  if (purposeStr.includes('Project Purpose:') || purposeStr.includes('From Date:')) {
    const lines = purposeStr.split('\n');
    const formattedLines: string[] = [];
    lines.forEach((line) => {
      const idx = line.indexOf(':');
      if (idx !== -1) {
        const label = line.substring(0, idx).trim();
        const value = line.substring(idx + 1).trim();
        formattedLines.push(label + ':');
        formattedLines.push(value);
      } else {
        formattedLines.push(line);
      }
    });
    return formattedLines.join('\n');
  }
  return purposeStr;
};

/**
 * Generate Student Component Issuance Receipt PDF
 */
export const generateStudentReceiptPdf = async (request: BorrowRequest, download: boolean = true) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const primaryNavy: [number, number, number] = [11, 31, 74]; // #0B1F4A
  const gold = [249, 180, 45]; // #F9B42D (Orange/Gold)

  // Header Background navy bar (taller to include branding and titles)
  doc.setFillColor(primaryNavy[0], primaryNavy[1], primaryNavy[2]);
  doc.rect(0, 0, 210, 40, 'F');

  // Programmatic Vector Logo (Circular branding element with gear teeth, left circuit nodes, and "Ei")
  const logoCenterX = 18;
  const logoCenterY = 18;
  const logoRadius = 4.8;

  // 1. Draw outer grey gear ring & teeth
  doc.setDrawColor(156, 163, 175); // Grey/silver
  doc.setLineWidth(0.6);
  doc.circle(logoCenterX, logoCenterY, logoRadius + 0.9, 'D');
  for (let i = 0; i < 12; i++) {
    const angle = (i * Math.PI) / 6;
    const x1 = logoCenterX + Math.cos(angle) * (logoRadius + 0.9);
    const y1 = logoCenterY + Math.sin(angle) * (logoRadius + 0.9);
    const x2 = logoCenterX + Math.cos(angle) * (logoRadius + 1.6);
    const y2 = logoCenterY + Math.sin(angle) * (logoRadius + 1.6);
    doc.line(x1, y1, x2, y2);
  }

  // 2. Draw bright blue circuit lines and nodes extending to the left
  doc.setDrawColor(0, 163, 224); // Bright blue
  doc.setFillColor(0, 163, 224);
  doc.setLineWidth(0.5);
  // Angles pointing left (around Math.PI)
  const circuitAngles = [
    Math.PI - 0.55, 
    Math.PI - 0.28, 
    Math.PI, 
    Math.PI + 0.28, 
    Math.PI + 0.55
  ];
  circuitAngles.forEach((angle, index) => {
    const length = (index % 2 === 0) ? 3.4 : 4.4;
    const x1 = logoCenterX + Math.cos(angle) * (logoRadius);
    const y1 = logoCenterY + Math.sin(angle) * (logoRadius);
    const x2 = logoCenterX + Math.cos(angle) * (logoRadius + length);
    const y2 = logoCenterY + Math.sin(angle) * (logoRadius + length);
    doc.line(x1, y1, x2, y2);
    doc.circle(x2, y2, 0.55, 'F');
  });

  // 3. Draw central blue circle
  doc.setFillColor(0, 163, 224);
  doc.circle(logoCenterX, logoCenterY, logoRadius, 'F');

  // 4. Draw stylized white text "Ei" inside the central circle
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8.0);
  doc.setFont('helvetica', 'bold');
  doc.text('Ei', logoCenterX - 1.5, logoCenterY + 1.1);

  // Title and Institution Branding
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(24);
  doc.setTextColor(0, 163, 224); // Bright blue
  doc.text('EI', 30, 17);
  doc.setTextColor(255, 255, 255); // White
  doc.text('HUB', 39, 17);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(0, 163, 224); // Bright blue
  doc.text('INNOVATION SOI', 30, 24);

  // Institutional Subtitle details inside header
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text('KGISL Institute of Technology, Saravanampatti, Coimbatore', 14, 32);
  doc.text('Department of Electronics & Communication Engineering', 14, 37);

  // Golden separator line (vertical)
  doc.setDrawColor(gold[0], gold[1], gold[2]);
  doc.setLineWidth(1.0);
  doc.line(128, 5, 128, 28);

  // Right-aligned golden title
  doc.setTextColor(gold[0], gold[1], gold[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('OFFICIAL COMPONENT', 135, 16);
  doc.text('TRANSACTION RECEIPT', 135, 23);

  // Watermark: None (Removed to match reference image)

  // Receipt Summary Card Box (Light grey-blue tint with soft border)
  doc.setDrawColor(226, 232, 240); // Soft gray border (#E2E8F0)
  doc.setFillColor(248, 250, 252); // Light background (#F8FAFC)
  doc.roundedRect(14, 45, 182, 40, 4, 4, 'FD');

  // Vertical card column divider
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.line(105, 48, 105, 82);

  // Left Column Document Circular Icon
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(29, 78, 216); // Blue outline
  doc.setLineWidth(0.5);
  doc.circle(24, 65, 5.5, 'FD');
  // Draw simplified document icon inside
  doc.setDrawColor(29, 78, 216);
  doc.setLineWidth(0.4);
  doc.rect(21.8, 62.2, 4.4, 5.6, 'D'); // Document border
  doc.line(23, 64.2, 25, 64.2);
  doc.line(23, 65.7, 25, 65.7);
  doc.line(23, 67.2, 24.5, 67.2);

  // Right Column User Circular Icon
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(29, 78, 216);
  doc.setLineWidth(0.5);
  doc.circle(114, 65, 5.5, 'FD');
  // Draw simplified user icon inside
  doc.circle(114, 62.5, 1.8, 'D'); // Head
  doc.ellipse(114, 67.5, 3.0, 1.6, 'D'); // Body/Shoulders

  // Card Content Values and Labels
  doc.setFontSize(9.5);

  // Left Column fields
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105); // Slate 500
  doc.text('Transaction Reference:', 35, 52);
  doc.text('Issue Date:', 35, 59);
  doc.text('Approved Date:', 35, 66);
  doc.text('Expected Return Date:', 35, 73);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42); // Slate 900
  doc.text(request.request_code.toUpperCase(), 75, 52);

  doc.setFont('helvetica', 'bold');
  doc.text(formatDateOnly(request.requested_at), 75, 59);
  doc.text(request.approved_at ? formatDateOnly(request.approved_at) : 'N/A', 75, 66);
  doc.text(formatDateOnly(request.expected_return_at), 75, 73);

  // Right Column fields
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105); // Slate 500
  doc.text('Student Name:', 125, 52);
  doc.text('Register No:', 125, 59);
  doc.text('Department:', 125, 66);
  doc.text('Issued By:', 125, 73);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42); // Slate 900
  doc.text(request.student_name || 'N/A', 152, 52);

  doc.setFont('helvetica', 'bold');
  doc.text(request.student_register_no || 'N/A', 152, 59);
  doc.text('ECE', 152, 66);
  doc.text(request.approved_by_name || 'Faculty User 01', 152, 73);

  // Items Table
  const formattedPurpose = formatPurposeForPdf(request.purpose);

  autoTable(doc, {
    startY: 92,
    head: [['Item SKU', 'Component Name', 'Category', 'Qty', 'Purpose', 'Status']],
    body: [
      [
        request.component_id,
        request.component_name || 'Arduino Uno R3',
        request.component_category || 'Microcontrollers',
        request.quantity.toString(),
        formattedPurpose,
        request.status.toUpperCase(),
      ],
    ],
    margin: { left: 14, right: 14 },
    theme: 'grid',
    styles: {
      fontSize: 8.5,
      cellPadding: 4,
      valign: 'middle',
      textColor: [30, 41, 59], // Slate 800
      lineColor: [226, 232, 240], // Soft gray border
      lineWidth: 0.4,
    },
    headStyles: {
      fillColor: primaryNavy, // Navy header (#0B1F4A)
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center',
      valign: 'middle',
      fontSize: 9,
      cellPadding: 5,
    },
    columnStyles: {
      0: { cellWidth: 32, halign: 'left' },   // SKU
      1: { cellWidth: 34, halign: 'left' },   // Name
      2: { cellWidth: 22, halign: 'center' }, // Category
      3: { cellWidth: 10, halign: 'center' }, // Qty
      4: { cellWidth: 58, halign: 'left' },   // Purpose
      5: { cellWidth: 26, halign: 'center' }, // Status (Rendered as badge in didDrawCell)
    },
    didDrawCell: (data) => {
      if (data.column.index === 5 && data.cell.section === 'body') {
        const status = data.cell.raw as string;
        const { x, y, width, height } = data.cell;
        
        doc.setFillColor(255, 255, 255);
        doc.rect(x + 0.5, y + 0.5, width - 1, height - 1, 'F');
        
        let bg = [220, 252, 231];
        let textCol = [22, 101, 52];
        if (status === 'RETURNED') {
          bg = [219, 234, 254];
          textCol = [30, 64, 175];
        } else if (status === 'PENDING') {
          bg = [254, 243, 199];
          textCol = [146, 64, 14];
        } else if (status === 'REJECTED' || status === 'OVERDUE') {
          bg = [254, 226, 226];
          textCol = [153, 27, 27];
        }
        
        doc.setFillColor(bg[0], bg[1], bg[2]);
        doc.roundedRect(x + 2, y + 1.5, width - 4, height - 3, 1.5, 1.5, 'F');
        
        doc.setTextColor(textCol[0], textCol[1], textCol[2]);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.text(status, x + width / 2, y + height / 2 + 0.8, { align: 'center' });
      }
    }
  });

  // Verification & Signatures section
  const finalY = (doc as any).lastAutoTable.finalY || 125;

  // Draw QR Code
  try {
    const qrDataUrl = await QRCode.toDataURL(`${window.location.origin}/verify-receipt/${request.request_code}`, {
      width: 120,
      margin: 1,
      color: {
        dark: '#0B132B',
        light: '#FFFFFF'
      }
    });
    doc.addImage(qrDataUrl, 'PNG', 14, finalY + 12, 32, 32);
  } catch (err) {
    console.error('Error generating QR code:', err);
  }

  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139); // Slate 500
  doc.setFont('helvetica', 'normal');
  doc.text('Scan QR code to verify validity', 14, finalY + 48);
  doc.text('on the EI HUB Laboratory Portal.', 14, finalY + 52);

  // Footer line & Equal margins
  doc.setDrawColor(11, 31, 74); // Navy line
  doc.setLineWidth(0.8);
  doc.line(14, 280, 196, 280);

  doc.setFontSize(8.5);
  doc.setTextColor(148, 163, 184); // Slate 400
  doc.text('Generated via EI HUB Enterprise SaaS Platform', 14, 285);
  doc.text('Page 1 of 1', 196, 285, { align: 'right' });

  // Save PDF
  if (download) {
    doc.save(`EIHUB_Student_Receipt_${request.request_code}.pdf`);
  }
  return doc;
};

/**
 * Generate Comprehensive Enterprise Inventory & Usage Report PDF
 */
export const generateEnterpriseReportPdf = (
  reportType: string,
  components: ComponentItem[],
  requests: BorrowRequest[],
  stats: SystemOverviewStats,
  download: boolean = true
) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const primaryNavy: [number, number, number] = [11, 31, 74]; // #0B1F4A
  const gold = [249, 180, 45]; // #F9B42D

  // Header Banner
  doc.setFillColor(primaryNavy[0], primaryNavy[1], primaryNavy[2]);
  doc.rect(0, 0, 210, 36, 'F');

  // Programmatic Vector Logo (Circular branding element with gear teeth, left circuit nodes, and "Ei")
  const logoCenterX = 18;
  const logoCenterY = 16;
  const logoRadius = 4.8;

  // 1. Draw outer grey gear ring & teeth
  doc.setDrawColor(156, 163, 175); // Grey/silver
  doc.setLineWidth(0.6);
  doc.circle(logoCenterX, logoCenterY, logoRadius + 0.9, 'D');
  for (let i = 0; i < 12; i++) {
    const angle = (i * Math.PI) / 6;
    const x1 = logoCenterX + Math.cos(angle) * (logoRadius + 0.9);
    const y1 = logoCenterY + Math.sin(angle) * (logoRadius + 0.9);
    const x2 = logoCenterX + Math.cos(angle) * (logoRadius + 1.6);
    const y2 = logoCenterY + Math.sin(angle) * (logoRadius + 1.6);
    doc.line(x1, y1, x2, y2);
  }

  // 2. Draw bright blue circuit lines and nodes extending to the left
  doc.setDrawColor(0, 163, 224); // Bright blue
  doc.setFillColor(0, 163, 224);
  doc.setLineWidth(0.5);
  // Angles pointing left (around Math.PI)
  const circuitAngles = [
    Math.PI - 0.55, 
    Math.PI - 0.28, 
    Math.PI, 
    Math.PI + 0.28, 
    Math.PI + 0.55
  ];
  circuitAngles.forEach((angle, index) => {
    const length = (index % 2 === 0) ? 3.4 : 4.4;
    const x1 = logoCenterX + Math.cos(angle) * (logoRadius);
    const y1 = logoCenterY + Math.sin(angle) * (logoRadius);
    const x2 = logoCenterX + Math.cos(angle) * (logoRadius + length);
    const y2 = logoCenterY + Math.sin(angle) * (logoRadius + length);
    doc.line(x1, y1, x2, y2);
    doc.circle(x2, y2, 0.55, 'F');
  });

  // 3. Draw central blue circle
  doc.setFillColor(0, 163, 224);
  doc.circle(logoCenterX, logoCenterY, logoRadius, 'F');

  // 4. Draw stylized white text "Ei" inside the central circle
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8.0);
  doc.setFont('helvetica', 'bold');
  doc.text('Ei', logoCenterX - 1.5, logoCenterY + 1.1);

  // Title and Institution Branding
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(24);
  doc.setTextColor(0, 163, 224); // Bright blue
  doc.text('EI', 30, 15);
  doc.setTextColor(255, 255, 255); // White
  doc.text('HUB', 39, 15);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(0, 163, 224); // Bright blue
  doc.text('INNOVATION SOI', 30, 22);

  // Institutional Subtitle details inside header
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text('KGISL Institute of Technology - Innovation SOI', 14, 29);
  doc.text('COMPREHENSIVE INVENTORY & ANALYTICS REPORT', 14, 34);

  // White separator line (vertical)
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(0.5);
  doc.line(128, 5, 128, 31);

  // Right-aligned report header details
  // Circular Analytics/Chart Icon
  const chartCenterX = 138;
  const chartCenterY = 18;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(0, 163, 224);
  doc.setLineWidth(0.6);
  doc.circle(chartCenterX, chartCenterY, 5.5, 'FD');
  // Draw bar chart inside circle
  doc.setFillColor(0, 163, 224);
  doc.rect(chartCenterX - 2.5, chartCenterY + 0.5, 1.2, -2.5, 'F');
  doc.rect(chartCenterX - 0.6, chartCenterY + 0.5, 1.2, -4.0, 'F');
  doc.rect(chartCenterX + 1.3, chartCenterY + 0.5, 1.2, -1.8, 'F');

  // Report details text
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(0, 163, 224); // Bright blue label
  doc.text('REPORT TYPE:', 148, 14);
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(255, 255, 255); // White value
  doc.text(reportType.toUpperCase(), 148, 20);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(0, 163, 224); // Bright blue label
  doc.text('Generated On:', 148, 27);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(255, 255, 255); // White date/time value
  const dateStr = new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date());
  const timeStr = new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  }).format(new Date());
  doc.text(`${dateStr}  |  ${timeStr}`, 148, 32);

  // KPI Summary Metric Cards (4 Cards Grid - 1 Row)
  const startY = 44;
  const cardW = 43;
  const cardH = 16;

  const kpis = [
    { title: 'Total Categories', val: '6', color: [107, 70, 193], type: 'categories' }, // Purple
    { title: 'Total Components', val: stats.totalComponents.toString(), color: [29, 78, 216], type: 'components' }, // Blue
    { title: 'Available Stock', val: stats.availableStock.toString(), color: [16, 185, 129], type: 'available' }, // Green
    { title: 'Borrowed Stock', val: stats.borrowedStock.toString(), color: [249, 115, 22], type: 'borrowed' }, // Orange
  ];

  kpis.forEach((kpi, idx) => {
    const x = 14 + idx * (cardW + 3.3);
    const y = startY;

    // Draw Card Background and Border
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(226, 232, 240); // Soft grey border (#E2E8F0)
    doc.setLineWidth(0.4);
    doc.roundedRect(x, y, cardW, cardH, 2.5, 2.5, 'FD');

    // Draw KPI circular frame
    const circleX = x + 7;
    const circleY = y + 8;
    doc.setFillColor(kpi.color[0], kpi.color[1], kpi.color[2]);
    doc.circle(circleX, circleY, 4.0, 'F');

    // Draw icons inside the circle
    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(0.4);
    if (kpi.type === 'categories') {
      doc.rect(circleX - 1.5, circleY - 1.5, 1.0, 1.0, 'D');
      doc.rect(circleX + 0.5, circleY - 1.5, 1.0, 1.0, 'D');
      doc.rect(circleX - 1.5, circleY + 0.5, 1.0, 1.0, 'D');
      doc.rect(circleX + 0.5, circleY + 0.5, 1.0, 1.0, 'D');
    } else if (kpi.type === 'components') {
      doc.line(circleX, circleY - 1.8, circleX + 1.6, circleY - 0.8);
      doc.line(circleX, circleY - 1.8, circleX - 1.6, circleY - 0.8);
      doc.line(circleX + 1.6, circleY - 0.8, circleX + 1.6, circleY + 1.0);
      doc.line(circleX - 1.6, circleY - 0.8, circleX - 1.6, circleY + 1.0);
      doc.line(circleX, circleY + 1.8, circleX + 1.6, circleY + 1.0);
      doc.line(circleX, circleY + 1.8, circleX - 1.6, circleY + 1.0);
      doc.line(circleX, circleY - 1.8, circleX, circleY + 1.8);
    } else if (kpi.type === 'available') {
      doc.line(circleX - 1.4, circleY - 0.2, circleX - 0.4, circleY + 0.8);
      doc.line(circleX - 0.4, circleY + 0.8, circleX + 1.4, circleY - 1.0);
    } else if (kpi.type === 'borrowed') {
      doc.line(circleX - 1.8, circleY - 1.4, circleX - 1.2, circleY - 1.4);
      doc.line(circleX - 1.2, circleY - 1.4, circleX - 0.7, circleY + 0.5);
      doc.line(circleX - 0.7, circleY + 0.5, circleX + 1.3, circleY + 0.5);
      doc.line(circleX + 1.3, circleY + 0.5, circleX + 1.8, circleY - 1.0);
      doc.circle(circleX - 0.5, circleY + 1.4, 0.4, 'F');
      doc.circle(circleX + 1.0, circleY + 1.4, 0.4, 'F');
    }

    // Text labels and values
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.0);
    doc.setTextColor(71, 85, 105); // Slate 500
    doc.text(kpi.title.toUpperCase(), x + 13, y + 6.5);

    doc.setTextColor(15, 23, 42); // Slate 900
    doc.setFontSize(11);
    doc.text(kpi.val, x + 13, y + 12.5);
  });

  // Table Section 1: Inventory Summary
  doc.setFillColor(49, 46, 129); // Deep Indigo
  doc.roundedRect(14, 65, 5, 5, 1, 1, 'F');
  // Simple lines inside section icon
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(0.3);
  doc.line(15.2, 66.5, 17.8, 66.5);
  doc.line(15.2, 67.5, 17.8, 67.5);
  doc.line(15.2, 68.5, 17.8, 68.5);

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(10.5);
  doc.setFont('helvetica', 'bold');
  doc.text('Laboratory Component Stock Breakdown', 21, 69);

  const inventoryRows = components.map((c) => [
    c.sku,
    c.name,
    c.category,
    c.total_stock.toString(),
    c.available_stock.toString(),
    c.borrowed_stock.toString(),
    c.cabinet && c.shelf ? `${c.cabinet}, ${c.shelf}` : 'Lab A, Shelf 1',
  ]);

  autoTable(doc, {
    startY: 72,
    head: [['SKU', 'Component Name', 'Category', 'Total', 'Available', 'Borrowed', 'Location']],
    body: inventoryRows,
    margin: { left: 14, right: 14 },
    theme: 'grid',
    styles: {
      fontSize: 7.5,
      cellPadding: 2.5,
      valign: 'middle',
      textColor: [30, 41, 59], // Slate 800
      lineColor: [226, 232, 240], // Soft border
      lineWidth: 0.4,
    },
    headStyles: {
      fillColor: primaryNavy, // Dark navy (#0B1F4A)
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center',
      valign: 'middle',
      fontSize: 8,
      cellPadding: 3,
    },
    columnStyles: {
      0: { cellWidth: 26, halign: 'left' },   // SKU
      1: { cellWidth: 52, halign: 'left' },   // Name
      2: { cellWidth: 24, halign: 'left' },   // Category
      3: { cellWidth: 14, halign: 'center' }, // Total
      4: { cellWidth: 16, halign: 'center' }, // Available
      5: { cellWidth: 16, halign: 'center' }, // Borrowed
      6: { cellWidth: 34, halign: 'left' },   // Location
    }
  });

  // Table Section 2: Recent Borrowing Activity
  const secondY = (doc as any).lastAutoTable.finalY + 9;
  
  doc.setFillColor(30, 64, 175); // Blue 800
  doc.roundedRect(14, secondY - 3.5, 5, 5, 1, 1, 'F');
  // Simple document shape inside blue icon
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(0.3);
  doc.rect(15.2, secondY - 2.5, 2.6, 3.2, 'D');

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('Recent Active Borrowings & Requests', 21, secondY);

  const requestRows = requests.slice(0, 5).map((r) => [
    r.request_code,
    r.student_name || 'Student',
    r.component_name || 'Component',
    r.quantity.toString(),
    r.purpose ? (r.purpose.includes('Project Purpose:') ? r.purpose.split('\n')[0].replace('Project Purpose:', '').trim() : r.purpose) : 'Project Purpose',
    r.status.toUpperCase(),
  ]);

  autoTable(doc, {
    startY: secondY + 2.5,
    head: [['Req ID', 'Student', 'Component', 'Qty', 'Purpose', 'Status']],
    body: requestRows,
    margin: { left: 14, right: 14 },
    theme: 'grid',
    styles: {
      fontSize: 7.5,
      cellPadding: 2.5,
      valign: 'middle',
      textColor: [30, 41, 59], // Slate 800
      lineColor: [226, 232, 240], // Soft border
      lineWidth: 0.4,
    },
    headStyles: {
      fillColor: [67, 56, 202], // Indigo header
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center',
      valign: 'middle',
      fontSize: 8,
      cellPadding: 3,
    },
    columnStyles: {
      0: { cellWidth: 28, halign: 'left' },   // Req ID
      1: { cellWidth: 24, halign: 'left' },   // Student Name
      2: { cellWidth: 52, halign: 'left' },   // Component
      3: { cellWidth: 14, halign: 'center' }, // Qty
      4: { cellWidth: 38, halign: 'left' },   // Purpose
      5: { cellWidth: 26, halign: 'center' }, // Status
    },
    didDrawCell: (data) => {
      if (data.column.index === 5 && data.cell.section === 'body') {
        const status = data.cell.raw as string;
        const { x, y, width, height } = data.cell;
        
        doc.setFillColor(255, 255, 255);
        doc.rect(x + 0.5, y + 0.5, width - 1, height - 1, 'F');
        
        let bg = [220, 252, 231];
        let textCol = [22, 101, 52];
        if (status === 'RETURNED') {
          bg = [219, 234, 254];
          textCol = [30, 64, 175];
        } else if (status === 'PENDING') {
          bg = [254, 243, 199];
          textCol = [146, 64, 14];
        } else if (status === 'REJECTED' || status === 'OVERDUE') {
          bg = [254, 226, 226];
          textCol = [153, 27, 27];
        }
        
        doc.setFillColor(bg[0], bg[1], bg[2]);
        doc.roundedRect(x + 1.5, y + 1.5, width - 3, height - 3, 1.5, 1.5, 'F');
        
        doc.setTextColor(textCol[0], textCol[1], textCol[2]);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.0);
        doc.text(status, x + width / 2, y + height / 2 + 0.8, { align: 'center' });
      }
    }
  });

  // institutional Signatures block drawn directly below Table 2 on Page 1
  const activeSigY = (doc as any).lastAutoTable.finalY + 12;

  // Draw 3 columns of signatures horizontally
  // Col 1: Prepared By
  doc.setFillColor(107, 70, 193); // Purple
  doc.circle(18.5, activeSigY + 5, 4.5, 'F');
  // Draw user icon inside circle
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(0.4);
  doc.circle(18.5, activeSigY + 3.8, 1.3, 'D'); // head
  doc.ellipse(18.5, activeSigY + 7.2, 2.2, 1.1, 'D'); // body
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Prepared By', 26, activeSigY + 4);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('(Lab Manager)', 26, activeSigY + 8);
  doc.text('Innovation SOI Laboratory', 14, activeSigY + 14);
  
  doc.setTextColor(71, 85, 105);
  doc.setFontSize(8);
  doc.text('Signature:', 14, activeSigY + 22);
  doc.line(30, activeSigY + 22, 68, activeSigY + 22);
  doc.text('Date:', 14, activeSigY + 28);
  doc.line(22, activeSigY + 28, 68, activeSigY + 28);

  // Col 2: Verified By
  doc.setFillColor(29, 78, 216); // Blue
  doc.circle(79.5, activeSigY + 5, 4.5, 'F');
  // Draw checkmark inside circle
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(0.5);
  doc.line(78.0, activeSigY + 5, 79.0, activeSigY + 6);
  doc.line(79.0, activeSigY + 6, 81.0, activeSigY + 3.5);
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Verified By', 87, activeSigY + 4);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('(Innovation SOI Head)', 87, activeSigY + 8);
  doc.text('Dept of ECE / EIE', 75, activeSigY + 14);
  
  doc.setTextColor(71, 85, 105);
  doc.setFontSize(8);
  doc.text('Signature:', 75, activeSigY + 22);
  doc.line(91, activeSigY + 22, 129, activeSigY + 22);
  doc.text('Date:', 75, activeSigY + 28);
  doc.line(83, activeSigY + 28, 129, activeSigY + 28);

  // Col 3: Approved By
  doc.setFillColor(16, 185, 129); // Green
  doc.circle(140.5, activeSigY + 5, 4.5, 'F');
  // Draw star/trophy inside circle
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(0.4);
  doc.circle(140.5, activeSigY + 4, 1.2, 'D');
  doc.line(140.5, activeSigY + 5.2, 140.5, activeSigY + 6.8);
  doc.line(139.0, activeSigY + 6.8, 142.0, activeSigY + 6.8);
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Approved By', 148, activeSigY + 4);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('(Principal / Director)', 148, activeSigY + 8);
  doc.text('KGISL Institute of Technology', 136, activeSigY + 14);
  
  doc.setTextColor(71, 85, 105);
  doc.setFontSize(8);
  doc.text('Signature:', 136, activeSigY + 22);
  doc.line(152, activeSigY + 22, 190, activeSigY + 22);
  doc.text('Date:', 136, activeSigY + 28);
  doc.line(144, activeSigY + 28, 190, activeSigY + 28);

  // Render 4th right-aligned authorized signature block
  const authSigX = 136;
  const authSigY = activeSigY + 36;
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Authorized Laboratory In-Charge Signature', authSigX, authSigY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Innovation SOI - KGISL Institute of Technology', authSigX, authSigY + 4);
  
  doc.setTextColor(71, 85, 105);
  doc.setFontSize(8);
  doc.text('Signature:', authSigX, authSigY + 11);
  doc.line(authSigX + 16, authSigY + 11, 196, authSigY + 11);
  doc.text('Date:', authSigX, authSigY + 17);
  doc.line(authSigX + 8, authSigY + 17, 196, authSigY + 17);

  // Footer & Page Numbers (Loop across all pages)
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    
    // Draw footer divider line
    doc.setDrawColor(primaryNavy[0], primaryNavy[1], primaryNavy[2]);
    doc.setLineWidth(1.0);
    doc.line(14, 281, 196, 281);
    
    // Draw mini EI HUB logo and tagline on left
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(0, 163, 224); // Blue
    doc.text('EI', 14, 286);
    doc.setTextColor(primaryNavy[0], primaryNavy[1], primaryNavy[2]); // Navy
    doc.text('HUB', 18, 286);
    
    doc.setFontSize(5.5);
    doc.setTextColor(100, 116, 139); // Slate 500
    doc.text('INNOVATE · INVENT · INSPIRE', 14, 290);

    // Page number in center
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(`EI HUB Enterprise Analytics Report   |   Page ${i} of ${pageCount}`, 65, 287);
    
    // Confidentiality on right
    doc.text('KGISL Institute of Technology   •   Confidential', 196, 287, { align: 'right' });
  }

  if (download) {
    const dateIso = new Date().toISOString().split('T')[0];
    doc.save(`EIHUB_Inventory_Report_${dateIso}.pdf`);
  }
  return doc;
};
