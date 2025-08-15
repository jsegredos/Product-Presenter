/**
 * Core PDF Generation Module
 * Handles basic PDF creation and layout logic
 */

import { CONFIG } from './config.js';

export class PDFCore {
  constructor() {
    this.doc = null;
    this.pageWidth = 210; // A4 width in mm
    this.pageHeight = 297; // A4 height in mm
    this.margins = {
      left: 10,
      right: 10,
      top: 15,
      bottom: 15
    };
    this.currentY = this.margins.top;
  }

  async init() {
    try {
      // Load jsPDF if not already loaded
      if (!window.jsPDF) {
        await this.loadJsPDF();
      }
      console.log('✅ PDF Core initialized');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize PDF Core:', error);
      return false;
    }
  }

  async loadJsPDF() {
    return new Promise((resolve, reject) => {
      if (window.jsPDF) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js';
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  createDocument() {
    this.doc = new window.jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
    this.currentY = this.margins.top;
    return this.doc;
  }

  addNewPage() {
    this.doc.addPage();
    this.currentY = this.margins.top;
  }

  checkPageSpace(requiredHeight) {
    const availableHeight = this.pageHeight - this.margins.bottom;
    if (this.currentY + requiredHeight > availableHeight) {
      this.addNewPage();
      return true; // New page was added
    }
    return false; // Sufficient space on current page
  }

  addText(text, x, y, options = {}) {
    const {
      fontSize = 10,
      fontStyle = 'normal',
      align = 'left',
      maxWidth = null
    } = options;

    this.doc.setFontSize(fontSize);
    this.doc.setFont('helvetica', fontStyle);

    if (maxWidth) {
      const lines = this.doc.splitTextToSize(text, maxWidth);
      this.doc.text(lines, x, y, { align });
      return lines.length * (fontSize * 0.35); // Return height used
    } else {
      this.doc.text(text, x, y, { align });
      return fontSize * 0.35; // Return height used
    }
  }

  addLine(x1, y1, x2, y2, color = '#000000', width = 0.1) {
    this.doc.setDrawColor(color);
    this.doc.setLineWidth(width);
    this.doc.line(x1, y1, x2, y2);
  }

  addRect(x, y, width, height, style = 'S', color = '#000000') {
    this.doc.setDrawColor(color);
    this.doc.rect(x, y, width, height, style);
  }

  async addImage(imageUrl, x, y, maxWidth, maxHeight) {
    return new Promise((resolve) => {
      if (!imageUrl || imageUrl === 'N/A') {
        resolve({ width: 0, height: 0 });
        return;
      }

      const img = new Image();
      img.crossOrigin = 'anonymous';

      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');

          // Calculate aspect ratio
          const aspectRatio = img.width / img.height;
          let drawWidth = maxWidth;
          let drawHeight = maxWidth / aspectRatio;

          if (drawHeight > maxHeight) {
            drawHeight = maxHeight;
            drawWidth = maxHeight * aspectRatio;
          }

          canvas.width = drawWidth;
          canvas.height = drawHeight;
          ctx.drawImage(img, 0, 0, drawWidth, drawHeight);

          // Adaptive quality based on image characteristics
          const isTechnical = this.detectTechnicalImage(img);
          const quality = isTechnical ? 0.8 : 0.7; // Balanced quality for better compression
          const format = isTechnical ? 'PNG' : 'JPEG';

          const dataUrl = canvas.toDataURL(`image/${format.toLowerCase()}`, quality);
          this.doc.addImage(dataUrl, format, x, y, drawWidth, drawHeight, undefined, 'FAST');

          resolve({ width: drawWidth, height: drawHeight });
        } catch (error) {
          console.warn('Failed to add image:', error);
          resolve({ width: 0, height: 0 });
        }
      };

      img.onerror = () => {
        console.warn('Failed to load image:', imageUrl);
        resolve({ width: 0, height: 0 });
      };

      img.src = imageUrl;
    });
  }

  getContentWidth() {
    return this.pageWidth - this.margins.left - this.margins.right;
  }

  getContentHeight() {
    return this.pageHeight - this.margins.top - this.margins.bottom;
  }

  detectTechnicalImage(img) {
    // Technical diagrams typically have:
    // 1. Sharp edges (high contrast)
    // 2. Limited color palette
    // 3. Geometric patterns
    // 4. Text or symbols

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const sampleSize = Math.min(50, Math.min(img.width, img.height));

    canvas.width = sampleSize;
    canvas.height = sampleSize;

    ctx.drawImage(img, 0, 0, sampleSize, sampleSize);
    const imageData = ctx.getImageData(0, 0, sampleSize, sampleSize);
    const data = imageData.data;

    // Count unique colors
    const colors = new Set();
    let edgeCount = 0;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      colors.add(`${r},${g},${b}`);

      // Simple edge detection (check for high contrast with neighbors)
      if (i > 0 && i < data.length - 4) {
        const prevR = data[i - 4];
        const prevG = data[i - 3];
        const prevB = data[i - 2];

        const contrast = Math.abs(r - prevR) + Math.abs(g - prevG) + Math.abs(b - prevB);
        if (contrast > 50) {edgeCount++;}
      }
    }

    // Technical diagram indicators
    const hasLimitedColors = colors.size < 500;
    const hasSharpEdges = edgeCount > (sampleSize * sampleSize * 0.1);
    const isSmallImage = img.width < 800 && img.height < 800; // Technical diagrams are often smaller

    return hasLimitedColors || hasSharpEdges || isSmallImage;
  }

  moveY(distance) {
    this.currentY += distance;
  }

  getCurrentY() {
    return this.currentY;
  }

  setCurrentY(y) {
    this.currentY = y;
  }

  getRemainingPageHeight() {
    return this.pageHeight - this.margins.bottom - this.currentY;
  }

  isValidUrl(url) {
    if (!url || typeof url !== 'string') {return false;}
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  formatPrice(price) {
    if (!price || price === 'N/A') {return '';}
    const numPrice = parseFloat(price.toString().replace(/[^0-9.]/g, ''));
    return numPrice > 0 ? `$${numPrice.toFixed(2)}` : '';
  }

  formatText(text, maxLength = 50) {
    if (!text) {return '';}
    return text.length > maxLength ? `${text.substring(0, maxLength - 3)}...` : text;
  }

  async finalize() {
    if (!this.doc) {
      throw new Error('No document created');
    }
    return this.doc.output('blob');
  }

  getDocument() {
    return this.doc;
  }
}

// Global instance
export const pdfCore = new PDFCore();
