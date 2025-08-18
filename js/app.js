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

// Add version number to home screen and changelog functionality
window.addEventListener('DOMContentLoaded', () => {
  fetch('./version.txt')
    .then(resp => resp.text())
    .then(version => {
      const versionSpan = document.getElementById('app-version');
      if (versionSpan) {
        // Extract just the version number (before the first space or dash)
        const versionNumber = version.trim().split(/\s+|-/)[0];
        versionSpan.textContent = `Ver: ${versionNumber}`;
        
        // Add click handler to show changelog
        versionSpan.addEventListener('click', () => {
          showChangelog(version.trim(), versionNumber);
        });
      }
    });
});

/**
 * Show the changelog modal with version information
 * @param {string} fullVersionText - The complete version text from version.txt
 * @param {string} versionNumber - Just the version number
 */
function showChangelog(fullVersionText, versionNumber) {
  const modal = document.getElementById('changelog-modal');
  const versionElement = document.getElementById('changelog-version');
  const contentElement = document.getElementById('changelog-content');
  
  if (!modal || !versionElement || !contentElement) return;
  
  // Set version number
  versionElement.textContent = `v${versionNumber}`;
  
  // Parse changelog content from version text
  const changelogHtml = parseChangelogContent(fullVersionText, versionNumber);
  contentElement.innerHTML = changelogHtml;
  
  // Show modal
  modal.style.display = 'block';
  
  // Add close handler
  const closeBtn = document.getElementById('changelog-close');
  if (closeBtn) {
    closeBtn.onclick = () => {
      modal.style.display = 'none';
    };
  }
  
  // Close on background click
  modal.onclick = (e) => {
    if (e.target === modal) {
      modal.style.display = 'none';
    }
  };
}

/**
 * Parse the version text and create formatted changelog HTML
 * @param {string} fullVersionText - The complete version text
 * @param {string} versionNumber - The version number
 * @returns {string} HTML formatted changelog
 */
function parseChangelogContent(fullVersionText, versionNumber) {
  // Split version number and description
  const parts = fullVersionText.split(/\s*-\s*/, 2);
  const description = parts.length > 1 ? parts[1] : 'Updates and improvements';
  
  // For v1.9.0, provide detailed changelog
  if (versionNumber === '1.9.0') {
    return `
      <div style="margin-bottom: 20px;">
        <h4 style="color: #2563eb; margin: 0 0 10px 0;">Major Refactoring & Enhanced Architecture</h4>
        <p style="margin: 0 0 15px 0; color: #666;">${description}</p>
      </div>
      
      <div style="margin-bottom: 20px;">
        <h5 style="color: #059669; margin: 0 0 8px 0;">✨ New Features</h5>
        <ul style="margin: 0; padding-left: 20px; color: #555;">
          <li>Enhanced error handling with categorised logging system</li>
          <li>Modular architecture with centralised configuration management</li>
          <li>Comprehensive JSDoc documentation across all modules</li>
          <li>Professional development workflow with ESLint and Prettier</li>
          <li>Clickable version number to view changelog</li>
        </ul>
      </div>
      
      <div style="margin-bottom: 20px;">
        <h5 style="color: #dc2626; margin: 0 0 8px 0;">🐛 Bug Fixes</h5>
        <ul style="margin: 0; padding-left: 20px; color: #555;">
          <li>Fixed version display to show only version number</li>
          <li>Resolved configuration loading errors</li>
          <li>Fixed ES module compatibility issues</li>
          <li>Improved browser compatibility detection</li>
        </ul>
      </div>
      
      <div style="margin-bottom: 20px;">
        <h5 style="color: #7c3aed; margin: 0 0 8px 0;">🔧 Developer Experience</h5>
        <ul style="margin: 0; padding-left: 20px; color: #555;">
          <li>Added Node.js and Python development servers</li>
          <li>Configured automated code formatting and linting</li>
          <li>Enhanced README with setup instructions</li>
          <li>Created npm scripts for common development tasks</li>
        </ul>
      </div>
      
      <div style="background: #f3f4f6; padding: 12px; border-radius: 8px; margin-top: 16px;">
        <p style="margin: 0; font-size: 0.9em; color: #666;">
          <strong>For developers:</strong> This version includes significant architectural improvements that make the codebase more maintainable and easier to extend with new features.
        </p>
      </div>
    `;
  }
  
  // Generic changelog for other versions
  return `
    <div style="margin-bottom: 20px;">
      <h4 style="color: #2563eb; margin: 0 0 10px 0;">Updates & Improvements</h4>
      <p style="margin: 0; color: #666;">${description}</p>
    </div>
    
    <div style="background: #f3f4f6; padding: 12px; border-radius: 8px;">
      <p style="margin: 0; font-size: 0.9em; color: #666;">
        This version includes various updates and improvements to enhance your experience with the Seima Product Selector.
      </p>
    </div>
  `;
}

// Export for module usage
export default SeimaScanner;
