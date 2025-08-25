/**
 * Unified PDF Generator Module
 * Orchestrates PDF creation using modular components
 */

import { pdfCore } from './pdf-core.js';
import { pdfLayouts } from './pdf-layouts.js';
import { CONFIG } from './config.js';
import { StorageManager } from './storage.js';

export class UnifiedPDFGenerator {
  constructor() {
    this.core = pdfCore;
    this.layouts = pdfLayouts;
    this.isInitialized = false;
  }

  async init() {
    try {
      await this.core.init();
      this.isInitialized = true;
      console.log('✅ Unified PDF Generator initialized');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize PDF Generator:', error);
      return false;
    }
  }

  async generatePDF(userDetails) {
    try {
      if (!this.isInitialized) {
        await this.init();
      }

      // Get selected products
      const selectedProducts = this.getSelectedProducts();
      if (!selectedProducts.length) {
        throw new Error('No products selected');
      }

      console.log(`📄 Generating PDF for ${selectedProducts.length} products...`);

      // Create new document
      this.core.createDocument();

      // Add document sections
      await this.layouts.addHeader(userDetails);
      await this.layouts.addCustomerInfo(userDetails);
      await this.layouts.addSelectionSummary(selectedProducts);

      // Add product table
      const colWidths = await this.layouts.addProductTableHeader();

      // Add product rows
      for (let i = 0; i < selectedProducts.length; i++) {
        const item = selectedProducts[i];
        const isEven = i % 2 === 0;
        await this.layouts.addProductRow(item, colWidths, isEven, userDetails);
      }

      // Add quick access section
      await this.layouts.addQRSection(selectedProducts);

      // Add footer
      await this.layouts.addFooter(userDetails);

      // Generate the PDF blob
      const pdfBlob = await this.core.finalize();

      console.log('✅ PDF generated successfully');
      return pdfBlob;

    } catch (error) {
      console.error('❌ PDF generation failed:', error);
      throw error;
    }
  }

  async generateCSV(userDetails) {
    try {
      const selectedProducts = this.getSelectedProducts();
      if (!selectedProducts.length) {
        throw new Error('No products selected');
      }

      console.log(`📊 Generating CSV for ${selectedProducts.length} products...`);

      const csvLines = [];

      // CSV Header - maintaining exact format as required
      csvLines.push('"Code","Description","Quantity","Price ea ex GST","Price Total ex GST","Notes","Room","Image URL","Diagram URL","Datasheet URL","Website URL"');

      // Product rows
      selectedProducts.forEach(item => {
        const code = this.cleanForCSV(item.product?.OrderCode || '');
        const desc = this.cleanForCSV(item.product?.Description || '');
        const qty = item.quantity || 1;
        const priceEa = this.cleanForCSV(item.product?.RRP_EX || '');
        const priceTotal = this.calculateTotalPrice(priceEa, qty);
        const notes = this.cleanForCSV(item.notes || '');
        const room = this.cleanForCSV(item.room || '');
        const imageUrl = this.cleanForCSV(item.product?.Image_URL || '');
        const diagramUrl = this.cleanForCSV(item.product?.Diagram_URL || '');
        const datasheetUrl = this.cleanForCSV(item.product?.Datasheet_URL || '');
        const websiteUrl = this.cleanForCSV(item.product?.Website_URL || '');

        csvLines.push(`"${code}","${desc}","${qty}","${priceEa}","${priceTotal}","${notes}","${room}","${imageUrl}","${diagramUrl}","${datasheetUrl}","${websiteUrl}"`);
      });

      const csvContent = csvLines.join('\n');
      const csvBlob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });

      console.log('✅ CSV generated successfully');
      return csvBlob;

    } catch (error) {
      console.error('❌ CSV generation failed:', error);
      throw error;
    }
  }

  async generateBothFiles(userDetails) {
    try {
      const [pdfBlob, csvBlob] = await Promise.all([
        this.generatePDF(userDetails),
        this.generateCSV(userDetails)
      ]);

      return { pdfBlob, csvBlob };
    } catch (error) {
      console.error('❌ File generation failed:', error);
      throw error;
    }
  }

  getSelectedProducts() {
    // Get products from both possible storage locations
    const storedSelection = JSON.parse(localStorage.getItem('selection') || '[]');
    const selectedProducts = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.SELECTED_PRODUCTS) || '[]');

    // Use the newer format if available
    if (selectedProducts.length > 0) {
      return selectedProducts;
    }

    // Convert old format to new format
    return storedSelection.map(item => ({
      product: item,
      room: item.Room || '',
      notes: item.Notes || '',
      quantity: item.Quantity || 1
    }));
  }

  calculateTotalPrice(priceEa, quantity) {
    const price = parseFloat(priceEa.toString().replace(/[^0-9.]/g, '')) || 0;
    const total = price * (quantity || 1);
    return total > 0 ? total.toFixed(2) : '';
  }

  cleanForCSV(value) {
    if (!value) {return '';}
    return value.toString().replace(/"/g, '""').replace(/[\r\n]/g, ' ');
  }

  // Utility methods for backward compatibility
  async generateQuotePDF(userDetails) {
    return await this.generatePDF(userDetails);
  }

  async generateReportPDF(userDetails) {
    return await this.generatePDF(userDetails);
  }

  generateFileName(userDetails, extension) {
    const now = new Date();
    const dd = String(now.getDate()).padStart(2, '0');
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const yy = String(now.getFullYear()).slice(-2);
    const hh = String(now.getHours()).padStart(2, '0');
    const min = String(now.getMinutes()).padStart(2, '0');
    const projectName = (userDetails.project || 'seima-selection').replace(/[^a-zA-Z0-9\s]/g, '');

    return `${projectName}-${dd}${mm}${yy}.${hh}${min}.${extension}`;
  }

  downloadFile(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  getSelectionSummary() {
    const selectedProducts = this.getSelectedProducts();
    const totalProducts = selectedProducts.length;
    const rooms = new Set(selectedProducts.map(item => item.room).filter(Boolean));
    const totalRooms = rooms.size || 1;

    let totalValue = 0;
    selectedProducts.forEach(item => {
      const price = parseFloat((item.product?.RRP_EX || '0').toString().replace(/[^0-9.]/g, '')) || 0;
      const quantity = item.quantity || 1;
      totalValue += price * quantity;
    });

    return {
      totalProducts,
      totalRooms,
      totalValue,
      hasProducts: totalProducts > 0
    };
  }
}

// Backward compatibility functions - these will call the new unified generator
export async function generateQuotePDF(userDetails) {
  const generator = new UnifiedPDFGenerator();
  await generator.init();
  return await generator.generatePDF(userDetails);
}

export async function generateReportPDF(userDetails) {
  const generator = new UnifiedPDFGenerator();
  await generator.init();
  return await generator.generatePDF(userDetails);
}

export async function generateSimpleCsvForEmailJS(userDetails, filename) {
  const generator = new UnifiedPDFGenerator();
  const csvBlob = await generator.generateCSV(userDetails);
  const csvText = await csvBlob.text();

  return {
    name: filename,
    data: csvText,
    contentType: 'text/csv'
  };
}

// Global instance
export const pdfGenerator = new UnifiedPDFGenerator();
