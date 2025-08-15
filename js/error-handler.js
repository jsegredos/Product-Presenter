/**
 * Centralised Error Handling and Logging System
 * Provides comprehensive error tracking, logging, and user feedback
 *
 * @author Seima Development Team
 * @version 1.0.0
 */

/**
 * Log levels for categorising messages
 * @readonly
 * @enum {string}
 */
export const LogLevel = {
  DEBUG: 'debug',
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error',
  CRITICAL: 'critical'
};

/**
 * Error categories for better organisation
 * @readonly
 * @enum {string}
 */
export const ErrorCategory = {
  NETWORK: 'network',
  DATA: 'data',
  UI: 'ui',
  PDF: 'pdf',
  STORAGE: 'storage',
  COMPATIBILITY: 'compatibility',
  IMPORT: 'import',
  VALIDATION: 'validation'
};

/**
 * Enhanced Error Handler with comprehensive logging and user feedback
 */
export class ErrorHandler {
  constructor() {
    this.logs = [];
    this.maxLogs = 1000;
    this.enableConsoleLogging = true;
    this.enableUserNotifications = true;
    this.errorStats = new Map();

    // Set up global error handlers
    this.setupGlobalErrorHandlers();
  }

  /**
   * Set up global error event listeners
   * @private
   */
  setupGlobalErrorHandlers() {
    // Handle unhandled JavaScript errors
    window.addEventListener('error', (event) => {
      this.handleError({
        message: event.message,
        filename: event.filename,
        lineNumber: event.lineno,
        columnNumber: event.colno,
        error: event.error,
        category: ErrorCategory.UI,
        context: 'global'
      });
    });

    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.handleError({
        message: `Unhandled promise rejection: ${event.reason}`,
        error: event.reason,
        category: ErrorCategory.DATA,
        context: 'promise'
      });
    });
  }

  /**
   * Main error handling method
   * @param {Object} errorInfo - Error information object
   * @param {string} errorInfo.message - Error message
   * @param {Error} [errorInfo.error] - Error object
   * @param {string} [errorInfo.category] - Error category
   * @param {string} [errorInfo.context] - Additional context
   * @param {LogLevel} [errorInfo.level] - Log level
   * @param {boolean} [errorInfo.showUser] - Whether to show user notification
   */
  handleError(errorInfo) {
    const {
      message,
      error,
      category = ErrorCategory.UI,
      context = 'unknown',
      level = LogLevel.ERROR,
      showUser = true
    } = errorInfo;

    // Create standardised error entry
    const errorEntry = {
      id: this.generateErrorId(),
      timestamp: new Date().toISOString(),
      message,
      category,
      context,
      level,
      stack: error?.stack || new Error().stack,
      userAgent: navigator.userAgent,
      url: window.location.href,
      additionalInfo: this.gatherAdditionalInfo(error)
    };

    // Log the error
    this.log(errorEntry);

    // Update error statistics
    this.updateErrorStats(category);

    // Show user notification if appropriate
    if (showUser && this.enableUserNotifications && level !== LogLevel.DEBUG) {
      this.showUserNotification(errorEntry);
    }

    // For critical errors, attempt recovery
    if (level === LogLevel.CRITICAL) {
      this.attemptRecovery(errorEntry);
    }

    return errorEntry.id;
  }

  /**
   * Log a message with specified level
   * @param {Object|string} entry - Log entry or message
   * @param {LogLevel} [level] - Log level
   */
  log(entry, level = LogLevel.INFO) {
    const logEntry = typeof entry === 'string' ? {
      message: entry,
      level,
      timestamp: new Date().toISOString()
    } : entry;

    // Add to logs array
    this.logs.push(logEntry);

    // Maintain log size limit
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // Console logging
    if (this.enableConsoleLogging) {
      this.consoleLog(logEntry);
    }

    // Store important logs in localStorage
    if (level === LogLevel.ERROR || level === LogLevel.CRITICAL) {
      this.persistCriticalLog(logEntry);
    }
  }

  /**
   * Log to console with appropriate method
   * @private
   * @param {Object} logEntry - Log entry
   */
  consoleLog(logEntry) {
    const { level, message, category, context } = logEntry;
    const prefix = `[${level.toUpperCase()}]${category ? ` [${category}]` : ''}${context ? ` [${context}]` : ''}`;

    switch (level) {
    case LogLevel.DEBUG:
      console.debug(prefix, message, logEntry);
      break;
    case LogLevel.INFO:
      console.info(prefix, message);
      break;
    case LogLevel.WARN:
      console.warn(prefix, message, logEntry);
      break;
    case LogLevel.ERROR:
    case LogLevel.CRITICAL:
      console.error(prefix, message, logEntry);
      break;
    default:
      console.log(prefix, message);
    }
  }

  /**
   * Show user-friendly error notification
   * @private
   * @param {Object} errorEntry - Error entry
   */
  showUserNotification(errorEntry) {
    const { message, category, level } = errorEntry;

    // Generate user-friendly message
    const userMessage = this.generateUserFriendlyMessage(message, category);

    // For non-critical errors, show a temporary notification
    if (level !== LogLevel.CRITICAL) {
      this.showToast(userMessage, level);
    } else {
      // For critical errors, show a modal
      this.showErrorModal(userMessage, errorEntry);
    }
  }

  /**
   * Show temporary toast notification
   * @private
   * @param {string} message - Message to show
   * @param {LogLevel} level - Severity level
   */
  showToast(message, level) {
    const toast = document.createElement('div');
    toast.className = `error-toast error-toast--${level}`;
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 10000;
      max-width: 400px;
      padding: 16px 20px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      font-family: inherit;
      font-size: 14px;
      line-height: 1.4;
      transform: translateX(100%);
      transition: transform 0.3s ease;
      background: ${level === LogLevel.ERROR ? '#fee' : level === LogLevel.WARN ? '#fef3c7' : '#e0f2fe'};
      border-left: 4px solid ${level === LogLevel.ERROR ? '#dc2626' : level === LogLevel.WARN ? '#f59e0b' : '#0ea5e9'};
      color: ${level === LogLevel.ERROR ? '#7f1d1d' : level === LogLevel.WARN ? '#92400e' : '#0c4a6e'};
    `;

    toast.innerHTML = `
      <div style="display: flex; align-items: flex-start; gap: 8px;">
        <span style="font-size: 16px;">${level === LogLevel.ERROR ? '❌' : level === LogLevel.WARN ? '⚠️' : 'ℹ️'}</span>
        <div style="flex: 1;">${message}</div>
        <button onclick="this.parentElement.parentElement.remove()" style="
          background: none; border: none; font-size: 18px; cursor: pointer; 
          color: inherit; opacity: 0.7; padding: 0; margin-left: 8px;
        ">×</button>
      </div>
    `;

    document.body.appendChild(toast);

    // Animate in
    setTimeout(() => toast.style.transform = 'translateX(0)', 100);

    // Auto remove after delay
    const delay = level === LogLevel.ERROR ? 8000 : 5000;
    setTimeout(() => {
      if (toast.parentElement) {
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => toast.remove(), 300);
      }
    }, delay);
  }

  /**
   * Show error modal for critical issues
   * @private
   * @param {string} message - Error message
   * @param {Object} errorEntry - Full error entry
   */
  showErrorModal(message, errorEntry) {
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(0,0,0,0.8); z-index: 10001; display: flex;
      align-items: center; justify-content: center; padding: 20px;
    `;

    modal.innerHTML = `
      <div style="
        background: white; border-radius: 12px; padding: 24px; max-width: 500px;
        width: 100%; max-height: 80vh; overflow-y: auto;
      ">
        <h3 style="color: #dc2626; margin: 0 0 16px 0; display: flex; align-items: center; gap: 8px;">
          <span>🚨</span> Critical Error
        </h3>
        <p style="margin: 0 0 20px 0; color: #374151; line-height: 1.5;">
          ${message}
        </p>
        <details style="margin: 16px 0; font-size: 12px; color: #6b7280;">
          <summary style="cursor: pointer; margin-bottom: 8px;">Technical Details</summary>
          <pre style="background: #f9fafb; padding: 8px; border-radius: 4px; overflow-x: auto; white-space: pre-wrap;">${JSON.stringify(errorEntry, null, 2)}</pre>
        </details>
        <div style="display: flex; gap: 12px; justify-content: flex-end;">
          <button onclick="location.reload()" style="
            padding: 8px 16px; border: 1px solid #d1d5db; background: white;
            border-radius: 6px; cursor: pointer;
          ">Reload Page</button>
          <button onclick="this.closest('[style*=\\"position: fixed\\"]').remove()" style="
            padding: 8px 16px; border: none; background: #dc2626; color: white;
            border-radius: 6px; cursor: pointer;
          ">Dismiss</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
  }

  /**
   * Generate user-friendly error messages
   * @private
   * @param {string} originalMessage - Original error message
   * @param {ErrorCategory} category - Error category
   * @returns {string} User-friendly message
   */
  generateUserFriendlyMessage(originalMessage, category) {
    const friendlyMessages = {
      [ErrorCategory.NETWORK]: 'Unable to connect to the server. Please check your internet connection and try again.',
      [ErrorCategory.DATA]: 'There was an issue loading product data. The page will retry automatically.',
      [ErrorCategory.PDF]: 'PDF generation failed. Please try again or contact support if the problem persists.',
      [ErrorCategory.STORAGE]: 'Unable to save your data locally. Please ensure you have enough storage space.',
      [ErrorCategory.IMPORT]: 'File import failed. Please check your file format and try again.',
      [ErrorCategory.VALIDATION]: 'Please check your input and try again.',
      [ErrorCategory.COMPATIBILITY]: 'Your browser may not support all features. Consider updating to a newer version.'
    };

    return friendlyMessages[category] || 'An unexpected error occurred. Please try refreshing the page.';
  }

  /**
   * Gather additional debugging information
   * @private
   * @param {Error} [error] - Error object
   * @returns {Object} Additional information
   */
  gatherAdditionalInfo(error) {
    return {
      timestamp: Date.now(),
      memoryUsage: performance.memory ? {
        used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
        total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024),
        limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024)
      } : null,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      },
      localStorage: this.getStorageInfo(),
      errorType: error?.constructor?.name,
      hasNetworkConnection: navigator.onLine
    };
  }

  /**
   * Get localStorage usage information
   * @private
   * @returns {Object} Storage information
   */
  getStorageInfo() {
    try {
      const keys = Object.keys(localStorage);
      const totalSize = keys.reduce((total, key) => {
        return total + localStorage.getItem(key).length;
      }, 0);

      return {
        itemCount: keys.length,
        totalSize: Math.round(totalSize / 1024), // KB
        available: true
      };
    } catch {
      return { available: false };
    }
  }

  /**
   * Generate unique error ID
   * @private
   * @returns {string} Unique ID
   */
  generateErrorId() {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Update error statistics
   * @private
   * @param {ErrorCategory} category - Error category
   */
  updateErrorStats(category) {
    const count = this.errorStats.get(category) || 0;
    this.errorStats.set(category, count + 1);
  }

  /**
   * Attempt automatic recovery for critical errors
   * @private
   * @param {Object} errorEntry - Error entry
   */
  attemptRecovery(errorEntry) {
    const { category } = errorEntry;

    this.log(`Attempting recovery for critical ${category} error`, LogLevel.INFO);

    switch (category) {
    case ErrorCategory.STORAGE:
      this.recoverStorage();
      break;
    case ErrorCategory.DATA:
      this.recoverData();
      break;
    default:
      this.log('No specific recovery strategy available', LogLevel.WARN);
    }
  }

  /**
   * Attempt storage recovery
   * @private
   */
  recoverStorage() {
    try {
      // Clear some non-essential items to free up space
      const nonEssentialKeys = ['logs', 'cache', 'temp'];
      nonEssentialKeys.forEach(key => {
        if (localStorage.getItem(key)) {
          localStorage.removeItem(key);
          this.log(`Cleared ${key} from storage for recovery`, LogLevel.INFO);
        }
      });
    } catch (error) {
      this.log('Storage recovery failed', LogLevel.ERROR);
    }
  }

  /**
   * Attempt data recovery
   * @private
   */
  recoverData() {
    try {
      // Attempt to reload critical data
      if (window.dataLayer && typeof window.dataLayer.init === 'function') {
        window.dataLayer.init();
        this.log('Attempting data layer recovery', LogLevel.INFO);
      }
    } catch (error) {
      this.log('Data recovery failed', LogLevel.ERROR);
    }
  }

  /**
   * Persist critical logs to localStorage
   * @private
   * @param {Object} logEntry - Log entry
   */
  persistCriticalLog(logEntry) {
    try {
      const criticalLogs = JSON.parse(localStorage.getItem('criticalLogs') || '[]');
      criticalLogs.push(logEntry);

      // Keep only last 50 critical logs
      if (criticalLogs.length > 50) {
        criticalLogs.splice(0, criticalLogs.length - 50);
      }

      localStorage.setItem('criticalLogs', JSON.stringify(criticalLogs));
    } catch {
      // If we can't save logs, that's not critical enough to throw another error
    }
  }

  /**
   * Get current error statistics
   * @returns {Object} Error statistics
   */
  getErrorStats() {
    return {
      totalLogs: this.logs.length,
      categoryBreakdown: Object.fromEntries(this.errorStats),
      recentErrors: this.logs.filter(log =>
        log.level === LogLevel.ERROR || log.level === LogLevel.CRITICAL
      ).slice(-10)
    };
  }

  /**
   * Export logs for debugging
   * @returns {string} JSON string of all logs
   */
  exportLogs() {
    return JSON.stringify({
      logs: this.logs,
      stats: this.getErrorStats(),
      exportTime: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    }, null, 2);
  }

  /**
   * Clear all logs
   */
  clearLogs() {
    this.logs = [];
    this.errorStats.clear();
    localStorage.removeItem('criticalLogs');
    this.log('Logs cleared', LogLevel.INFO);
  }
}

// Create global instance
export const errorHandler = new ErrorHandler();

// Convenience methods for quick logging
export const logError = (message, category, context) =>
  errorHandler.handleError({ message, category, context, level: LogLevel.ERROR });

export const logWarning = (message, category, context) =>
  errorHandler.handleError({ message, category, context, level: LogLevel.WARN, showUser: false });

export const logInfo = (message, context) =>
  errorHandler.log(message, LogLevel.INFO);

export const logDebug = (message, context) =>
  errorHandler.log(message, LogLevel.DEBUG);

// Make available globally for debugging
window.errorHandler = errorHandler;
