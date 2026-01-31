/**
 * Unified PDF Generation Service
 * 
 * Generates identical PDFs for both admin and portal user access paths.
 * Uses client-side generation for consistent output.
 */

interface PDFLine {
  productName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

interface PDFData {
  type: 'invoice' | 'bill';
  documentNumber: string;
  date: string;
  dueDate: string;
  partyName: string;
  partyAddress?: string;
  partyEmail?: string;
  partyPhone?: string;
  lines: PDFLine[];
  totalAmount: number;
  paidAmount: number;
  notes?: string;
}

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
};

const formatDate = (dateStr: string): string => {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

/**
 * Generate and download a PDF for invoice or bill
 */
export async function generateInvoicePDF(data: PDFData): Promise<void> {
  const isInvoice = data.type === 'invoice';
  const title = isInvoice ? 'INVOICE' : 'BILL';
  const partyLabel = isInvoice ? 'Bill To' : 'Vendor';
  
  // Build HTML content
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>${title} - ${data.documentNumber}</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          font-size: 12px;
          line-height: 1.5;
          color: #333;
          padding: 40px;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 40px;
          border-bottom: 2px solid #2563eb;
          padding-bottom: 20px;
        }
        .company-name {
          font-size: 24px;
          font-weight: bold;
          color: #2563eb;
        }
        .company-subtitle {
          font-size: 12px;
          color: #666;
        }
        .document-type {
          font-size: 28px;
          font-weight: bold;
          color: #333;
          text-align: right;
        }
        .document-number {
          font-size: 14px;
          color: #666;
          text-align: right;
        }
        .info-section {
          display: flex;
          justify-content: space-between;
          margin-bottom: 30px;
        }
        .info-box {
          width: 48%;
        }
        .info-label {
          font-size: 10px;
          text-transform: uppercase;
          color: #666;
          margin-bottom: 5px;
        }
        .info-value {
          font-weight: 600;
        }
        .info-detail {
          color: #666;
          font-size: 11px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 30px;
        }
        th {
          background-color: #f3f4f6;
          text-align: left;
          padding: 12px 8px;
          font-weight: 600;
          border-bottom: 2px solid #e5e7eb;
        }
        th.right {
          text-align: right;
        }
        td {
          padding: 12px 8px;
          border-bottom: 1px solid #e5e7eb;
        }
        td.right {
          text-align: right;
        }
        .totals-section {
          margin-left: auto;
          width: 300px;
        }
        .total-row {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px solid #e5e7eb;
        }
        .total-row.grand {
          font-weight: bold;
          font-size: 16px;
          color: #2563eb;
          border-bottom: 2px solid #2563eb;
        }
        .notes-section {
          margin-top: 30px;
          padding: 15px;
          background-color: #f9fafb;
          border-radius: 8px;
        }
        .notes-label {
          font-weight: 600;
          margin-bottom: 5px;
        }
        .footer {
          margin-top: 50px;
          text-align: center;
          color: #666;
          font-size: 10px;
        }
        @media print {
          body {
            padding: 20px;
          }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <div class="company-name">Shiv Furniture</div>
          <div class="company-subtitle">Premium Quality Furniture</div>
        </div>
        <div>
          <div class="document-type">${title}</div>
          <div class="document-number">${data.documentNumber}</div>
        </div>
      </div>
      
      <div class="info-section">
        <div class="info-box">
          <div class="info-label">${partyLabel}</div>
          <div class="info-value">${data.partyName}</div>
          ${data.partyAddress ? `<div class="info-detail">${data.partyAddress}</div>` : ''}
          ${data.partyEmail ? `<div class="info-detail">${data.partyEmail}</div>` : ''}
          ${data.partyPhone ? `<div class="info-detail">${data.partyPhone}</div>` : ''}
        </div>
        <div class="info-box">
          <div style="margin-bottom: 10px;">
            <div class="info-label">Date</div>
            <div class="info-value">${formatDate(data.date)}</div>
          </div>
          <div>
            <div class="info-label">Due Date</div>
            <div class="info-value">${formatDate(data.dueDate)}</div>
          </div>
        </div>
      </div>
      
      <table>
        <thead>
          <tr>
            <th style="width: 50%">Item</th>
            <th class="right">Qty</th>
            <th class="right">Unit Price</th>
            <th class="right">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${data.lines.map(line => `
            <tr>
              <td>${line.productName}</td>
              <td class="right">${line.quantity}</td>
              <td class="right">${formatCurrency(line.unitPrice)}</td>
              <td class="right">${formatCurrency(line.subtotal)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      
      <div class="totals-section">
        <div class="total-row">
          <span>Subtotal</span>
          <span>${formatCurrency(data.totalAmount)}</span>
        </div>
        <div class="total-row">
          <span>Paid</span>
          <span>${formatCurrency(data.paidAmount)}</span>
        </div>
        <div class="total-row grand">
          <span>Balance Due</span>
          <span>${formatCurrency(data.totalAmount - data.paidAmount)}</span>
        </div>
      </div>
      
      ${data.notes ? `
        <div class="notes-section">
          <div class="notes-label">Notes</div>
          <div>${data.notes}</div>
        </div>
      ` : ''}
      
      <div class="footer">
        <p>Thank you for your business!</p>
        <p>Generated on ${new Date().toLocaleDateString('en-IN')}</p>
      </div>
    </body>
    </html>
  `;
  
  // Create a new window for printing
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    throw new Error('Unable to open print window. Please check popup blocker settings.');
  }
  
  printWindow.document.write(htmlContent);
  printWindow.document.close();
  
  // Wait for content to load, then trigger print
  printWindow.onload = () => {
    printWindow.print();
    // Close after a delay to allow print dialog
    setTimeout(() => {
      printWindow.close();
    }, 1000);
  };
}