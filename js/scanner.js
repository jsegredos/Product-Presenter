import { CONFIG } from './config.js';
import { dataLayer } from './modules.js';

export class HybridScannerController {
  constructor() {
    this.isScanning = false;
    this.scannerEngine = 'auto'; // Will auto-detect best available
    this.onScanCallback = null;
    this.lastScannedCode = null;
    this.scanTimeout = null;
    this.videoElement = null;
    this.barcodeDetector = null;
    this.animationFrame = null;
    this.canvas = null;
    this.context = null;
    this.scanDebounceTimeout = null;
    this.scanAttempts = 0;
    this.isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  }

  async initialize() {
    // Check for native BarcodeDetector support
    if ('BarcodeDetector' in window) {
      try {
        // Check if EAN format is supported
        const supportedFormats = await BarcodeDetector.getSupportedFormats();
        if (supportedFormats.includes('ean_13') || supportedFormats.includes('ean_8')) {
          this.scannerEngine = 'native';
          this.barcodeDetector = new BarcodeDetector({
            formats: supportedFormats.filter(format => 
              ['ean_13', 'ean_8', 'upc_a', 'upc_e'].includes(format)
            )
          });
          console.log('✅ Native BarcodeDetector available');
          return;
        }
      } catch (error) {
        console.warn('BarcodeDetector initialization failed:', error);
      }
    }
    
    // Fallback to Quagga
    this.scannerEngine = 'quagga';
    console.log('📱 Falling back to Quagga.js');
  }

  setOnScanCallback(callback) {
    this.onScanCallback = callback;
  }

  async startScanning() {
    if (this.isScanning) return;

    const viewport = document.getElementById('scanner-viewport');
    if (!viewport) return;

    // Initialize scanner engine if not done
    if (this.scannerEngine === 'auto') {
      await this.initialize();
    }

    try {
      this.isScanning = true;
      this.lastScannedCode = null;
      
      if (this.scannerEngine === 'native') {
        await this.startNativeScanning();
      } else {
        await this.startQuaggaScanning();
      }
    } catch (error) {
      console.error('Failed to start scanner:', error);
      this.showCameraError();
      this.isScanning = false;
    }
  }

  async startNativeScanning() {
    const viewport = document.getElementById('scanner-viewport');
    
    // Create video element
    this.videoElement = document.createElement('video');
    this.videoElement.style.width = '100%';
    this.videoElement.style.height = '100%';
    this.videoElement.style.objectFit = 'cover';
    this.videoElement.autoplay = true;
    this.videoElement.muted = true;
    this.videoElement.playsInline = true;
    
    // Create canvas for capturing frames
    this.canvas = document.createElement('canvas');
    this.context = this.canvas.getContext('2d');
    
    viewport.innerHTML = '';
    viewport.appendChild(this.videoElement);
    
    // Get camera stream with mobile-optimized constraints
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: 'environment',
        width: { ideal: 640 },
        height: { ideal: 480 }
      }
    });
    
    this.videoElement.srcObject = stream;
    
    // Wait for video to be ready
    await new Promise(resolve => {
      this.videoElement.onloadedmetadata = () => {
        this.canvas.width = this.videoElement.videoWidth;
        this.canvas.height = this.videoElement.videoHeight;
        resolve();
      };
    });
    
    // Start scanning loop
    this.scanLoop();
  }

  scanLoop() {
    if (!this.isScanning) return;
    
    // Capture frame from video
    this.context.drawImage(this.videoElement, 0, 0);
    
    // Detect barcodes
    this.barcodeDetector.detect(this.canvas)
      .then(barcodes => {
        if (barcodes.length > 0) {
          const barcode = barcodes[0];
          this.handleNativeScanResult(barcode);
        }
      })
      .catch(error => {
        console.warn('Barcode detection error:', error);
      });
    
    // Schedule next scan (native API is very fast, so we can scan more frequently)
    this.animationFrame = requestAnimationFrame(() => this.scanLoop());
  }

  handleNativeScanResult(barcode) {
    const code = barcode.rawValue;
    
    // Prevent duplicate scans
    if (this.lastScannedCode === code) {
      return;
    }
    
    if (this.isValidBarcode(code)) {
      this.lastScannedCode = code;
      this.stopScanning();
      this.provideHapticFeedback();
      
      if (this.onScanCallback) {
        this.onScanCallback(code, null);
      }
    }
  }

  async startQuaggaScanning() {
    const viewport = document.getElementById('scanner-viewport');
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const isLowEndDevice = this.detectLowEndDevice();
    
    let constraints;
    let frequency;
    
    if (this.isIOS) {
      // iOS-specific optimized settings
      constraints = {
        width: { min: 320, ideal: 640, max: 640 },
        height: { min: 240, ideal: 480, max: 480 },
        facingMode: { exact: "environment" },
        frameRate: { ideal: 15, max: 30 }
      };
      frequency = 2; // Very conservative for iOS
    } else if (isMobile) {
      if (isLowEndDevice) {
        constraints = {
          width: { min: 320, ideal: 320, max: 480 },
          height: { min: 240, ideal: 240, max: 360 },
          facingMode: "environment"
        };
        frequency = 2;
      } else {
        constraints = {
          width: { min: 320, ideal: 480, max: 640 },
          height: { min: 240, ideal: 360, max: 480 },
          facingMode: "environment"
        };
        frequency = 3;
      }
    } else {
      constraints = {
        width: { min: 640, ideal: 800, max: 1280 },
        height: { min: 480, ideal: 600, max: 720 },
        facingMode: "environment"
      };
      frequency = 5;
    }

    return new Promise((resolve, reject) => {
      // iOS-specific Quagga configuration
      const quaggaConfig = {
        inputStream: {
          name: "Live",
          type: "LiveStream",
          target: "#scanner-viewport",
          constraints: constraints,
        },
        locator: {
          patchSize: this.isIOS || isLowEndDevice ? "small" : "medium",
          halfSample: true
        },
        numOfWorkers: this.isIOS ? 1 : (isMobile ? 1 : Math.min(navigator.hardwareConcurrency || 2, 2)),
        frequency: frequency,
        decoder: {
          readers: this.isIOS ? ["ean_reader"] : ["ean_reader", "ean_8_reader"] // Simplified for iOS
        },
        locate: false,
        debug: false
      };

      // Add iOS-specific timeout
      const initTimeout = setTimeout(() => {
        console.warn('Quagga initialization timeout');
        reject(new Error('Scanner initialization timeout'));
      }, this.isIOS ? 10000 : 5000);

      window.Quagga.init(quaggaConfig, (err) => {
        clearTimeout(initTimeout);
        
        if (err) {
          console.error('Quagga initialization error:', err);
          reject(err);
          return;
        }
        
        window.Quagga.onDetected((result) => {
          this.handleQuaggaScanResultDebounced(result);
        });
        
        resolve();
      });
    });
  }

  handleQuaggaScanResultDebounced(result) {
    const code = result.codeResult.code;
    
    // Enhanced duplicate prevention for iOS
    if (this.lastScannedCode === code) {
      return;
    }
    
    // Clear any existing debounce timeout
    if (this.scanDebounceTimeout) {
      clearTimeout(this.scanDebounceTimeout);
    }
    
    // Longer debounce for iOS to prevent rapid duplicate scans
    const debounceTime = this.isIOS ? 200 : 100;
    
    this.scanDebounceTimeout = setTimeout(() => {
      this.handleQuaggaScanResult(result);
    }, debounceTime);
  }

  handleQuaggaScanResult(result) {
    const code = result.codeResult.code;
    
    // Additional validation for iOS
    if (!this.isValidBarcode(code)) {
      return;
    }
    
    // Enhanced confidence checking for iOS
    if (this.isIOS && result.codeResult.confidence) {
      // Require higher confidence on iOS due to more false positives
      if (result.codeResult.confidence < 80) {
        return;
      }
    }
    
    this.lastScannedCode = code;
    this.stopScanning();
    this.provideHapticFeedback();
    
    if (this.onScanCallback) {
      this.onScanCallback(code, null);
    }
  }

  stopScanning() {
    if (!this.isScanning) return;
    
    this.isScanning = false;
    
    // Clean up debounce timeout
    if (this.scanDebounceTimeout) {
      clearTimeout(this.scanDebounceTimeout);
      this.scanDebounceTimeout = null;
    }
    
    // Clean up native scanner
    if (this.videoElement && this.videoElement.srcObject) {
      const stream = this.videoElement.srcObject;
      const tracks = stream.getTracks();
      tracks.forEach(track => track.stop());
      this.videoElement.srcObject = null;
    }
    
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
    
    // Clean up Quagga with iOS-specific handling
    try {
      if (window.Quagga) {
        window.Quagga.stop();
        // iOS sometimes needs a brief delay before cleanup
        if (this.isIOS) {
          setTimeout(() => {
            try {
              window.Quagga.offDetected();
              window.Quagga.offProcessed();
            } catch (e) {
              // Suppress cleanup errors
            }
          }, 100);
        }
      }
    } catch (e) {
      // Suppress errors
    }
    
    if (this.scanTimeout) {
      clearTimeout(this.scanTimeout);
      this.scanTimeout = null;
    }
  }

  detectLowEndDevice() {
    const memory = navigator.deviceMemory || 4;
    const cores = navigator.hardwareConcurrency || 4;
    const userAgent = navigator.userAgent.toLowerCase();
    
    return memory < 3 || 
           cores < 4 || 
           userAgent.includes('android 6') ||
           userAgent.includes('android 7') ||
           userAgent.includes('android 8') ||
           userAgent.includes('iphone 6') ||
           userAgent.includes('iphone 7') ||
           userAgent.includes('iphone 8');
  }

  isValidBarcode(code) {
    if (!code || typeof code !== 'string') return false;
    
    // Enhanced validation for iOS
    if (this.isIOS) {
      // More strict validation for iOS due to higher false positive rate
      // Remove any non-digit characters that sometimes appear on iOS
      const cleanCode = code.replace(/\D/g, '');
      
      // Check for valid EAN-13, EAN-8, UPC-A, UPC-E formats
      const validFormats = /^(\d{8}|\d{12}|\d{13})$/;
      if (!validFormats.test(cleanCode)) return false;
      
      // Basic checksum validation for EAN-13
      if (cleanCode.length === 13) {
        return this.validateEAN13Checksum(cleanCode);
      }
      
      // Basic checksum validation for EAN-8
      if (cleanCode.length === 8) {
        return this.validateEAN8Checksum(cleanCode);
      }
      
      return cleanCode.length === 12; // UPC-A without validation
    }
    
    // Standard validation for other platforms
    return /^\d{8}$|^\d{12,13}$/.test(code);
  }

  validateEAN13Checksum(code) {
    if (code.length !== 13) return false;
    
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      const digit = parseInt(code[i]);
      sum += i % 2 === 0 ? digit : digit * 3;
    }
    
    const checkDigit = (10 - (sum % 10)) % 10;
    return checkDigit === parseInt(code[12]);
  }

  validateEAN8Checksum(code) {
    if (code.length !== 8) return false;
    
    let sum = 0;
    for (let i = 0; i < 7; i++) {
      const digit = parseInt(code[i]);
      sum += i % 2 === 0 ? digit * 3 : digit;
    }
    
    const checkDigit = (10 - (sum % 10)) % 10;
    return checkDigit === parseInt(code[7]);
  }

  provideHapticFeedback() {
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }
  }

  setManualBarcode(code) {
    if (code) {
      if (this.scannerEngine === 'native') {
        this.handleNativeScanResult({ rawValue: code });
      } else {
        this.handleQuaggaScanResult({ codeResult: { code } });
      }
    }
  }

  // Get current scanner engine info
  getScannerInfo() {
    return {
      engine: this.scannerEngine,
      isNative: this.scannerEngine === 'native',
      hasNativeSupport: 'BarcodeDetector' in window
    };
  }

  // Legacy compatibility methods
  playScanSound() {
    // Sound is less important for performance, keeping simple
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.1);
    } catch (error) {
      // Ignore audio errors
    }
  }

  // iOS-specific debug mode for troubleshooting
  enableIOSDebug() {
    if (this.isIOS) {
      console.log('🍎 iOS Debug mode enabled');
      window.Quagga.onProcessed((result) => {
        console.log('iOS Debug - Processing frame');
        if (result && result.codeResult) {
          console.log('iOS Debug - Found code:', result.codeResult.code, 'Confidence:', result.codeResult.confidence);
        }
      });
    }
  }

  // Enhanced iOS fallback UI for persistent scanning issues
  showIOSFallbackUI() {
    const viewport = document.getElementById('scanner-viewport');
    if (viewport && this.isIOS) {
      viewport.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: white; text-align: center; padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
          <div style="font-size: 3rem; margin-bottom: 1.5rem;">📱</div>
          <h3 style="margin-bottom: 1rem; color: white;">iPhone Camera Optimized</h3>
          <p style="margin-bottom: 1.5rem; line-height: 1.5; color: #f0f0f0;">For best results on iPhone:<br/>
          • Hold device steady<br/>
          • Ensure good lighting<br/>
          • Try manual entry below</p>
          <button onclick="window.scannerController.startScanning()" style="margin: 0.5rem; padding: 0.75rem 1.5rem; background: rgba(255,255,255,0.2); color: white; border: 1px solid rgba(255,255,255,0.3); border-radius: 12px; cursor: pointer; backdrop-filter: blur(10px);">📷 Try Camera Again</button>
          <button onclick="document.getElementById('manual-barcode').focus()" style="margin: 0.5rem; padding: 0.75rem 1.5rem; background: rgba(255,255,255,0.9); color: #333; border: none; border-radius: 12px; cursor: pointer;">⌨️ Manual Entry</button>
        </div>
      `;
    }
  }

  // Track scan attempts for iOS fallback strategy
  incrementScanAttempts() {
    if (!this.scanAttempts) this.scanAttempts = 0;
    this.scanAttempts++;
    
    // Show enhanced fallback UI for iOS after 2 failed attempts
    if (this.isIOS && this.scanAttempts > 2) {
      console.log('🍎 iOS: Multiple scan attempts detected, showing fallback UI');
      setTimeout(() => {
        this.showIOSFallbackUI();
      }, 1000);
    }
  }

  // Enhanced error handling with iOS-specific considerations
  showCameraError() {
    this.incrementScanAttempts();
    
    const viewport = document.getElementById('scanner-viewport');
    if (viewport) {
      const engineText = this.scannerEngine === 'native' ? 'native browser' : 'Quagga.js';
      
      if (this.isIOS) {
        // iOS-specific error messaging
        viewport.innerHTML = `
          <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: white; text-align: center; padding: 20px;">
            <div style="font-size: 3rem; margin-bottom: 1rem;">📷</div>
            <h3>iPhone Camera Access Required</h3>
            <p style="line-height: 1.5; margin-bottom: 1rem;">iPhone requires HTTPS and camera permission.<br/>
            Please ensure you've allowed camera access in Safari settings.</p>
            <button onclick="window.scannerController.startScanning()" style="margin-top: 1rem; padding: 0.5rem 1rem; background: #1e40af; color: white; border: none; border-radius: 8px; cursor: pointer;">Try Again</button>
            <p style="font-size: 0.9rem; margin-top: 1rem; opacity: 0.8;">Using ${engineText} on iOS</p>
          </div>
        `;
      } else {
        // Standard error messaging
        viewport.innerHTML = `
          <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: white; text-align: center; padding: 20px;">
            <div style="font-size: 3rem; margin-bottom: 1rem;">📷</div>
            <h3>Camera Access Required</h3>
            <p>Please allow camera access to scan barcodes using ${engineText}, or use manual entry below.</p>
            <button onclick="window.scannerController.startScanning()" style="margin-top: 1rem; padding: 0.5rem 1rem; background: #1e40af; color: white; border: none; border-radius: 8px; cursor: pointer;">Try Again</button>
          </div>
        `;
      }
    }
  }

  // Cleanup method
  destroy() {
    this.stopScanning();
  }
}

// Export with legacy class name for compatibility
export { HybridScannerController as ScannerController }; 