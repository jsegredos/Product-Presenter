import { StorageManager } from './storage.js';
import { CONFIG, dataLayer } from './modules.js';
import { Utils } from './utils.js';

export class FileImportManager {
  constructor() {
    this.selectedFile = null;
    this.importMode = 'append';
    this.processedData = [];
    this.notFoundProducts = [];
  }

  init() {
    this.setupEventHandlers();
    console.log('FileImportManager initialized');
  }

  setupEventHandlers() {
    const importBtn = document.getElementById('import-file-btn');
    if (importBtn) {
      importBtn.onclick = () => this.showImportModal();
    }

    const dropZone = document.getElementById('file-drop-zone');
    const fileInput = document.getElementById('file-input');

    if (dropZone && fileInput) {
      dropZone.onclick = () => fileInput.click();

      dropZone.ondragover = (e) => {
        e.preventDefault();
        dropZone.style.borderColor = '#059669';
        dropZone.style.background = '#f0fdf4';
      };

      dropZone.ondragleave = (e) => {
        e.preventDefault();
        dropZone.style.borderColor = '#ccc';
        dropZone.style.background = '#fafafa';
      };

      dropZone.ondrop = (e) => {
        e.preventDefault();
        dropZone.style.borderColor = '#ccc';
        dropZone.style.background = '#fafafa';
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
          this.handleFileSelection(files[0]);
        }
      };

      fileInput.onchange = (e) => {
        if (e.target.files.length > 0) {
          this.handleFileSelection(e.target.files[0]);
        }
      };
    }

    const cancelBtn = document.getElementById('import-cancel-btn');
    const nextBtn = document.getElementById('import-next-btn');
    const backBtn = document.getElementById('import-back-btn');
    const processBtn = document.getElementById('import-process-btn');
    const closeBtn = document.getElementById('import-close-btn');

    if (cancelBtn) cancelBtn.onclick = () => this.closeModal();
    if (nextBtn) nextBtn.onclick = () => this.showImportModeStep();
    if (backBtn) backBtn.onclick = () => this.showFileSelectionStep();
    if (processBtn) processBtn.onclick = () => this.processImport();
    if (closeBtn) closeBtn.onclick = () => this.closeModal();

    const importModeInputs = document.querySelectorAll('input[name="import-mode"]');
    importModeInputs.forEach(input => {
      input.onchange = () => {
        this.importMode = input.value;
        const warningDiv = document.getElementById('override-warning');
        if (warningDiv) {
          warningDiv.style.display = this.importMode === 'override' ? 'block' : 'none';
        }
      };
    });
  }

  showImportModal() {
    const modal = document.getElementById('file-import-modal');
    if (modal) {
      modal.style.display = 'flex';
      this.resetModal();
    }
  }

  closeModal() {
    const modal = document.getElementById('file-import-modal');
    if (modal) {
      modal.style.display = 'none';
      this.resetModal();
    }
  }

  resetModal() {
    this.selectedFile = null;
    this.importMode = 'append';
    this.processedData = [];
    this.notFoundProducts = [];

    this.showFileSelectionStep();
    
    const fileInput = document.getElementById('file-input');
    if (fileInput) fileInput.value = '';
    
    const fileInfo = document.getElementById('selected-file-info');
    if (fileInfo) fileInfo.style.display = 'none';
    
    const nextBtn = document.getElementById('import-next-btn');
    if (nextBtn) nextBtn.disabled = true;

    const appendRadio = document.querySelector('input[name="import-mode"][value="append"]');
    if (appendRadio) appendRadio.checked = true;
    
    const warningDiv = document.getElementById('override-warning');
    if (warningDiv) warningDiv.style.display = 'none';
  }

  showFileSelectionStep() {
    this.hideAllSteps();
    const step = document.getElementById('file-selection-step');
    if (step) step.style.display = 'block';
  }

  showImportModeStep() {
    this.hideAllSteps();
    const step = document.getElementById('import-mode-step');
    if (step) step.style.display = 'block';
  }

  showProcessingStep() {
    this.hideAllSteps();
    const step = document.getElementById('import-processing-step');
    if (step) step.style.display = 'block';
  }

  showResultsStep() {
    this.hideAllSteps();
    const step = document.getElementById('import-results-step');
    if (step) step.style.display = 'block';
  }

  hideAllSteps() {
    const steps = [
      'file-selection-step',
      'import-mode-step', 
      'import-processing-step',
      'import-results-step'
    ];
    
    steps.forEach(stepId => {
      const step = document.getElementById(stepId);
      if (step) step.style.display = 'none';
    });
  }

  handleFileSelection(file) {
    console.log('File selected:', file.name, file.type, file.size);
    
    const validTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];
    
    const isValidExtension = file.name.toLowerCase().endsWith('.csv') || 
                           file.name.toLowerCase().endsWith('.xlsx');
    
    if (!validTypes.includes(file.type) && !isValidExtension) {
      alert('Please select a CSV or Excel (.xlsx) file.');
      return;
    }

    this.selectedFile = file;
    
    const fileInfo = document.getElementById('selected-file-info');
    const fileName = document.getElementById('selected-file-name');
    const nextBtn = document.getElementById('import-next-btn');
    
    if (fileInfo && fileName && nextBtn) {
      fileName.textContent = file.name;
      fileInfo.style.display = 'block';
      nextBtn.disabled = false;
    }
  }

  async processImport() {
    if (!this.selectedFile) {
      alert('No file selected');
      return;
    }

    console.log('Starting import process with mode:', this.importMode);
    this.showProcessingStep();

    try {
      let data;
      if (this.selectedFile.name.toLowerCase().endsWith('.csv')) {
        data = await this.parseCSV(this.selectedFile);
      } else {
        data = await this.parseExcel(this.selectedFile);
      }

      console.log('Parsed data:', data);

      if (this.importMode === 'override') {
        StorageManager.clearAllSelections();
        console.log('Cleared all existing data for override mode');
      }

      await this.processDataChunked(data);
      this.showImportResults();

    } catch (error) {
      console.error('Import failed:', error);
      alert('Import failed: ' + error.message);
      this.showFileSelectionStep();
    }
  }

  async parseCSV(file) {
    return new Promise((resolve, reject) => {
      if (typeof Papa === 'undefined') {
        reject(new Error('Papa Parse library not loaded'));
        return;
      }
      this.doPapaParseCSV(file, resolve, reject);
    });
  }

  doPapaParseCSV(file, resolve, reject) {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        console.log('CSV parsing complete:', results);
        resolve(results.data);
      },
      error: (error) => {
        console.error('CSV parsing error:', error);
        reject(error);
      }
    });
  }

  async parseExcel(file) {
    try {
      // Load XLSX library if not already loaded
      if (typeof XLSX === 'undefined') {
        await Utils.loadScript('https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js');
      }
    } catch (error) {
      throw new Error('Failed to load XLSX library');
    }

    return new Promise((resolve, reject) => {
      if (typeof XLSX === 'undefined') {
        reject(new Error('XLSX library not loaded'));
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          
          const jsonData = XLSX.utils.sheet_to_json(worksheet, {
            header: 1,
            defval: ''
          });

          if (jsonData.length === 0) {
            reject(new Error('Excel file is empty'));
            return;
          }

          const headers = jsonData[0];
          const rows = jsonData.slice(1);
          
          const objectData = rows.map(row => {
            const obj = {};
            headers.forEach((header, index) => {
              obj[header] = row[index] || '';
            });
            return obj;
          });

          console.log('Excel parsing complete:', objectData);
          resolve(objectData);
        } catch (error) {
          console.error('Excel parsing error:', error);
          reject(error);
        }
      };
      
      reader.onerror = () => {
        reject(new Error('Failed to read Excel file'));
      };
      
      reader.readAsArrayBuffer(file);
    });
  }

  async processDataChunked(data) {
    if (data.length === 0) {
      throw new Error('No data to process');
    }

    const columnMapping = this.detectColumns(data[0]);
    console.log('Detected column mapping:', columnMapping);

    if (!columnMapping.productCode) {
      throw new Error('Could not find Product Code column. Please ensure your file has a column named like "Order Code", "Product Code", or "SKU".');
    }

    this.processedData = [];
    this.notFoundProducts = [];

    const chunkSize = 50;
    for (let i = 0; i < data.length; i += chunkSize) {
      const chunk = data.slice(i, i + chunkSize);
      await this.processChunk(chunk, columnMapping);
      
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    console.log('Processing complete. Processed:', this.processedData.length, 'Not found:', this.notFoundProducts.length);
  }

  detectColumns(sampleRow) {
    const headers = Object.keys(sampleRow);
    console.log('Available headers:', headers);

    return {
      productCode: this.findColumnByPatterns(headers, ['ordercode', 'productcode', 'sku', 'order code', 'product code']),
      productName: this.findColumnByPatterns(headers, ['product name', 'description', 'name']),
      quantity: this.findColumnByPatterns(headers, ['min order quantity', 'quantity', 'qty', 'orderquantity']),
      price: headers.find(h => h.toLowerCase() === 'price per unit')
    };
  }

  findColumnByPatterns(headers, patterns) {
    for (const pattern of patterns) {
      const found = headers.find(h => 
        h.toLowerCase().includes(pattern.toLowerCase())
      );
      if (found) return found;
    }
    return null;
  }

  async processChunk(chunk, columnMapping) {
    for (const row of chunk) {
      await this.processRow(row, columnMapping);
    }
  }

  async processRow(row, columnMapping) {
    const productCode = columnMapping.productCode ? row[columnMapping.productCode] : '';
    const productName = columnMapping.productName ? row[columnMapping.productName] : '';
    const quantityStr = columnMapping.quantity ? row[columnMapping.quantity] : '1';
    const priceStr = columnMapping.price ? row[columnMapping.price] : '';

    // Skip rows with N/A product codes (exclude completely)
    if (!productCode || String(productCode).trim().toLowerCase() === 'n/a') {
      console.log('Excluding row with N/A or missing product code');
      return;
    }

    // Only process rows with valid 6-digit product codes
    const codeStr = String(productCode).trim();
    if (!/^\d{6}$/.test(codeStr)) {
      console.log('Excluding row - product code is not 6 digits:', codeStr);
      return;
    }

    const quantity = parseInt(quantityStr) || 1;
    
    let price = 0;
    if (priceStr) {
      const cleanPriceStr = String(priceStr).replace(/[^\d.-]/g, '');
      price = parseFloat(cleanPriceStr) || 0;
      
      if (price > 0) {
        price = price * 1.1;
      }
    }

    console.log('Processing valid 6-digit product code:', { productCode: codeStr, productName, quantity, price });

    const catalogProduct = await this.findProductInCatalog(codeStr, productName);
    
    // Create product using imported data, with catalog data as fallback
    // Use catalog field naming conventions for consistency
    const productToAdd = {
      OrderCode: codeStr,
      orderCode: codeStr,
      productName: productName || (catalogProduct ? catalogProduct.productName : 'Unknown Product'),
      'Product Name': productName || (catalogProduct ? catalogProduct['Product Name'] : 'Unknown Product'),
      Description: productName || (catalogProduct ? catalogProduct.Description : 'Unknown Product'),
      description: productName || (catalogProduct ? catalogProduct.description : 'Unknown Product'),
      price: price > 0 ? price.toFixed(2) : (catalogProduct ? catalogProduct.price : '0.00'),
      Image_URL: catalogProduct ? (catalogProduct.Image_URL || catalogProduct.imageUrl) : 'assets/no-image.png',
      imageUrl: catalogProduct ? (catalogProduct.Image_URL || catalogProduct.imageUrl) : 'assets/no-image.png',
      Website_URL: catalogProduct ? (catalogProduct.Website_URL || catalogProduct.websiteUrl) : '',
      websiteUrl: catalogProduct ? (catalogProduct.Website_URL || catalogProduct.websiteUrl) : '',
      Diagram_URL: catalogProduct ? (catalogProduct.Diagram_URL || catalogProduct.diagramUrl) : '',
      diagramUrl: catalogProduct ? (catalogProduct.Diagram_URL || catalogProduct.diagramUrl) : '',
      Datasheet_URL: catalogProduct ? (catalogProduct.Datasheet_URL || catalogProduct.datasheetUrl) : '',
      datasheetUrl: catalogProduct ? (catalogProduct.Datasheet_URL || catalogProduct.datasheetUrl) : '',
      RRP_EXGST: price > 0 ? (price / 1.1).toFixed(2) : (catalogProduct ? (catalogProduct.RRP_EXGST || catalogProduct.rrpExGst) : '0.00'),
      rrpExGst: price > 0 ? (price / 1.1).toFixed(2) : (catalogProduct ? (catalogProduct.RRP_EXGST || catalogProduct.rrpExGst) : '0.00'),
      RRP_INCGST: price > 0 ? price.toFixed(2) : (catalogProduct ? (catalogProduct.RRP_INCGST || catalogProduct.rrpIncGst) : '0.00'),
      rrpIncGst: price > 0 ? price.toFixed(2) : (catalogProduct ? (catalogProduct.RRP_INCGST || catalogProduct.rrpIncGst) : '0.00')
    };
    
    if (catalogProduct) {
      console.log('Found product in catalog, using imported data with catalog fallbacks:', codeStr);
    } else {
      console.log('Product not found in catalog, creating with imported data:', codeStr);
      
      // Track products not found in catalog for alert display
      this.notFoundProducts.push({
        orderCode: codeStr,
        productName: productName || 'Unknown Product',
        quantity: quantity,
        price: price > 0 ? price.toFixed(2) : 'N/A'
      });
    }

    StorageManager.addProductToSelection(productToAdd, '', 'Blank', quantity);
    this.processedData.push({
      ...productToAdd,
      quantity: quantity,
      notes: '',
      room: 'Blank'
    });
  }

  async findProductInCatalog(productCode, productName) {
    const catalog = dataLayer.getAllProducts();
    
    if (productCode) {
      // Convert both to strings for comparison to handle number vs string issues
      const codeStr = String(productCode).trim();
      const byCode = catalog.find(p => {
        // Check various field name patterns for order code
        const orderCodeFields = [p.OrderCode, p.orderCode, p['Order Code'], p.order_code];
        return orderCodeFields.some(field => 
          field && String(field).trim().toLowerCase() === codeStr.toLowerCase()
        );
      });
      if (byCode) {
        console.log('Found product in catalog by code:', codeStr, byCode);
        return byCode;
      }
    }

    if (productName) {
      const nameStr = String(productName).trim().toLowerCase();
      const byName = catalog.find(p => {
        const fields = [
          p.productName,
          p['Product Name'], 
          p.description,
          p.Description,
          p.LongDescription
        ];
        
        return fields.some(field => 
          field && String(field).trim().toLowerCase() === nameStr
        );
      });
      if (byName) {
        console.log('Found product in catalog by name:', productName, byName);
        return byName;
      }
    }

    console.log('Product not found in catalog:', { productCode, productName });
    return null;
  }

  showImportResults() {
    this.showResultsStep();
    
    const summaryElement = document.getElementById('import-summary');
    const notFoundContainer = document.getElementById('not-found-products');
    const notFoundListElement = document.getElementById('not-found-list');

    if (summaryElement) {
      summaryElement.innerHTML = `
        <p><strong>Total processed:</strong> ${this.processedData.length}</p>
        <p><strong>Products added:</strong> ${this.processedData.length}</p>
        <p style="color: #059669;"><strong>All products imported successfully!</strong></p>
      `;
    }

    // Show not found products as informational alert
    if (notFoundContainer && notFoundListElement) {
      if (this.notFoundProducts.length > 0) {
        // Update heading to be informational rather than error
        const heading = notFoundContainer.querySelector('h5');
        if (heading) {
          heading.textContent = 'Products added with placeholder information:';
          heading.style.color = '#2563eb'; // Blue instead of red
        }
        
        const listHtml = this.notFoundProducts.map(product => 
          `<li><strong>${product.orderCode}</strong> - ${product.productName} (Qty: ${product.quantity}, Price: ${product.price})</li>`
        ).join('');
        notFoundListElement.innerHTML = `<ul>${listHtml}</ul>`;
        notFoundContainer.style.display = 'block';
        
        // Change the container styling to be informational
        notFoundContainer.style.borderColor = '#2563eb';
        notFoundContainer.style.backgroundColor = '#eff6ff';
      } else {
        notFoundContainer.style.display = 'none';
      }
    }

    // Add navigation button if products were successfully added
    const doneBtn = document.getElementById('import-close-btn');
    if (doneBtn && this.processedData.length > 0) {
      doneBtn.textContent = 'View Products';
      doneBtn.onclick = () => {
        this.closeModal();
        
        // If we're already in the grid interface, refresh it
        if (window.navigationManager && window.navigationManager.currentScreen === 'product-grid' && window.productGridManager) {
          // Reload the grid with imported data
          window.productGridManager.loadExistingProducts();
          window.productGridManager.renderGrid();
          window.productGridManager.updateTotals();
        } else if (window.navigationManager && window.navigationManager.showProductLookupScreen) {
          // Navigate to product grid interface
          window.navigationManager.showProductLookupScreen();
        }
      };
    }

    console.log('Import results displayed');
  }
} 