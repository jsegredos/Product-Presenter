/**
 * Advanced Browser Compatibility Module
 * Comprehensive browser detection, feature checking, and compatibility monitoring
 */

export class BrowserCompatibilityManager {
  constructor() {
    this.features = {};
    this.deviceInfo = {};
    this.networkStatus = {};
    this.memoryInfo = {};
    this.compatibilityScore = 0;

    this.init();
  }

  init() {
    this.detectDevice();
    this.detectBrowser();
    this.checkFeatureSupport();
    this.checkMemoryLimitations();
    this.setupNetworkMonitoring();
    this.calculateCompatibilityScore();
    this.setupPerformanceMonitoring();
  }

  detectDevice() {
    const ua = navigator.userAgent;

    this.deviceInfo = {
      // Device types
      isMobile: /Mobi|Android/i.test(ua),
      isTablet: /iPad|Android(?=.*Tablet)|(?=.*Mobile)(?=.*Safari)/i.test(ua),
      isDesktop: !/Mobi|Android|iPad/i.test(ua),

      // Operating systems
      isIOS: /iPad|iPhone|iPod/.test(ua),
      isAndroid: /Android/i.test(ua),
      isWindows: /Windows/i.test(ua),
      isMacOS: /Macintosh|Mac OS X/i.test(ua),

      // Specific devices
      isSamsung: /SM-|SCH-|SPH-|SGH-|GT-|Galaxy|SamsungBrowser/i.test(ua),
      isIPhone: /iPhone/i.test(ua),
      isIPad: /iPad/i.test(ua),

      // WebView detection
      isWebView: this.detectWebView(ua),
      isStandalone: window.navigator.standalone === true,

      // Screen info
      screenWidth: window.screen.width,
      screenHeight: window.screen.height,
      devicePixelRatio: window.devicePixelRatio || 1,

      // Orientation
      orientation: this.getOrientation(),

      userAgent: ua
    };
  }

  detectBrowser() {
    const ua = navigator.userAgent;

    this.deviceInfo.browser = {
      name: this.getBrowserName(ua),
      version: this.getBrowserVersion(ua),
      engine: this.getBrowserEngine(ua),

      // Specific browser detection
      isChrome: /Chrome/i.test(ua) && !/Edge|Edg/i.test(ua),
      isFirefox: /Firefox/i.test(ua),
      isSafari: /Safari/i.test(ua) && !/Chrome|Chromium/i.test(ua),
      isEdge: /Edge|Edg/i.test(ua),
      isSamsungInternet: /SamsungBrowser/i.test(ua),
      isOpera: /Opera|OPR/i.test(ua),

      // Version-specific checks
      chromeVersion: this.getChromeVersion(ua),
      safariVersion: this.getSafariVersion(ua),
      firefoxVersion: this.getFirefoxVersion(ua)
    };
  }

  checkFeatureSupport() {
    this.features = {
      // Storage APIs
      localStorage: this.checkLocalStorage(),
      sessionStorage: this.checkSessionStorage(),
      indexedDB: 'indexedDB' in window,

      // File APIs
      fileAPI: 'File' in window,
      fileReader: 'FileReader' in window,
      fileSystemAccess: 'showSaveFilePicker' in window,
      downloadAttribute: this.checkDownloadAttribute(),

      // Media APIs
      getUserMedia: 'mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices,
      webRTC: 'RTCPeerConnection' in window,

      // Graphics APIs
      canvas: 'HTMLCanvasElement' in window,
      webGL: this.checkWebGL(),

      // Network APIs
      fetch: 'fetch' in window,
      xhr: 'XMLHttpRequest' in window,
      serviceWorker: 'serviceWorker' in navigator,

      // Modern JS features
      modules: this.checkESModules(),
      asyncAwait: this.checkAsyncAwait(),
      webAssembly: 'WebAssembly' in window,

      // PDF-specific features
      createObjectURL: 'URL' in window && 'createObjectURL' in URL,
      revokeObjectURL: 'URL' in window && 'revokeObjectURL' in URL,
      blob: 'Blob' in window,

      // Mobile-specific
      touchEvents: 'ontouchstart' in window,
      deviceMotion: 'DeviceMotionEvent' in window,
      deviceOrientation: 'DeviceOrientationEvent' in window,

      // Clipboard API
      clipboard: 'clipboard' in navigator,

      // Network status
      onlineStatus: 'onLine' in navigator,
      connection: 'connection' in navigator || 'mozConnection' in navigator || 'webkitConnection' in navigator
    };
  }

  checkMemoryLimitations() {
    this.memoryInfo = {
      // Performance memory API (Chrome)
      jsHeapSizeLimit: performance.memory?.jsHeapSizeLimit || null,
      totalJSHeapSize: performance.memory?.totalJSHeapSize || null,
      usedJSHeapSize: performance.memory?.usedJSHeapSize || null,

      // Device-specific memory estimates
      estimatedMaxFileSize: this.estimateMaxFileSize(),
      memoryPressure: this.estimateMemoryPressure(),

      // Browser-specific limits
      maxBlobSize: this.estimateMaxBlobSize(),
      maxDataURISize: this.estimateMaxDataURISize()
    };
  }

  setupNetworkMonitoring() {
    this.networkStatus = {
      isOnline: navigator.onLine,
      connectionType: this.getConnectionType(),
      effectiveType: this.getEffectiveConnectionType(),
      downlink: this.getDownlink(),
      rtt: this.getRTT()
    };

    // Monitor network changes
    window.addEventListener('online', () => {
      this.networkStatus.isOnline = true;
      this.onNetworkChange('online');
    });

    window.addEventListener('offline', () => {
      this.networkStatus.isOnline = false;
      this.onNetworkChange('offline');
    });

    // Monitor connection changes
    if (navigator.connection) {
      navigator.connection.addEventListener('change', () => {
        this.updateNetworkStatus();
        this.onNetworkChange('connection');
      });
    }
  }

  calculateCompatibilityScore() {
    let score = 100;
    const issues = [];

    // Critical features
    if (!this.features.localStorage) {
      score -= 20;
      issues.push('Local storage not supported');
    }
    if (!this.features.fileReader) {
      score -= 15;
      issues.push('File reading not supported');
    }
    if (!this.features.blob) {
      score -= 15;
      issues.push('Blob creation not supported');
    }
    if (!this.features.createObjectURL) {
      score -= 15;
      issues.push('Object URL creation not supported');
    }

    // Important features
    if (!this.features.fetch) {
      score -= 10;
      issues.push('Modern fetch API not available');
    }
    if (!this.features.modules) {
      score -= 10;
      issues.push('ES6 modules not supported');
    }
    if (!this.features.getUserMedia) {
      score -= 8;
      issues.push('Camera access limited');
    }

    // Device-specific penalties
    if (this.deviceInfo.isWebView) {
      score -= 5;
      issues.push('WebView compatibility concerns');
    }
    if (this.deviceInfo.isSamsung) {
      score -= 3;
      issues.push('Samsung-specific optimizations needed');
    }

    // Memory limitations
    if (this.memoryInfo.memoryPressure === 'high') {
      score -= 8;
      issues.push('High memory pressure detected');
    }

    // Network limitations
    if (!this.networkStatus.isOnline) {
      score -= 5;
      issues.push('Currently offline');
    }

    this.compatibilityScore = Math.max(0, score);
    this.compatibilityIssues = issues;
  }

  setupPerformanceMonitoring() {
    // Monitor memory usage
    if (performance.memory) {
      setInterval(() => {
        this.updateMemoryInfo();
      }, 30000); // Check every 30 seconds
    }

    // Monitor performance
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.entryType === 'measure') {
              this.onPerformanceMeasure(entry);
            }
          }
        });
        observer.observe({ entryTypes: ['measure'] });
      } catch (e) {
        console.warn('Performance observer not fully supported:', e);
      }
    }
  }

  // Utility methods
  detectWebView(ua) {
    // Detect various WebView implementations
    return /wv|WebView|Version\/[\d.]+.*Mobile.*Safari/i.test(ua) ||
           (/Android/i.test(ua) && /Version\/\d\.\d/i.test(ua) && !/ Chrome\//.test(ua)) ||
           /FB_IAB|FBAN|FBAV/i.test(ua); // Facebook WebView
  }

  getOrientation() {
    if (window.screen && window.screen.orientation) {
      return window.screen.orientation.type;
    }
    return window.innerHeight > window.innerWidth ? 'portrait' : 'landscape';
  }

  getBrowserName(ua) {
    if (/SamsungBrowser/i.test(ua)) {return 'Samsung Internet';}
    if (/Chrome/i.test(ua) && !/Edge|Edg/i.test(ua)) {return 'Chrome';}
    if (/Firefox/i.test(ua)) {return 'Firefox';}
    if (/Safari/i.test(ua) && !/Chrome|Chromium/i.test(ua)) {return 'Safari';}
    if (/Edge|Edg/i.test(ua)) {return 'Edge';}
    if (/Opera|OPR/i.test(ua)) {return 'Opera';}
    return 'Unknown';
  }

  getBrowserVersion(ua) {
    const match = ua.match(/(Chrome|Firefox|Safari|Edge|Edg|SamsungBrowser|Opera|OPR)\/([0-9.]+)/i);
    return match ? match[2] : 'Unknown';
  }

  getBrowserEngine(ua) {
    if (/WebKit/i.test(ua)) {return 'WebKit';}
    if (/Gecko/i.test(ua)) {return 'Gecko';}
    if (/Trident/i.test(ua)) {return 'Trident';}
    if (/EdgeHTML/i.test(ua)) {return 'EdgeHTML';}
    return 'Unknown';
  }

  getChromeVersion(ua) {
    const match = ua.match(/Chrome\/([0-9.]+)/i);
    return match ? parseInt(match[1]) : null;
  }

  getSafariVersion(ua) {
    const match = ua.match(/Version\/([0-9.]+).*Safari/i);
    return match ? parseFloat(match[1]) : null;
  }

  getFirefoxVersion(ua) {
    const match = ua.match(/Firefox\/([0-9.]+)/i);
    return match ? parseInt(match[1]) : null;
  }

  checkLocalStorage() {
    try {
      const test = 'compatibilityTest';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch (e) {
      return false;
    }
  }

  checkSessionStorage() {
    try {
      const test = 'compatibilityTest';
      sessionStorage.setItem(test, test);
      sessionStorage.removeItem(test);
      return true;
    } catch (e) {
      return false;
    }
  }

  checkDownloadAttribute() {
    const a = document.createElement('a');
    return 'download' in a;
  }

  checkWebGL() {
    try {
      const canvas = document.createElement('canvas');
      return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
    } catch (e) {
      return false;
    }
  }

  checkESModules() {
    try {
      return typeof Symbol !== 'undefined' &&
             typeof Promise !== 'undefined' &&
             typeof Map !== 'undefined';
    } catch (e) {
      return false;
    }
  }

  checkAsyncAwait() {
    try {
      return eval('(async function() {})').constructor === (async function() {}).constructor;
    } catch (e) {
      return false;
    }
  }

  estimateMaxFileSize() {
    // Conservative estimates based on device type and browser
    if (this.deviceInfo.isDesktop) {return 100 * 1024 * 1024;} // 100MB
    if (this.deviceInfo.isTablet) {return 50 * 1024 * 1024;}   // 50MB
    if (this.deviceInfo.isMobile) {return 20 * 1024 * 1024;}   // 20MB
    return 10 * 1024 * 1024; // 10MB fallback
  }

  estimateMemoryPressure() {
    if (!performance.memory) {return 'unknown';}

    const used = performance.memory.usedJSHeapSize;
    const limit = performance.memory.jsHeapSizeLimit;
    const ratio = used / limit;

    if (ratio > 0.8) {return 'high';}
    if (ratio > 0.6) {return 'medium';}
    return 'low';
  }

  estimateMaxBlobSize() {
    // Browser-specific blob size limits
    if (this.deviceInfo.browser.isChrome) {return 500 * 1024 * 1024;} // 500MB
    if (this.deviceInfo.browser.isFirefox) {return 200 * 1024 * 1024;} // 200MB
    if (this.deviceInfo.browser.isSafari) {return 100 * 1024 * 1024;} // 100MB
    return 50 * 1024 * 1024; // 50MB fallback
  }

  estimateMaxDataURISize() {
    // Data URI size limits vary by browser
    if (this.deviceInfo.browser.isChrome) {return 2 * 1024 * 1024;} // 2MB
    if (this.deviceInfo.browser.isFirefox) {return 1 * 1024 * 1024;} // 1MB
    if (this.deviceInfo.browser.isSafari) {return 512 * 1024;} // 512KB
    return 512 * 1024; // 512KB fallback
  }

  getConnectionType() {
    if (navigator.connection) {
      return navigator.connection.type || navigator.connection.effectiveType;
    }
    return 'unknown';
  }

  getEffectiveConnectionType() {
    return navigator.connection?.effectiveType || 'unknown';
  }

  getDownlink() {
    return navigator.connection?.downlink || null;
  }

  getRTT() {
    return navigator.connection?.rtt || null;
  }

  updateNetworkStatus() {
    this.networkStatus = {
      isOnline: navigator.onLine,
      connectionType: this.getConnectionType(),
      effectiveType: this.getEffectiveConnectionType(),
      downlink: this.getDownlink(),
      rtt: this.getRTT()
    };
  }

  updateMemoryInfo() {
    if (performance.memory) {
      this.memoryInfo.totalJSHeapSize = performance.memory.totalJSHeapSize;
      this.memoryInfo.usedJSHeapSize = performance.memory.usedJSHeapSize;
      this.memoryInfo.memoryPressure = this.estimateMemoryPressure();
    }
  }

  // Event handlers (can be overridden)
  onNetworkChange(type) {
    console.log(`Network status changed: ${type}`, this.networkStatus);
  }

  onPerformanceMeasure(entry) {
    if (entry.duration > 1000) {
      console.warn(`Performance concern: ${entry.name} took ${entry.duration}ms`);
    }
  }

  // Public API methods
  getCompatibilityReport() {
    return {
      score: this.compatibilityScore,
      issues: this.compatibilityIssues,
      device: this.deviceInfo,
      features: this.features,
      memory: this.memoryInfo,
      network: this.networkStatus,
      recommendations: this.getRecommendations()
    };
  }

  getRecommendations() {
    const recommendations = [];

    if (this.compatibilityScore < 70) {
      recommendations.push({
        type: 'critical',
        message: 'Browser compatibility issues detected. Consider updating your browser.',
        action: 'update_browser'
      });
    }

    if (this.deviceInfo.isSamsung) {
      recommendations.push({
        type: 'info',
        message: 'For best results, consider using Chrome browser instead of Samsung Internet.',
        action: 'switch_browser'
      });
    }

    if (this.memoryInfo.memoryPressure === 'high') {
      recommendations.push({
        type: 'warning',
        message: 'High memory usage detected. Close other browser tabs for better performance.',
        action: 'reduce_memory'
      });
    }

    if (!this.features.fileSystemAccess && this.deviceInfo.isDesktop) {
      recommendations.push({
        type: 'info',
        message: 'Modern file saving features available in newer browsers.',
        action: 'update_browser'
      });
    }

    if (!this.networkStatus.isOnline) {
      recommendations.push({
        type: 'error',
        message: 'Internet connection required for full functionality.',
        action: 'check_connection'
      });
    }

    return recommendations;
  }

  isFeatureSupported(feature) {
    return this.features[feature] || false;
  }

  getOptimalDownloadMethod() {
    if (this.features.fileSystemAccess && this.deviceInfo.isDesktop) {
      return 'fileSystemAPI';
    }
    if (this.features.downloadAttribute) {
      return 'downloadAttribute';
    }
    if (this.features.createObjectURL) {
      return 'objectURL';
    }
    return 'manual';
  }

  shouldShowCompatibilityWarning() {
    return this.compatibilityScore < 80 ||
           this.compatibilityIssues.length > 0 ||
           this.deviceInfo.isSamsung;
  }

  logCompatibilityInfo() {
    console.group('Browser Compatibility Report');
    console.log('Score:', this.compatibilityScore);
    console.log('Device:', this.deviceInfo);
    console.log('Features:', this.features);
    console.log('Issues:', this.compatibilityIssues);
    console.log('Recommendations:', this.getRecommendations());
    console.groupEnd();
  }
}

// Export singleton instance
export const browserCompatibility = new BrowserCompatibilityManager();

// Export convenience function for backward compatibility
export function isSamsungDevice() {
  return browserCompatibility.deviceInfo.isSamsung;
}
