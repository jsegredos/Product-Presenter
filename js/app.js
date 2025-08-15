/**
 * Main Application Entry Point
 * Seima Product Presenter - Interactive product catalogue and PDF generation
 *
 * @author Seima Development Team
 * @version 2.0.0
 * @since 1.8.1
 */

import { NavigationManager } from './navigation.js';
import { moduleCoordinator, pdfGenerator } from './modules.js';
import { config } from './config-manager.js';
import { errorHandler, ErrorCategory, LogLevel } from './error-handler.js';
import { showPdfFormScreen, ensurePdfSpinner, downloadWithFallback } from './pdf-generator.js';
import { StorageManager } from './storage.js';
import { FileImportManager } from './file-import.js';
import { ProductGridManager } from './product-grid.js';
import { browserCompatibility, isSamsungDevice } from './browser-compatibility.js';

/**
 * Main Application Class
 * Coordinates all application modules and provides the primary API
 * @class SeimaScanner
 */
class SeimaScanner {
  constructor() {
    this.navigationManager = null;
    this.fileImportManager = new FileImportManager();
    this.productGridManager = new ProductGridManager();
    this.isInitialized = false;

    // Log application startup
    errorHandler.log('SeimaScanner application starting', LogLevel.INFO);
  }

  /**
   * Initialize the application
   * Sets up all modules, event listeners, and global handlers
   * @async
   * @returns {Promise<boolean>} True if initialization was successful
   */
  async init() {
    try {
      errorHandler.log('Initializing application modules', LogLevel.INFO);

      // Initialize browser compatibility monitoring
      const compatReport = browserCompatibility.getCompatibilityReport();
      errorHandler.log(`Browser compatibility: ${compatReport.score}% (${compatReport.browserName})`, LogLevel.INFO);

      // Show compatibility warning if needed
      if (browserCompatibility.shouldShowCompatibilityWarning()) {
        this.showCompatibilityWarning();
      }

      // Initialize navigation manager
      this.navigationManager = new NavigationManager();
      await this.navigationManager.init();

      // Initialize file import manager
      this.fileImportManager.init();

      // Setup global event listeners
      this.setupGlobalEventListeners();

      // Initialize product grid manager directly (since grid is now the home page)
      this.productGridManager.init();

      // Make services globally available for compatibility
      window.navigationManager = this.navigationManager;
      window.productGridManager = this.productGridManager;
      window.browserCompatibility = browserCompatibility;
      window.downloadWithFallback = downloadWithFallback;
      window.showPdfFormScreen = showPdfFormScreen;

      // Log Samsung device detection for debugging
      if (isSamsungDevice()) {
        console.log('Samsung device detected - enhanced download compatibility enabled');
      }

      this.isInitialized = true;
      errorHandler.log('Seima Scanner initialized successfully', LogLevel.INFO);
      return true;
    } catch (error) {
      errorHandler.handleError({
        message: 'Failed to initialize application',
        error,
        category: ErrorCategory.UI,
        level: LogLevel.CRITICAL,
        context: 'app-init'
      });
      return false;
    }
  }

  showCompatibilityWarning() {
    const report = browserCompatibility.getCompatibilityReport();
    const recommendations = report.recommendations;

    if (recommendations.length === 0) {return;}

    // Show non-blocking compatibility notification
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed; top: 0; left: 0; right: 0; z-index: 9998;
      background: linear-gradient(135deg, #fef3c7 0%, #fed7aa 100%);
      border-bottom: 2px solid #f59e0b; padding: 12px 16px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      font-size: 14px; line-height: 1.4;
    `;

    const criticalIssues = recommendations.filter(r => r.type === 'critical');
    const hasCompatibilityIssues = report.score < config.get('compatibility.minCompatibilityScore', 70);

    if (criticalIssues.length > 0 || hasCompatibilityIssues) {
      notification.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: space-between;">
          <div style="display: flex; align-items: center;">
            <span style="font-size: 18px; margin-right: 8px;">⚠️</span>
            <div>
              <strong style="color: #92400e;">Browser Compatibility Notice</strong>
              <div style="color: #a16207; font-size: 13px; margin-top: 2px;">
                ${criticalIssues.length > 0 ? criticalIssues[0].message : 'Some features may not work optimally'}
              </div>
            </div>
          </div>
          <div style="display: flex; gap: 8px; align-items: center;">
            <button onclick="window.browserCompatibility.logCompatibilityInfo()" style="
              padding: 4px 8px; border: 1px solid #d97706; background: transparent;
              color: #d97706; border-radius: 3px; cursor: pointer; font-size: 12px;
            ">Details</button>
            <button onclick="this.parentElement.parentElement.parentElement.remove()" style="
              padding: 4px 8px; border: none; background: #f59e0b;
              color: white; border-radius: 3px; cursor: pointer; font-size: 12px;
            ">Dismiss</button>
          </div>
        </div>
      `;
    } else {
      // Show Samsung-specific suggestion
      notification.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: space-between;">
          <div style="display: flex; align-items: center;">
            <span style="font-size: 18px; margin-right: 8px;">📱</span>
            <div>
              <strong style="color: #92400e;">Samsung Device Detected</strong>
              <div style="color: #a16207; font-size: 13px; margin-top: 2px;">
                For best PDF download experience, consider using Chrome browser
              </div>
            </div>
          </div>
          <button onclick="this.parentElement.parentElement.remove()" style="
            padding: 4px 8px; border: none; background: #f59e0b;
            color: white; border-radius: 3px; cursor: pointer; font-size: 12px;
          ">Got it</button>
        </div>
      `;
    }

    document.body.insertBefore(notification, document.body.firstChild);

    // Auto-hide after 15 seconds for non-critical issues
    if (!hasCompatibilityIssues && criticalIssues.length === 0) {
      setTimeout(() => {
        if (notification.parentElement) {
          notification.remove();
        }
      }, 15000);
    }
  }

  setupGlobalEventListeners() {
    // Listen for PDF generation requests
    window.addEventListener('generatePdf', (event) => {
      const userDetails = event.detail;
      ensurePdfSpinner();
      showPdfFormScreen(userDetails);
    });

    // Handle window unload for cleanup
    window.addEventListener('beforeunload', () => {
      // Cleanup any active resources
    });

    // Monitor memory usage
    if (browserCompatibility.features.memoryAPI) {
      setInterval(() => {
        const memoryInfo = browserCompatibility.memoryInfo;
        if (memoryInfo.memoryPressure === 'high') {
          console.warn('High memory usage detected:', memoryInfo);
        }
      }, 60000); // Check every minute
    }
  }

  // Public API methods for backward compatibility
  getSelectedProducts() {
    return StorageManager.getSelectedProducts();
  }

  clearSelection() {
    return StorageManager.clearAllSelections();
  }

  addProduct(product, notes, room, quantity) {
    return StorageManager.addProductToSelection(product, notes, room, quantity);
  }

  updateSelectionCount() {
    if (this.navigationManager) {
      this.navigationManager.updateSelectionCount();
    }
  }

  /**
   * Displays a user-friendly error message in a modal or alert.
   * @param {string} message
   */
  showError(message) {
    // Simple fallback: alert, can be replaced with a custom modal if desired
    alert(message);
  }
}

// Initialize the application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.seimaScanner = new SeimaScanner();
  window.seimaScanner.init();
});

// Add version number to home screen
window.addEventListener('DOMContentLoaded', () => {
  fetch('version.txt')
    .then(resp => resp.text())
    .then(version => {
      const versionSpan = document.getElementById('app-version');
      if (versionSpan) {
        // Extract just the version number (before the first space or dash)
        const versionNumber = version.trim().split(/\s+|-/)[0];
        versionSpan.textContent = `Ver: ${versionNumber}`;
      }
    });
});

// Export for module usage
export default SeimaScanner;
