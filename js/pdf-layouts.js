/**
 * PDF Layout Templates Module
 * Handles different PDF layout styles and formatting
 */

import { pdfCore } from './pdf-core.js';
import { CONFIG } from './config.js';

export class PDFLayouts {
  constructor(core) {
    this.core = core || pdfCore;
  }

  async addHeader(userDetails) {
    const doc = this.core.getDocument();
    const pageWidth = this.core.pageWidth;
    const margins = this.core.margins;

    // Company logo area (left side)
    this.core.addText('SEIMA', margins.left, 25, {
      fontSize: 20,
      fontStyle: 'bold'
    });

    // Title (center)
    this.core.addText('Product Selection Report', pageWidth / 2, 25, {
      fontSize: 16,
      fontStyle: 'bold',
      align: 'center'
    });

    // Date (right side)
    const currentDate = new Date().toLocaleDateString('en-AU');
    this.core.addText(currentDate, pageWidth - margins.right, 25, {
      fontSize: 10,
      align: 'right'
    });

    // Horizontal line under header
    this.core.addLine(margins.left, 30, pageWidth - margins.right, 30, '#cccccc');

    this.core.setCurrentY(35);
  }

  async addCustomerInfo(userDetails) {
    const doc = this.core.getDocument();
    const margins = this.core.margins;
    const contentWidth = this.core.getContentWidth();

    // Customer Information Section
    this.core.addText('Customer Information', margins.left, this.core.getCurrentY(), {
      fontSize: 14,
      fontStyle: 'bold'
    });

    this.core.moveY(8);

    // Create two columns for customer info
    const leftCol = margins.left;
    const rightCol = margins.left + (contentWidth / 2);
    let currentY = this.core.getCurrentY();

    // Left column
    if (userDetails.name && userDetails.name.trim()) {
      this.core.addText(`Customer: ${userDetails.name.trim()}`, leftCol, currentY, {
        fontSize: 10
      });
      currentY += 5;
    }

    if (userDetails.project && userDetails.project.trim()) {
      this.core.addText(`Project: ${userDetails.project.trim()}`, leftCol, currentY, {
        fontSize: 10
      });
      currentY += 5;
    }

    // Right column (reset Y for right column)
    currentY = this.core.getCurrentY();

    if (userDetails.email && userDetails.email.trim()) {
      this.core.addText(`Email: ${userDetails.email.trim()}`, rightCol, currentY, {
        fontSize: 10
      });
      currentY += 5;
    }

    if (userDetails.phone && userDetails.phone.trim()) {
      this.core.addText(`Phone: ${userDetails.phone.trim()}`, rightCol, currentY, {
        fontSize: 10
      });
      currentY += 5;
    }

    if (userDetails.address && userDetails.address.trim()) {
      this.core.setCurrentY(currentY + 2);
      const addressHeight = this.core.addText(`Address: ${userDetails.address.trim()}`, leftCol, this.core.getCurrentY(), {
        fontSize: 10,
        maxWidth: contentWidth - 20
      });
      this.core.moveY(addressHeight);
    }

    this.core.moveY(10);

    // Line separator
    this.core.addLine(margins.left, this.core.getCurrentY(),
      this.core.pageWidth - margins.right, this.core.getCurrentY(),
      '#eeeeee');
    this.core.moveY(5);
  }

  async addSelectionSummary(selectedProducts) {
    const margins = this.core.margins;

    // Summary section
    this.core.addText('Selection Summary', margins.left, this.core.getCurrentY(), {
      fontSize: 14,
      fontStyle: 'bold'
    });

    this.core.moveY(8);

    // Calculate totals
    const totalProducts = selectedProducts.length;
    const rooms = new Set(selectedProducts.map(item => item.room).filter(Boolean));
    const totalRooms = rooms.size || 1;

    let totalValue = 0;
    selectedProducts.forEach(item => {
      const price = parseFloat((item.product?.RRP_EX || '0').toString().replace(/[^0-9.]/g, '')) || 0;
      const quantity = item.quantity || 1;
      totalValue += price * quantity;
    });

    // Summary info
    this.core.addText(`Total Products: ${totalProducts}`, margins.left, this.core.getCurrentY(), {
      fontSize: 10
    });
    this.core.moveY(5);

    this.core.addText(`Total Rooms: ${totalRooms}`, margins.left, this.core.getCurrentY(), {
      fontSize: 10
    });
    this.core.moveY(5);

    if (totalValue > 0) {
      this.core.addText(`Estimated Total Value: $${totalValue.toFixed(2)} (inc GST)`, margins.left, this.core.getCurrentY(), {
        fontSize: 10,
        fontStyle: 'bold'
      });
      this.core.moveY(5);
    }

    this.core.moveY(10);

    // Line separator
    this.core.addLine(margins.left, this.core.getCurrentY(),
      this.core.pageWidth - margins.right, this.core.getCurrentY(),
      '#eeeeee');
    this.core.moveY(10);
  }

  async addProductTableHeader() {
    const doc = this.core.getDocument();
    const margins = this.core.margins;
    const contentWidth = this.core.getContentWidth();

    // Table header
    this.core.addText('Product Details', margins.left, this.core.getCurrentY(), {
      fontSize: 14,
      fontStyle: 'bold'
    });

    this.core.moveY(8);

    // Table column headers
    const headerY = this.core.getCurrentY();
    const colWidths = {
      image: 25,
      code: 35,
      description: 70,
      price: 25,
      qty: 15,
      room: 30
    };

    let currentX = margins.left;

    // Header background
    this.core.addRect(margins.left, headerY - 2, contentWidth, 8, 'F', '#f5f5f5');

    // Column headers
    this.core.addText('Image', currentX + 2, headerY + 3, {
      fontSize: 9,
      fontStyle: 'bold'
    });
    currentX += colWidths.image;

    this.core.addText('Code', currentX + 2, headerY + 3, {
      fontSize: 9,
      fontStyle: 'bold'
    });
    currentX += colWidths.code;

    this.core.addText('Description', currentX + 2, headerY + 3, {
      fontSize: 9,
      fontStyle: 'bold'
    });
    currentX += colWidths.description;

    this.core.addText('Price', currentX + 2, headerY + 3, {
      fontSize: 9,
      fontStyle: 'bold'
    });
    currentX += colWidths.price;

    this.core.addText('Qty', currentX + 2, headerY + 3, {
      fontSize: 9,
      fontStyle: 'bold'
    });
    currentX += colWidths.qty;

    this.core.addText('Room', currentX + 2, headerY + 3, {
      fontSize: 9,
      fontStyle: 'bold'
    });

    this.core.moveY(10);

    return colWidths;
  }

  async addProductRow(item, colWidths, isEven = false) {
    const doc = this.core.getDocument();
    const margins = this.core.margins;
    const rowHeight = 20;

    // Check if we need a new page
    this.core.checkPageSpace(rowHeight + 5);

    const startY = this.core.getCurrentY();
    let currentX = margins.left;

    // Row background for alternating colors
    if (isEven) {
      this.core.addRect(margins.left, startY - 1, this.core.getContentWidth(), rowHeight + 2, 'F', '#fafafa');
    }

    // Product image
    if (item.product?.Image_URL && this.core.isValidUrl(item.product.Image_URL)) {
      try {
        await this.core.addImage(item.product.Image_URL, currentX + 2, startY, 20, 15);
      } catch (error) {
        console.warn('Failed to add product image:', error);
      }
    }
    currentX += colWidths.image;

    // Product code
    const code = this.core.formatText(item.product?.OrderCode || '', 15);
    this.core.addText(code, currentX + 2, startY + 5, {
      fontSize: 8
    });
    currentX += colWidths.code;

    // Description
    const description = this.core.formatText(item.product?.Description || '', 45);
    this.core.addText(description, currentX + 2, startY + 5, {
      fontSize: 8,
      maxWidth: colWidths.description - 4
    });
    currentX += colWidths.description;

    // Price
    const price = this.core.formatPrice(item.product?.RRP_EX);
    this.core.addText(price, currentX + 2, startY + 5, {
      fontSize: 8
    });
    currentX += colWidths.price;

    // Quantity
    this.core.addText((item.quantity || 1).toString(), currentX + 2, startY + 5, {
      fontSize: 8
    });
    currentX += colWidths.qty;

    // Room
    const room = this.core.formatText(item.room || '', 15);
    this.core.addText(room, currentX + 2, startY + 5, {
      fontSize: 8
    });

    // Add notes if present
    if (item.notes) {
      const notesY = startY + 10;
      this.core.addText(`Notes: ${this.core.formatText(item.notes, 60)}`, margins.left + 2, notesY, {
        fontSize: 7,
        fontStyle: 'italic'
      });
    }

    this.core.moveY(rowHeight);
  }

  async addFooter(userDetails) {
    const doc = this.core.getDocument();
    const margins = this.core.margins;
    const pageWidth = this.core.pageWidth;
    const pageHeight = this.core.pageHeight;

    // Footer line
    const footerY = pageHeight - 20;
    this.core.addLine(margins.left, footerY, pageWidth - margins.right, footerY, '#cccccc');

    // Footer text
    this.core.addText('Generated by Seima Product Scanner', margins.left, footerY + 5, {
      fontSize: 8,
      fontStyle: 'italic'
    });

    this.core.addText('www.seima.com.au', pageWidth - margins.right, footerY + 5, {
      fontSize: 8,
      fontStyle: 'italic',
      align: 'right'
    });

    // Page number
    const pageNumber = doc.internal.getNumberOfPages();
    this.core.addText(`Page ${pageNumber}`, pageWidth / 2, footerY + 5, {
      fontSize: 8,
      align: 'center'
    });
  }

  async addQRSection(selectedProducts) {
    const margins = this.core.margins;

    // Check if we need a new page
    this.core.checkPageSpace(40);

    this.core.moveY(10);

    this.core.addText('Quick Access Links', margins.left, this.core.getCurrentY(), {
      fontSize: 12,
      fontStyle: 'bold'
    });

    this.core.moveY(8);

    // Add website links for products
    const uniqueProducts = selectedProducts.filter(item =>
      item.product?.Website_URL && this.core.isValidUrl(item.product.Website_URL)
    ).slice(0, 5); // Limit to first 5 for space

    uniqueProducts.forEach((item, index) => {
      const linkText = `${item.product.OrderCode}: ${item.product.Website_URL}`;
      this.core.addText(this.core.formatText(linkText, 80), margins.left + 5, this.core.getCurrentY(), {
        fontSize: 8
      });
      this.core.moveY(4);
    });

    if (uniqueProducts.length === 0) {
      this.core.addText('Visit www.seima.com.au for more product information', margins.left + 5, this.core.getCurrentY(), {
        fontSize: 8,
        fontStyle: 'italic'
      });
      this.core.moveY(4);
    }
  }
}

// Global instance
export const pdfLayouts = new PDFLayouts();
