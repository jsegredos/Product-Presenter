/**
 * Unified Data Access Layer
 * Consolidates product catalog and storage management
 */

import { CONFIG } from './config.js';
import { StorageManager } from './storage.js';

export class DataLayer {
  constructor() {
    this.products = [];
    this.isLoaded = false;
    this.searchIndex = new Map();
  }

  async init() {
    try {
      await this.loadProductCatalog();
      this.buildSearchIndex();
      console.log('✅ Data Layer initialized');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize Data Layer:', error);
      return false;
    }
  }

  async loadProductCatalog() {
    try {
      console.log('📦 Loading product catalog...');
      
      const response = await fetch('pricelist-latest.csv');
      if (!response.ok) {
        throw new Error(`Failed to load catalog: ${response.status}`);
      }
      
      const csvText = await response.text();
      this.products = this.parseCSV(csvText);
      this.isLoaded = true;
      
      console.log(`✅ Loaded ${this.products.length} products`);
      return this.products;
    } catch (error) {
      console.error('❌ Failed to load product catalog:', error);
      throw error;
    }
  }

  parseCSV(csvText) {
    const lines = csvText.split('\n');
    const headers = this.parseCSVLine(lines[0]);
    const products = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      try {
        const values = this.parseCSVLine(line);
        if (values.length >= headers.length) {
          const product = {};
          headers.forEach((header, index) => {
            product[header] = values[index] || '';
          });
          
          // Only add products with valid order codes
          if (product.OrderCode && product.OrderCode.trim()) {
            products.push(product);
          }
        }
      } catch (error) {
        console.warn(`Skipping invalid CSV line ${i + 1}:`, error);
      }
    }

    return products;
  }

  parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++; // Skip next quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current);
    return result;
  }

  buildSearchIndex() {
    console.log('🔍 Building search index...');
    
    this.searchIndex.clear();
    
    this.products.forEach((product, index) => {
      // Index by order code
      if (product.OrderCode) {
        this.searchIndex.set(product.OrderCode.toLowerCase(), index);
        this.searchIndex.set(product.OrderCode.toLowerCase().replace(/[-\s]/g, ''), index);
      }
      
      // Index by barcode (this is what scanners will find!)
      if (product.BARCODE && product.BARCODE.trim()) {
        this.searchIndex.set(product.BARCODE.toLowerCase(), index);
        this.searchIndex.set(product.BARCODE.toLowerCase().replace(/[-\s]/g, ''), index);
      }
      
      // Index by description keywords
      if (product.Description) {
        const words = product.Description.toLowerCase().split(/\s+/);
        words.forEach(word => {
          if (word.length > 2) {
            if (!this.searchIndex.has(word)) {
              this.searchIndex.set(word, []);
            }
            const indices = this.searchIndex.get(word);
            if (Array.isArray(indices)) {
              indices.push(index);
            }
          }
        });
      }
    });
    
    // Count barcodes indexed for debugging
    const barcodeCount = this.products.filter(p => p.BARCODE && p.BARCODE.trim()).length;
    console.log(`✅ Search index built with ${this.searchIndex.size} entries (${barcodeCount} barcodes indexed)`);
  }

  // Product search methods
  findProductByCode(code) {
    if (!code) return null;
    
    // Search by OrderCode or BARCODE
    const cleanCode = code.toLowerCase().trim();
    const index = this.searchIndex.get(cleanCode) || this.searchIndex.get(cleanCode.replace(/[-\s]/g, ''));
    
    const product = typeof index === 'number' ? this.products[index] : null;
    
    // Debug logging for barcode scanning
    if (code.length > 8) { // Likely a barcode
      console.log(`🔍 Barcode search for "${code}": ${product ? 'FOUND' : 'NOT FOUND'} ${product ? `(${product.OrderCode} - ${product.Description})` : ''}`);
    }
    
    return product;
  }

  searchProducts(query) {
    if (!query || query.length < 2) return [];
    
    const queryLower = query.toLowerCase();
    const results = new Set();
    
    // Direct code match (highest priority)
    const directMatch = this.findProductByCode(query);
    if (directMatch) {
      results.add(directMatch);
    }
    
    // Search in descriptions, order codes, and barcodes
    this.products.forEach(product => {
      const description = (product.Description || '').toLowerCase();
      const orderCode = (product.OrderCode || '').toLowerCase();
      const barcode = (product.BARCODE || '').toLowerCase();
      
      if (description.includes(queryLower) || orderCode.includes(queryLower) || barcode.includes(queryLower)) {
        results.add(product);
      }
    });
    
    return Array.from(results);
  }

  getAllProducts() {
    return [...this.products];
  }

  getProductsByCategory(category) {
    return this.products.filter(product => 
      product.Category && product.Category.toLowerCase().includes(category.toLowerCase())
    );
  }

  // Selection management methods
  getSelectedProducts() {
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
      quantity: item.Quantity || 1,
      id: this.generateSelectionId()
    }));
  }

  addProductToSelection(product, room = '', notes = '', quantity = 1) {
    const selectedProducts = this.getSelectedProducts();
    
    const selectionItem = {
      id: this.generateSelectionId(),
      product: { ...product },
      room,
      notes,
      quantity: Math.max(1, parseInt(quantity) || 1)
    };
    
    selectedProducts.push(selectionItem);
    this.saveSelectedProducts(selectedProducts);
    
    console.log(`✅ Added ${product.OrderCode} to selection`);
    return selectionItem;
  }

  removeProductFromSelection(selectionId) {
    const selectedProducts = this.getSelectedProducts();
    const filteredProducts = selectedProducts.filter(item => item.id !== selectionId);
    
    this.saveSelectedProducts(filteredProducts);
    
    console.log(`✅ Removed product from selection`);
    return filteredProducts;
  }

  updateSelectionItem(selectionId, updates) {
    const selectedProducts = this.getSelectedProducts();
    const itemIndex = selectedProducts.findIndex(item => item.id === selectionId);
    
    if (itemIndex !== -1) {
      selectedProducts[itemIndex] = { ...selectedProducts[itemIndex], ...updates };
      this.saveSelectedProducts(selectedProducts);
      console.log(`✅ Updated selection item`);
      return selectedProducts[itemIndex];
    }
    
    return null;
  }

  clearSelection() {
    localStorage.removeItem('selection');
    localStorage.removeItem(CONFIG.STORAGE_KEYS.SELECTED_PRODUCTS);
    console.log('✅ Selection cleared');
  }

  saveSelectedProducts(selectedProducts) {
    localStorage.setItem(CONFIG.STORAGE_KEYS.SELECTED_PRODUCTS, JSON.stringify(selectedProducts));
    
    // Also maintain backward compatibility with old format
    const legacyFormat = selectedProducts.map(item => ({
      ...item.product,
      Room: item.room,
      Notes: item.notes,
      Quantity: item.quantity
    }));
    localStorage.setItem('selection', JSON.stringify(legacyFormat));
  }

  generateSelectionId() {
    return `sel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Statistics and summary methods
  getSelectionSummary() {
    const selectedProducts = this.getSelectedProducts();
    const totalProducts = selectedProducts.length;
    const rooms = new Set(selectedProducts.map(item => item.room).filter(Boolean));
    const totalRooms = rooms.size || 1;

    let totalValue = 0;
    selectedProducts.forEach(item => {
      const price = parseFloat((item.product?.RRP_INCGST || '0').toString().replace(/[^0-9.]/g, '')) || 0;
      const quantity = item.quantity || 1;
      totalValue += price * quantity;
    });

    return {
      totalProducts,
      totalRooms,
      totalValue,
      hasProducts: totalProducts > 0,
      rooms: Array.from(rooms)
    };
  }

  getProductsByRoom() {
    const selectedProducts = this.getSelectedProducts();
    const roomGroups = {};
    
    selectedProducts.forEach(item => {
      const room = item.room || 'Unassigned';
      if (!roomGroups[room]) {
        roomGroups[room] = [];
      }
      roomGroups[room].push(item);
    });
    
    return roomGroups;
  }

  // Data validation methods
  validateProduct(product) {
    const required = ['OrderCode', 'Description'];
    return required.every(field => product[field] && product[field].trim());
  }

  validateSelection() {
    const selectedProducts = this.getSelectedProducts();
    const issues = [];
    
    selectedProducts.forEach((item, index) => {
      if (!this.validateProduct(item.product)) {
        issues.push(`Product ${index + 1}: Missing required fields`);
      }
      
      if (!item.quantity || item.quantity < 1) {
        issues.push(`Product ${index + 1}: Invalid quantity`);
      }
    });
    
    return {
      isValid: issues.length === 0,
      issues
    };
  }

  // Import/export methods
  exportSelectionData() {
    const selectedProducts = this.getSelectedProducts();
    const summary = this.getSelectionSummary();
    
    return {
      selection: selectedProducts,
      summary,
      exportDate: new Date().toISOString(),
      version: '1.0'
    };
  }

  importSelectionData(data) {
    try {
      if (data.selection && Array.isArray(data.selection)) {
        this.saveSelectedProducts(data.selection);
        console.log(`✅ Imported ${data.selection.length} products`);
        return true;
      }
      throw new Error('Invalid selection data format');
    } catch (error) {
      console.error('❌ Failed to import selection data:', error);
      return false;
    }
  }
}

// Global instance
export const dataLayer = new DataLayer(); 