import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import QRCode from 'qrcode';
import { BorrowRequest, ComponentItem, SystemOverviewStats } from '../types';
import { formatDateOnly, formatTimestamp } from './timestamp';

/**
 * Generate Student Component Issuance Receipt PDF
 */
export const generateStudentReceiptPdf = async (request: BorrowRequest, download: boolean = true) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const primaryNavy = [11, 19, 43]; // #0B132B
  const indigo = [67, 56, 202]; // #4338CA
  const gold = [212, 175, 55]; // #D4AF37

  // Header Background Gradient Bar
  doc.setFillColor(primaryNavy[0], primaryNavy[1], primaryNavy[2]);
  doc.rect(0, 0, 210, 32, 'F');

  // Title and Institution Branding
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('EI HUB | INNOVATION SOI', 14, 14);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('KGISL Institute of Technology, Saravanampatti, Coimbatore', 14, 20);
  doc.text('Department of Electronics & Communication Engineering', 14, 25);

  doc.setTextColor(gold[0], gold[1], gold[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('OFFICIAL COMPONENT TRANSACTION RECEIPT', 130, 20);

  // Watermark
  doc.setTextColor(240, 240, 245);
  doc.setFontSize(45);
  doc.setFont('helvetica', 'bold');
  doc.text('EI HUB VERIFIED', 30, 160, { angle: 35 });

  // Receipt Summary Card Box
  doc.setDrawColor(220, 225, 235);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, 40, 182, 38, 3, 3, 'FD');

  doc.setTextColor(primaryNavy[0], primaryNavy[1], primaryNavy[2]);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(`Transaction Reference: ${request.request_code}`, 20, 48);
  doc.setFont('helvetica', 'normal');
  doc.text(`Issue Date: ${formatDateOnly(request.requested_at)}`, 20, 54);
  doc.text(`Approved Date: ${request.approved_at ? formatDateOnly(request.approved_at) : 'N/A'}`, 20, 60);
  doc.text(`Expected Return Date: ${formatDateOnly(request.expected_return_at)}`, 20, 66);

  doc.setFont('helvetica', 'bold');
  doc.text(`Student Name: ${request.student_name}`, 110, 48);
  doc.setFont('helvetica', 'normal');
  doc.text(`Register No: ${request.student_register_no}`, 110, 54);
  doc.text(`Department: ECE`, 110, 60);
  doc.text(`Issued By: ${request.approved_by_name || 'Prof. Robert Chen'}`, 110, 66);

  // Items Table
  autoTable(doc, {
    startY: 85,
    head: [['Item SKU', 'Component Name', 'Category', 'Qty', 'Purpose', 'Status']],
    body: [
      [
        request.component_id,
        request.component_name || 'Arduino Uno R3',
        request.component_category || 'Microcontrollers',
        request.quantity.toString(),
        request.purpose,
        request.status.toUpperCase(),
      ],
    ],
    headStyles: {
      fillColor: [11, 19, 43],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'left',
    },
    styles: {
      fontSize: 9,
      cellPadding: 4,
    },
    alternateRowStyles: {
      fillColor: [245, 247, 250],
    },
  });

  // Verification & Signatures section
  const finalY = (doc as any).lastAutoTable.finalY || 120;

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
    doc.addImage(qrDataUrl, 'PNG', 14, finalY + 15, 28, 28);
  } catch (err) {
    console.error('Error generating QR code:', err);
  }

  doc.setFontSize(8);
  doc.setTextColor(100, 110, 130);
  doc.text('Scan QR code to verify validity', 14, finalY + 47);
  doc.text('on the EI HUB Laboratory Portal.', 14, finalY + 51);

  // Digital Signatures Box
  doc.setDrawColor(200, 200, 210);
  doc.line(110, finalY + 35, 190, finalY + 35);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(primaryNavy[0], primaryNavy[1], primaryNavy[2]);
  doc.text('Authorized Laboratory In-Charge Signature', 110, finalY + 40);
  doc.setFont('helvetica', 'normal');
  doc.text('Innovation SOI - KGISL Institute of Technology', 110, finalY + 45);

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(140, 140, 150);
  doc.text('Page 1 of 1', 180, 285);
  doc.text('Generated via EI HUB Enterprise SaaS Platform', 14, 285);

  // Save PDF
  if (download) {
    doc.save(`EI_HUB_Receipt_${request.request_code}.pdf`);
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

  const primaryNavy = [11, 19, 43];

  // Header Banner
  doc.setFillColor(primaryNavy[0], primaryNavy[1], primaryNavy[2]);
  doc.rect(0, 0, 210, 36, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('EI HUB', 14, 15);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('KGISL Institute of Technology - Innovation SOI', 14, 21);
  doc.text('COMPREHENSIVE INVENTORY & ANALYTICS REPORT', 14, 27);

  doc.setTextColor(212, 175, 55); // Gold
  doc.setFont('helvetica', 'bold');
  doc.text(`REPORT TYPE: ${reportType.toUpperCase()}`, 130, 21);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated On: ${formatTimestamp(new Date())}`, 130, 27);

  // KPI Summary Metric Cards (4 Cards Grid)
  const startY = 44;
  const cardW = 42;
  const cardH = 20;

  const kpis = [
    { title: 'Total Categories', val: '6' },
    { title: 'Total Components', val: stats.totalComponents.toString() },
    { title: 'Available Stock', val: stats.availableStock.toString() },
    { title: 'Borrowed Stock', val: stats.borrowedStock.toString() },
  ];

  kpis.forEach((kpi, idx) => {
    const x = 14 + idx * 47;
    doc.setFillColor(245, 247, 250);
    doc.setDrawColor(220, 225, 235);
    doc.roundedRect(x, startY, cardW, cardH, 2, 2, 'FD');

    doc.setTextColor(100, 110, 130);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text(kpi.title.toUpperCase(), x + 4, startY + 6);

    doc.setTextColor(primaryNavy[0], primaryNavy[1], primaryNavy[2]);
    doc.setFontSize(14);
    doc.text(kpi.val, x + 4, startY + 16);
  });

  // Table Section 1: Inventory Summary
  doc.setTextColor(primaryNavy[0], primaryNavy[1], primaryNavy[2]);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Laboratory Component Stock Breakdown', 14, 73);

  const inventoryRows = components.map((c) => [
    c.sku,
    c.name,
    c.category,
    c.total_stock.toString(),
    c.available_stock.toString(),
    c.borrowed_stock.toString(),
    `${c.cabinet}, ${c.shelf}`,
  ]);

  autoTable(doc, {
    startY: 78,
    head: [['SKU', 'Component Name', 'Category', 'Total', 'Available', 'Borrowed', 'Location']],
    body: inventoryRows,
    headStyles: {
      fillColor: [11, 19, 43],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    styles: { fontSize: 8, cellPadding: 3 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  });

  // Table Section 2: Recent Borrowing Activity
  const secondY = (doc as any).lastAutoTable.finalY + 8;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Recent Active Borrowings & Requests', 14, secondY);

  const requestRows = requests.slice(0, 5).map((r) => [
    r.request_code,
    r.student_name || 'Student',
    r.component_name || 'Component',
    r.quantity.toString(),
    r.purpose,
    r.status.toUpperCase(),
  ]);

  autoTable(doc, {
    startY: secondY + 4,
    head: [['Req ID', 'Student', 'Component', 'Qty', 'Purpose', 'Status']],
    body: requestRows,
    headStyles: {
      fillColor: [67, 56, 202],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    styles: { fontSize: 7.5, cellPadding: 2 },
  });

  // Institutional Signatures Section (Rendered on SAME PAGE directly under last table)
  const activeSigY = (doc as any).lastAutoTable.finalY + 16;

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(primaryNavy[0], primaryNavy[1], primaryNavy[2]);

  // Column 1: Prepared By
  doc.line(14, activeSigY, 68, activeSigY);
  doc.text('Prepared By (Lab Manager)', 14, activeSigY + 4);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 110, 130);
  doc.text('Innovation SOI Laboratory', 14, activeSigY + 8);

  // Column 2: Verified By
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(primaryNavy[0], primaryNavy[1], primaryNavy[2]);
  doc.line(80, activeSigY, 134, activeSigY);
  doc.text('Verified By (Innovation SOI Head)', 80, activeSigY + 4);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 110, 130);
  doc.text('Dept of ECE / EIE', 80, activeSigY + 8);

  // Column 3: Approved By
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(primaryNavy[0], primaryNavy[1], primaryNavy[2]);
  doc.line(146, activeSigY, 196, activeSigY);
  doc.text('Approved By (Principal / Director)', 146, activeSigY + 4);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 110, 130);
  doc.text('KGISL Institute of Technology', 146, activeSigY + 8);

  // Footer & Page Numbers
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(140, 140, 150);
    doc.text(`EI HUB Enterprise Analytics Report | Page ${i} of ${pageCount}`, 14, 287);
    doc.text('KGISL Institute of Technology - Confidential', 140, 287);
  }

  if (download) {
    doc.save(`EI_HUB_Report_${reportType.toLowerCase().replace(/\s+/g, '_')}.pdf`);
  }
  return doc;
};
