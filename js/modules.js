/**
 * Central Module Coordinator
 * Manages initialization and coordination of all modular components
 */

import { CONFIG } from './config.js';
import { dataLayer } from './data-layer.js';
import { pdfGenerator } from './pdf-unified.js';
import { pdfCore } from './pdf-core.js';
import { pdfLayouts } from './pdf-layouts.js';
import { StorageManager } from './storage.js';
import * as utils from './utils.js';

export class ModuleCoordinator {
  constructor() {
    this.modules = {
      dataLayer,
      pdfGenerator,
      pdfCore,
      pdfLayouts,
      StorageManager,
      utils
    };
    this.isInitialized = false;
    this.initStatus = {};
  }

  async init() {
    try {
      console.log('🚀 Initializing modular components...');
      
      const initPromises = [
        this.initModule('dataLayer', this.modules.dataLayer),
        this.initModule('pdfGenerator', this.modules.pdfGenerator)
      ];

      const results = await Promise.allSettled(initPromises);
      
      // Check results
      results.forEach((result, index) => {
        const moduleName = ['dataLayer', 'pdfGenerator'][index];
        if (result.status === 'rejected') {
          console.error(`❌ Failed to initialize ${moduleName}:`, result.reason);
          this.initStatus[moduleName] = false;
        } else {
          this.initStatus[moduleName] = result.value;
        }
      });

      this.isInitialized = true;
      console.log('✅ Module initialization complete:', this.initStatus);
      
      return this.initStatus;
    } catch (error) {
      console.error('❌ Module coordinator initialization failed:', error);
      return false;
    }
  }

  async initModule(name, module) {
    try {
      if (module && typeof module.init === 'function') {
        const result = await module.init();
        console.log(`✅ ${name} initialized:`, result);
        return result;
      } else {
        console.log(`ℹ️ ${name} does not require initialization`);
        return true;
      }
    } catch (error) {
      console.error(`❌ Failed to initialize ${name}:`, error);
      throw error;
    }
  }

  // Convenience methods for common operations
  async searchProducts(query, limit = 10) {
    if (!this.modules.dataLayer.isLoaded) {
      await this.modules.dataLayer.init();
    }
    return this.modules.dataLayer.searchProducts(query, limit);
  }

  async findProductByCode(orderCode) {
    if (!this.modules.dataLayer.isLoaded) {
      await this.modules.dataLayer.init();
    }
    return this.modules.dataLayer.findProductByCode(orderCode);
  }

  async addProductToSelection(product, room = '', notes = '', quantity = 1) {
    return this.modules.dataLayer.addProductToSelection(product, room, notes, quantity);
  }

  getSelectedProducts() {
    return this.modules.dataLayer.getSelectedProducts();
  }

  getSelectionSummary() {
    return this.modules.dataLayer.getSelectionSummary();
  }

  async generatePDF(userDetails) {
    return await this.modules.pdfGenerator.generatePDF(userDetails);
  }

  async generateCSV(userDetails) {
    return await this.modules.pdfGenerator.generateCSV(userDetails);
  }

  async generateBothFiles(userDetails) {
    return await this.modules.pdfGenerator.generateBothFiles(userDetails);
  }

  async sendEmail(userDetails, pdfBlob) {
    return await this.modules.emailService.sendEmailWithPDF(userDetails, pdfBlob);
  }

  clearSelection() {
    return this.modules.dataLayer.clearSelection();
  }

  // Health check for all modules
  getModuleStatus() {
    return {
      initialized: this.isInitialized,
      moduleStatus: this.initStatus,
      dataLayer: {
        loaded: this.modules.dataLayer.isLoaded,
        productCount: this.modules.dataLayer.products.length
      },
      selection: {
        count: this.getSelectedProducts().length,
        summary: this.getSelectionSummary()
      }
    };
  }

  // Error recovery
  async reinitializeModule(moduleName) {
    if (this.modules[moduleName]) {
      try {
        this.initStatus[moduleName] = await this.initModule(moduleName, this.modules[moduleName]);
        return this.initStatus[moduleName];
      } catch (error) {
        console.error(`❌ Failed to reinitialize ${moduleName}:`, error);
        return false;
      }
    }
    return false;
  }

  // Batch operations
  async batchAddProducts(products) {
    const results = [];
    for (const { product, room, notes, quantity } of products) {
      try {
        const result = await this.addProductToSelection(product, room, notes, quantity);
        results.push({ success: true, result });
      } catch (error) {
        results.push({ success: false, error: error.message, product });
      }
    }
    return results;
  }

  // Export current state for debugging
  exportState() {
    return {
      moduleStatus: this.getModuleStatus(),
      config: CONFIG,
      timestamp: new Date().toISOString()
    };
  }
}

// Create global instance
export const moduleCoordinator = new ModuleCoordinator();

// Backward compatibility exports
export { dataLayer } from './data-layer.js';
export { pdfGenerator } from './pdf-unified.js';
export { CONFIG } from './config.js';
export { StorageManager } from './storage.js';
export * from './utils.js';

// Initialize immediately when imported
moduleCoordinator.init().catch(error => {
  console.error('❌ Auto-initialization failed:', error);
}); 