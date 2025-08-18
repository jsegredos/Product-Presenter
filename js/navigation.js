import { StorageManager } from './storage.js';
import { dataLayer } from './modules.js';
import { config } from './config-manager.js';
import { Utils } from './utils.js';

// Navigation and screen management
export class NavigationManager {
  constructor() {
    this.currentScreen = 'welcome';
    this.currentSearchResults = [];
  }

  async init() {
    // Load product catalog
    try {
      await dataLayer.init();
    } catch (error) {
      console.error('Failed to load product catalog:', error);
    }

    // Load version information
    await this.loadVersion();

    // Update selection count for when we show product lookup screen
    this.updateSelectionCount();

    // Retry version loading after a short delay in case of timing issues
    setTimeout(() => this.loadVersion(), 1000);
  }


  async loadVersion() {
    try {
      // Try to load version.txt, but handle GitHub Pages deployment gracefully
      const response = await fetch('./version.txt');
      if (response.ok) {
        const version = await response.text();
        const versionElement = document.getElementById('version-number');
        if (versionElement) {
          const lines = version.trim().split('\n').filter(line => line.trim() !== '');
          const latestVersion = lines.length > 0 ? lines[lines.length - 1] : 'Unknown';
          // Extract just the version number (before the first dash)
          const versionNumber = latestVersion.split(' - ')[0] || latestVersion;
          versionElement.innerText = versionNumber;
          // Fallback: if still empty, set a default version
          if (!versionElement.innerText.trim()) {
            versionElement.innerText = 'v2.1.0';
          }
        }
      } else {
        throw new Error('Version file not found');
      }
    } catch (error) {
      // For GitHub Pages, use the version from config manager as fallback
      const versionElement = document.getElementById('version-number');
      if (versionElement) {
        const configVersion = config.get('app.version') || 'v2.1.0';
        versionElement.innerText = configVersion;
      } else {
        // If element not found, retry after a short delay
        setTimeout(() => {
          const el = document.getElementById('version-number');
          if (el && !el.innerText.trim()) {
            const configVersion = config.get('app.version') || 'v2.1.0';
            el.innerText = configVersion;
          }
        }, 1000);
      }
      console.info('Version loaded from config (GitHub Pages mode)');
    }
  }


  async showProductLookupScreen() {
    try {
      const response = await fetch('./screens/product-grid.html');
      const html = await response.text();
      document.body.innerHTML = html;
      this.currentScreen = 'product-grid';
      // Dynamically re-inject app.js to re-initialize all logic
      const script = document.createElement('script');
      script.type = 'module';
      script.src = 'js/app.js';
      document.body.appendChild(script);
      // Remove any back button artifacts from the grid screen
      setTimeout(() => {
        document.querySelectorAll('.back-btn').forEach(btn => btn.remove());
      }, 100);

      // Initialize grid interface
      if (window.productGridManager) {
        window.productGridManager.init();
      }

      // Load version information for the grid screen
      await this.loadVersion();

      // Retry version loading after a short delay in case of timing issues
      setTimeout(() => this.loadVersion(), 1000);
    } catch (error) {
      console.error('Failed to load product grid screen:', error);
    }
  }

  setupSplitInterface() {
    // Setup back button
    const backBtn = document.getElementById('back-to-home');
    if (backBtn) {
      backBtn.onclick = () => location.reload(); // Go to home screen
    }

    // Setup action buttons
    const downloadBtn = document.getElementById('download-btn');
    const clearAllBtn = document.getElementById('clear-all-btn');

    if (downloadBtn) {
      downloadBtn.onclick = () => this.showDownloadFormModal();
    }

    if (clearAllBtn) {
      clearAllBtn.onclick = () => this.showClearConfirmModal();
    }

    // Setup product search
    this.setupSplitProductSearch();

    // Setup review table
    this.setupReviewTable();

    // Load initial data and render
    this.renderReviewTable();
    this.loadInitialSearchResults();
  }

  setupSplitProductSearch() {
    const input = document.getElementById('product-search-input');
    const resultsList = document.getElementById('search-results-list');
    const loadingState = document.getElementById('search-loading');
    const noResultsState = document.getElementById('search-no-results');

    if (!input || !resultsList) {return;}

    const matches = [];

    // Debounced search function
    const debouncedSearch = Utils.debounce((query) => {
      this.performSplitProductSearch(query, resultsList, matches, loadingState, noResultsState);
    }, 200);

    input.addEventListener('input', () => {
      const query = input.value.trim();
      if (query) {
        debouncedSearch(query);
      } else {
        // Show all products when search is empty
        this.loadInitialSearchResults();
      }
    });

    // Show product details when clicking on a result
    resultsList.addEventListener('click', (e) => {
      const item = e.target.closest('.result-item');
      if (!item) {return;}

      const idx = parseInt(item.getAttribute('data-idx'), 10);
      const currentResults = matches.length > 0 ? matches : (this.currentSearchResults || []);

      if (!isNaN(idx) && currentResults[idx]) {
        this.showSplitProductDetails(currentResults[idx]);
      }
    });
  }

  performSplitProductSearch(query, resultsList, matches, loadingState, noResultsState) {
    if (!dataLayer.isLoaded) {
      loadingState.style.display = 'flex';
      noResultsState.style.display = 'none';
      resultsList.innerHTML = '';
      return;
    }

    matches.length = 0;
    matches.push(...dataLayer.searchProducts(query));

    loadingState.style.display = 'none';

    if (matches.length === 0) {
      noResultsState.style.display = 'flex';
      resultsList.innerHTML = '';
    } else {
      noResultsState.style.display = 'none';
      resultsList.innerHTML = matches
        .map((p, i) => `
          <div class="result-item" data-idx="${i}">
            <span class="result-code">${Utils.sanitizeInput(p.OrderCode || p.Code || '')}</span> - ${Utils.sanitizeInput(p.Description || p.ProductName || p['Product Name'] || '')}
          </div>
        `)
        .join('');
    }
  }

  async loadInitialSearchResults() {
    const resultsList = document.getElementById('search-results-list');
    const loadingState = document.getElementById('search-loading');
    const noResultsState = document.getElementById('search-no-results');

    if (!resultsList) {return;}

    if (!dataLayer.isLoaded) {
      loadingState.style.display = 'flex';
      noResultsState.style.display = 'none';
      resultsList.innerHTML = '';

      // Wait for data to load and try again
      setTimeout(() => this.loadInitialSearchResults(), 500);
      return;
    }

    // Show first 50 products initially
    const allProducts = dataLayer.getAllProducts().slice(0, 50);

    loadingState.style.display = 'none';
    noResultsState.style.display = 'none';

    resultsList.innerHTML = allProducts
      .map((p, i) => `
        <div class="result-item" data-idx="${i}">
          <span class="result-code">${Utils.sanitizeInput(p.OrderCode || p.Code || '')}</span> - ${Utils.sanitizeInput(p.Description || p.ProductName || p['Product Name'] || '')}
        </div>
      `)
      .join('');

    // Store for click handling
    this.currentSearchResults = allProducts;
  }

  showSplitProductDetails(product) {
    const detailsPanel = document.getElementById('product-details');
    const productImage = document.getElementById('product-image');
    const productName = document.getElementById('product-name');
    const productCode = document.getElementById('product-code');
    const productPrice = document.getElementById('product-price');
    const productRoom = document.getElementById('product-room');
    const productQuantity = document.getElementById('product-quantity');
    const productNotes = document.getElementById('product-notes');
    const addBtn = document.getElementById('add-product-btn');
    const closeBtn = document.getElementById('close-details');

    if (!detailsPanel) {return;}

    // Populate product details
    if (productImage) {
      const imageUrl = product.Image || product.Image_URL || product.imageUrl || 'assets/no-image.png';
      productImage.src = imageUrl;
      productImage.alt = product.Description || product.ProductName || product['Product Name'] || 'Product Image';
    }

    if (productName) {
      productName.textContent = product.Description || product.ProductName || product['Product Name'] || '';
    }

    if (productCode) {
      productCode.textContent = product.OrderCode || product.Code || '';
    }

    if (productPrice) {
      const price = product.RRP_EX || product['RRP EX GST'] || product['RRP_EX'] || product.RRP_EXGST || product.rrpExGst || product.RRP_INCGST || product['RRP INC GST'] || 0;
      productPrice.textContent = price ? `$${parseFloat(price).toFixed(2)}` : 'Price not available';
    }

    // Setup room dropdown
    this.populateRoomSelect(productRoom);

    // Reset form
    if (productQuantity) {productQuantity.value = 1;}
    if (productNotes) {productNotes.value = '';}

    // Setup event handlers
    if (closeBtn) {
      closeBtn.onclick = () => {
        detailsPanel.style.display = 'none';
      };
    }

    if (addBtn) {
      addBtn.onclick = () => {
        const room = productRoom ? productRoom.value : 'Blank';
        const quantity = productQuantity ? parseInt(productQuantity.value) || 1 : 1;
        const notes = productNotes ? productNotes.value.trim() : '';

        this.addProductToSplitSelection(product, room, quantity, notes);
        detailsPanel.style.display = 'none';
      };
    }

    // Show panel
    detailsPanel.style.display = 'block';
  }

  async showProductDetailsScreen(product, options = {}) {
    try {
      const response = await fetch('./screens/product-details.html');
      const html = await response.text();
      document.body.innerHTML = html;

      this.currentScreen = 'product-details';
      this.populateProductDetails(product, options);
      this.setupProductDetailsHandlers(product);
    } catch (error) {
      console.error('Failed to load product details screen:', error);
    }
  }

  populateProductDetails(product, options) {
    // Set product image - use original simple approach
    const productImage = document.getElementById('product-image');
    if (productImage) {
      productImage.src = product.Image_URL || 'assets/no-image.png';
      productImage.onerror = function() {
        this.src = 'assets/no-image.png';
      };
    }

    // Set product name and details - using original format
    document.getElementById('product-name').textContent = product.Description || '';
    document.getElementById('product-code').textContent = product.OrderCode ? `Code: ${product.OrderCode}` : '';

    // Price formatting - now defaults to ex GST
    let price = '';
    let priceNum = NaN;
    // Check multiple possible price field names for better compatibility
    const exGstPrice = product.RRP_EX || product['RRP EX GST'] || product['RRP_EX'] || product.RRP_EXGST || product.rrpExGst || product.RRP_INCGST || product['RRP INC GST'];
    if (exGstPrice) {
      priceNum = parseFloat(exGstPrice.toString().replace(/,/g, ''));
    }
    if (!isNaN(priceNum) && priceNum > 0) {
      price = `$${priceNum.toFixed(2)} ex GST`;
    } else {
      price = 'Price unavailable';
    }
    document.getElementById('product-price-inline').textContent = price;
    document.getElementById('product-description').textContent = product.LongDescription || '';

    // Setup links like original
    this.setLink('datasheet-link', product.Datasheet_URL);
    this.setLink('diagram-link', product.Diagram_URL);
    this.setLink('website-link', product.Website_URL);

    // Set product links to always open in a new tab/window like original
    const diagramLink = document.getElementById('diagram-link');
    const datasheetLink = document.getElementById('datasheet-link');
    const websiteLink = document.getElementById('website-link');
    [diagramLink, datasheetLink, websiteLink].forEach(link => {
      if (link) {
        link.setAttribute('target', '_blank');
        link.setAttribute('rel', 'noopener noreferrer');
      }
    });

    // --- VARIANT DROPDOWN LOGIC ---
    this.setupVariantDropdown(product, options);

    // Setup room select and quantity
    this.populateRoomSelect();
    this.setupQuantitySelect();
    this.setupAnnotationField();
    this.setupAnnotationCharacterCount(options);

    // Restore quantity if passed in options
    if (options.quantity) {
      const qtyInput = document.getElementById('product-quantity');
      if (qtyInput) {qtyInput.value = options.quantity;}
    }

    // Show scan feedback if scanned
    if (options.scannedCode) {
      this.showScanFeedback(`Successfully scanned: ${options.scannedCode}`);
    }
  }

  populateRoomSelect(roomSelect = null) {
    const select = roomSelect || document.getElementById('room-select');
    if (!select) {return;}

    select.innerHTML = '<option value="Blank">Blank</option>';

    // Add predefined rooms
    const predefinedRooms = config.get('rooms.predefined', []);
    predefinedRooms.forEach(room => {
      const option = document.createElement('option');
      option.value = room.name;
      option.textContent = room.name;
      select.appendChild(option);
    });

    // Add custom rooms
    const customRooms = StorageManager.getCustomRooms();
    customRooms.forEach(room => {
      const option = document.createElement('option');
      option.value = room.name;
      option.textContent = room.name;
      select.appendChild(option);
    });

    // Add "Add new room..." option
    const addOption = document.createElement('option');
    addOption.value = '__ADD_NEW_ROOM__';
    addOption.textContent = '➕ Add new room...';
    addOption.style.fontWeight = 'bold';
    addOption.style.color = '#2563eb';
    select.appendChild(addOption);

    // Default to "Blank"
    select.value = 'Blank';

    // Add event listener for room selection change
    select.removeEventListener('change', this.handleRoomSelectChange.bind(this));
    select.addEventListener('change', this.handleRoomSelectChange.bind(this));
  }

  setupQuantitySelect() {
    const select = document.getElementById('product-quantity');
    if (!select) {return;}

    select.innerHTML = '';
    const quantityOptions = config.get('ui.quantityOptions', [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    quantityOptions.forEach(qty => {
      const option = document.createElement('option');
      option.value = qty;
      option.textContent = qty.toString();
      select.appendChild(option);
    });
  }

  setLink(id, url) {
    const el = document.getElementById(id);
    if (url && url !== '#') {
      el.href = url;
      el.style.display = '';
    } else {
      el.style.display = 'none';
    }
  }

  setupVariantDropdown(product, options) {
    const variantRow = document.getElementById('variant-select-row');
    const variantSelect = document.getElementById('variant-select');

    if (variantRow && variantSelect) {
      let productName = product.ProductName || product['Product Name'] || '';
      if (typeof productName === 'string') {productName = productName.trim();}
      let variants = [];

      if (productName) {
        variants = dataLayer.getAllProducts().filter(p => {
          let pName = p.ProductName || p['Product Name'] || '';
          if (typeof pName === 'string') {pName = pName.trim();}
          return pName && pName === productName;
        });
      }

      if (variants.length > 1) {
        // Sort alphabetically by Description
        variants.sort((a, b) => (a.Description || '').localeCompare(b.Description || ''));
        variantRow.style.display = '';
        variantSelect.innerHTML = variants.map(v =>
          `<option value="${v.OrderCode}"${v.OrderCode === product.OrderCode ? ' selected' : ''}>${v.Description}</option>`
        ).join('');

        variantSelect.onchange = () => {
          const selectedCode = variantSelect.value;
          const selected = variants.find(v => v.OrderCode === selectedCode);
          if (selected && selected.OrderCode !== product.OrderCode) {
            // Keep notes and quantity if present
            const notes = document.getElementById('product-annotation')?.value || options.notes || '';
            const qtyInput = document.getElementById('product-quantity');
            let quantity = 1;
            if (qtyInput && qtyInput.value) {
              quantity = Math.max(1, parseInt(qtyInput.value, 10) || 1);
            } else if (options.quantity) {
              quantity = options.quantity;
            }
            this.showProductDetailsScreen(selected, { notes, quantity });
          }
        };
      } else {
        variantRow.style.display = 'none';
      }
    }
  }

  setupAnnotationCharacterCount(options) {
    const annotationInput = document.getElementById('product-annotation');
    const charCount = document.getElementById('annotation-char-count');

    if (annotationInput && charCount) {
      annotationInput.addEventListener('input', () => {
        // Prevent carriage returns
        annotationInput.value = annotationInput.value.replace(/\r?\n|\r/g, ' ');
        charCount.textContent = `${annotationInput.value.length}/140`;
      });
      annotationInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {e.preventDefault();}
      });
      charCount.textContent = `${annotationInput.value.length}/140`;
      // Restore notes if passed in options
      if (options.notes) {annotationInput.value = options.notes;}
    }
  }

  setupAnnotationField() {
    // Now handled by setupAnnotationCharacterCount
  }

  setupProductDetailsHandlers(product) {
    const backBtn = document.getElementById('back-to-grid');
    const addBtn = document.getElementById('add-to-room-btn');

    if (backBtn) {
      backBtn.onclick = () => this.showProductLookupScreen();
    }

    if (addBtn) {
      addBtn.onclick = () => this.addProductToSelection(product);
    }
  }

  addProductToSelection(product) {
    const roomSelect = document.getElementById('room-select');
    const quantitySelect = document.getElementById('product-quantity');
    const annotationField = document.getElementById('product-annotation');

    const room = roomSelect ? roomSelect.value : 'Blank';
    const quantity = quantitySelect ? parseInt(quantitySelect.value) : 1;
    const notes = annotationField ? annotationField.value : '';

    if (StorageManager.addProductToSelection(product, notes, room, quantity)) {
      // Show split interface table view after adding
      this.showProductLookupScreen();
    } else {
      alert('Failed to add product to selection');
    }
  }

  addProductToSplitSelection(product, room, quantity, notes) {
    if (StorageManager.addProductToSelection(product, notes, room, quantity)) {
      // Update the review table in the split interface
      this.renderReviewTable();
      this.updateSelectionCount();
    } else {
      alert('Failed to add product to selection');
    }
  }

  setupReviewTable() {
    // Setup event delegation for inline editing and removal
    const tableBody = document.getElementById('review-table-body');
    if (!tableBody) {return;}

    // Handle quantity and room changes
    tableBody.addEventListener('change', (e) => {
      if (e.target.classList.contains('quantity-input')) {
        this.handleQuantityChange(e.target);
      } else if (e.target.classList.contains('room-select')) {
        this.handleRoomChange(e.target);
      }
    });

    // Handle remove buttons
    tableBody.addEventListener('click', (e) => {
      if (e.target.classList.contains('remove-btn')) {
        this.handleRemoveProduct(e.target);
      }
    });
  }

  renderReviewTable() {
    const tableContainer = document.getElementById('review-table');
    const emptyState = document.getElementById('review-table-empty');
    const tableBody = document.getElementById('review-table-body');
    const totalItems = document.getElementById('total-items');
    const totalValue = document.getElementById('total-value');

    if (!tableContainer || !emptyState || !tableBody) {return;}

    const selectedProducts = StorageManager.getSelectedProducts();

    if (selectedProducts.length === 0) {
      tableContainer.style.display = 'none';
      emptyState.style.display = 'flex';
      if (totalItems) {totalItems.textContent = '0 items';}
      if (totalValue) {totalValue.textContent = '$0.00';}
      return;
    }

    emptyState.style.display = 'none';
    tableContainer.style.display = 'flex';

    // Calculate totals
    let itemCount = 0;
    let totalPrice = 0;

    selectedProducts.forEach(item => {
      itemCount += item.quantity;
      const price = item.product.Price || item.product.RRP_INCGST || item.product.rrpIncGst || 0;
      if (price) {
        totalPrice += parseFloat(price) * item.quantity;
      }
    });

    if (totalItems) {totalItems.textContent = `${itemCount} items`;}
    if (totalValue) {totalValue.textContent = `$${totalPrice.toFixed(2)}`;}

    // Render table rows
    tableBody.innerHTML = selectedProducts.map((item, index) => {
      const product = item.product;
      const price = product.RRP_EX || product['RRP EX GST'] || product['RRP_EX'] || product.RRP_EXGST || product.rrpExGst || product.RRP_INCGST || product['RRP INC GST'] || 0;
      const unitPrice = parseFloat(price) || 0;
      const lineTotal = unitPrice * item.quantity;
      const imageUrl = product.Image || product.Image_URL || product.imageUrl || 'assets/no-image.png';

      return `
        <div class="table-row" data-index="${index}">
          <div class="col-image">
            <img class="table-product-image" src="${imageUrl}" alt="Product" onerror="this.src='assets/no-image.png';">
          </div>
          <div class="col-product">
            <div class="product-info">
              <div class="product-name">${Utils.sanitizeInput(product.Description || product.ProductName || product['Product Name'] || '')}</div>
              <div class="product-code">${Utils.sanitizeInput(product.OrderCode || product.Code || '')}</div>
              ${item.notes ? `<div class="product-notes">${Utils.sanitizeInput(item.notes)}</div>` : ''}
            </div>
          </div>
          <div class="col-room">
            <select class="room-select" data-index="${index}">
              ${this.getRoomOptions(item.room)}
            </select>
          </div>
          <div class="col-price-ea">
            <div class="price-display">${unitPrice ? `$${unitPrice.toFixed(2)}` : 'N/A'}</div>
          </div>
          <div class="col-qty">
            <input type="number" class="quantity-input" data-index="${index}" value="${item.quantity}" min="1" step="1">
          </div>
          <div class="col-total">
            <div class="price-display">${unitPrice ? `$${lineTotal.toFixed(2)}` : 'N/A'}</div>
          </div>
          <div class="col-actions">
            <button class="remove-btn" data-index="${index}" title="Remove">×</button>
          </div>
        </div>
      `;
    }).join('');
  }

  getRoomOptions(selectedRoom) {
    let options = `<option value="Blank"${selectedRoom === 'Blank' ? ' selected' : ''}>Blank</option>`;

    const predefinedRooms = config.get('rooms.predefined', []);
    predefinedRooms.forEach(room => {
      options += `<option value="${room.name}"${selectedRoom === room.name ? ' selected' : ''}>${room.name}</option>`;
    });

    const customRooms = StorageManager.getCustomRooms();
    customRooms.forEach(room => {
      options += `<option value="${room.name}"${selectedRoom === room.name ? ' selected' : ''}>${room.name}</option>`;
    });

    // Add "Add new room..." option
    options += '<option value="__ADD_NEW_ROOM__" style="font-weight: bold; color: #2563eb;">➕ Add new room...</option>';

    return options;
  }

  handleQuantityChange(input) {
    const index = parseInt(input.getAttribute('data-index'));
    const newQuantity = Math.max(1, parseInt(input.value) || 1);

    // Update storage
    const selectedProducts = StorageManager.getSelectedProducts();
    if (selectedProducts[index]) {
      selectedProducts[index].quantity = newQuantity;
      StorageManager.setSelectedProducts(selectedProducts);

      // Re-render to update totals
      this.renderReviewTable();
      this.updateSelectionCount();
    }
  }

  handleRoomChange(select) {
    const index = parseInt(select.getAttribute('data-index'));
    let newRoom = select.value;

    if (newRoom === '__ADD_NEW_ROOM__') {
      // User selected "Add new room..." option
      const roomName = prompt('Enter new room name:');
      if (roomName && roomName.trim()) {
        const trimmedName = roomName.trim();
        if (StorageManager.addCustomRoom(trimmedName)) {
          // Successfully added room
          newRoom = trimmedName;
          console.log('✅ Added new room:', trimmedName);

          // Refresh the entire review table to update all dropdowns
          this.renderSelectionTable();
          return;
        } else {
          alert('Room name already exists or is invalid');
          // Reset to previous selection
          const selectedProducts = StorageManager.getSelectedProducts();
          if (selectedProducts[index]) {
            select.value = selectedProducts[index].room || 'Blank';
          }
          return;
        }
      } else {
        // User cancelled or entered empty name, reset selection
        const selectedProducts = StorageManager.getSelectedProducts();
        if (selectedProducts[index]) {
          select.value = selectedProducts[index].room || 'Blank';
        }
        return;
      }
    }

    // Update storage with normal room selection
    const selectedProducts = StorageManager.getSelectedProducts();
    if (selectedProducts[index]) {
      selectedProducts[index].room = newRoom;
      StorageManager.setSelectedProducts(selectedProducts);
      this.updateSelectionCount();
    }
  }

  handleRemoveProduct(button) {
    const index = parseInt(button.getAttribute('data-index'));

    // Remove from storage
    const selectedProducts = StorageManager.getSelectedProducts();
    if (selectedProducts[index]) {
      selectedProducts.splice(index, 1);
      StorageManager.setSelectedProducts(selectedProducts);

      // Re-render table
      this.renderReviewTable();
      this.updateSelectionCount();
    }
  }

  async showReviewScreen() {
    try {
      const response = await fetch('./screens/review.html');
      const html = await response.text();
      document.body.innerHTML = html;

      this.currentScreen = 'review';
      this.setupReviewScreenHandlers();
      this.renderReviewList();
    } catch (error) {
      console.error('Failed to load review screen:', error);
    }
  }

  setupReviewScreenHandlers() {
    const backBtn = document.getElementById('back-to-grid');
    const addMoreBtn = document.getElementById('add-more-btn');
    const quickPdfBtn = document.getElementById('quick-pdf-btn');

    if (backBtn) {
      backBtn.onclick = () => this.showProductLookupScreen();
    }

    if (addMoreBtn) {
      addMoreBtn.onclick = () => this.showProductLookupScreen();
    }

    if (quickPdfBtn) {
      quickPdfBtn.onclick = () => this.showDownloadFormModal();
    }
  }

  renderReviewList() {
    const reviewList = document.getElementById('review-list');
    const emptyState = document.getElementById('review-empty');

    if (!reviewList) {return;}

    const selectedProducts = StorageManager.getSelectedProducts();

    if (selectedProducts.length === 0) {
      reviewList.innerHTML = '';
      if (emptyState) {emptyState.style.display = 'block';}
      return;
    }

    if (emptyState) {emptyState.style.display = 'none';}

    // Group products by room - use original logic
    const byRoom = {};
    selectedProducts.forEach(item => {
      const room = item.room || 'Unassigned';
      if (!byRoom[room]) {byRoom[room] = [];}
      byRoom[room].push(item);
    });

    // Render using original HTML structure
    reviewList.innerHTML = Object.entries(byRoom).map(([room, items]) => `
      <div class="review-room-group">
        <div class="review-room-header">${room} <span class="room-count">(${items.length})</span></div>
        ${items.map((item, idx) => {
    const product = item.product;
    // Handle different field naming conventions (catalog vs imported)
    const description = product.Description || product.description || product.productName || product['Product Name'] || 'Product';
    const orderCode = product.OrderCode || product.orderCode || '';
    const imageUrl = product.Image_URL || product.imageUrl || 'assets/no-image.png';
    const rrpExGst = product.RRP_EX || product['RRP EX GST'] || product['RRP_EX'] || product.rrpExGst || product.RRP_EXGST || product.RRP_INCGST || product['RRP INC GST'] || '0';

    return `
          <div class="review-product-card" style="display: flex; flex-direction: column; align-items: stretch;">
            <div style="display: flex; flex-direction: row; align-items: flex-start;">
              <div class="review-product-thumb-wrap">
                <img class="review-product-thumb" src="${imageUrl}" alt="Product" onerror="this.src='assets/no-image.png';" onload="">
                <div class="review-qty-pill" data-room="${room}" data-idx="${idx}">
                  <button class="review-qty-btn${(item.quantity || 1) === 1 ? ' delete' : ''}" data-action="decrement" title="${(item.quantity || 1) === 1 ? 'Delete' : 'Decrease'}">
                    ${(item.quantity || 1) === 1 ? `<svg viewBox='0 0 64 64' width='64' height='64'><rect x='10' y='8' width='44' height='6' rx='3' fill='black'/><polygon points='7,18 57,18 52,58 12,58' fill='none' stroke='black' stroke-width='7'/></svg>` : '–'}
                  </button>
                  <span class="review-qty-value">${item.quantity || 1}</span>
                  <button class="review-qty-btn" data-action="increment" title="Increase">+</button>
                </div>
              </div>
              <div class="review-product-info">
                <div class="review-product-title">${description}</div>
                <div class="review-product-meta">
                  <span class="review-product-code">${orderCode ? `Code: ${orderCode}` : ''}</span>
                  <span class="review-product-price">${rrpExGst ? `$${Number(rrpExGst).toFixed(2)} ea (EX GST)` : ''}</span>
                </div>
                <div class="review-product-notes">${item.notes ? `Notes: ${item.notes}` : ''}</div>
              </div>
            </div>
          </div>
          `;
  }).join('')}
      </div>
    `).join('');

    // Setup quantity controls using original logic
    this.setupOriginalQuantityControls(byRoom);
  }

  groupProductsByRoom(products) {
    return products.reduce((groups, item) => {
      const room = item.room || 'Unassigned';
      if (!groups[room]) {groups[room] = [];}
      groups[room].push(item);
      return groups;
    }, {});
  }

  // Removed unused renderRoomGroup method

  // renderProductCard method removed - using inline HTML in renderReviewList for proper quantity controls

  setupOriginalQuantityControls(byRoom) {
    // Original quantity pill handlers
    document.querySelectorAll('.review-qty-pill').forEach(pill => {
      const room = pill.getAttribute('data-room');
      const idx = parseInt(pill.getAttribute('data-idx'), 10);
      pill.querySelectorAll('.review-qty-btn').forEach(btn => {
        btn.onclick = () => {
          const action = btn.getAttribute('data-action');
          const selectedProducts = StorageManager.getSelectedProducts();

          // Find the product to update using room and index
          let count = -1;
          const toUpdateIdx = selectedProducts.findIndex(item => {
            if (item.room === room) {count++;}
            return item.room === room && count === idx;
          });

          if (toUpdateIdx !== -1) {
            const product = selectedProducts[toUpdateIdx];
            const qty = parseInt(product.quantity, 10) || 1;

            if (action === 'increment') {
              StorageManager.updateProductQuantity(product.id, qty + 1);
            } else if (action === 'decrement') {
              if (qty === 1) {
                StorageManager.removeProductFromSelection(product.id);
              } else {
                StorageManager.updateProductQuantity(product.id, qty - 1);
              }
            }

            this.renderReviewList();
            this.updateSelectionCount();
          }
        };
      });
    });
  }

  // Removed unused setupQuantityControls and handleQuantityAction methods

  showDownloadFormModal() {
    const modal = document.getElementById('pdf-email-modal');
    if (modal) {
      modal.style.display = 'flex';
      const form = document.getElementById('pdf-email-form');
      const cancelBtn = document.getElementById('pdf-email-cancel');
      const downloadBtn = document.getElementById('pdf-email-send');
      // Remove Export CSV checkbox
      const exportCsvRow = form.querySelector('label[for="export-csv"]')?.parentElement;
      if (exportCsvRow) {exportCsvRow.style.display = 'none';}
      // Change button text
      if (downloadBtn) {downloadBtn.textContent = 'Download';}
      if (cancelBtn) {
        cancelBtn.onclick = () => {
          modal.style.display = 'none';
        };
      }
      if (form) {
        form.onsubmit = (e) => {
          e.preventDefault();
          this.handleDownloadFormSubmit();
          modal.style.display = 'none';
        };
      }
    }
  }

  handleDownloadFormSubmit() {
    console.log('🎯 handleDownloadFormSubmit called');
    const form = document.getElementById('pdf-email-form');
    if (!form) {
      console.error('❌ Form not found!');
      return;
    }
    const formData = new FormData(form);
    const userDetails = {
      name: formData.get('user-name'),
      project: formData.get('user-project'),
      address: formData.get('user-address'),
      email: formData.get('user-email'),
      telephone: formData.get('user-telephone'),
      excludePrice: formData.get('exclude-price') === 'on' || formData.get('exclude-prices') === 'on',
      excludeQty: formData.get('exclude-qty') === 'on',
      excludeLongDescription: formData.get('exclude-long-description') === 'on',
      includeGst: formData.get('include-gst') === 'on',
      exportCsv: true // Always true
    };

    console.log('📝 Navigation userDetails created:', userDetails);
    // Generate and download PDF and CSV
    window.dispatchEvent(new CustomEvent('generatePdf', { detail: userDetails }));
    // CSV download is handled in the PDF generator module
  }


  showClearConfirmModal() {
    const modal = document.getElementById('clear-selection-modal');
    if (modal) {
      modal.style.display = 'flex';

      const cancelBtn = document.getElementById('modal-cancel-btn');
      const confirmBtn = document.getElementById('modal-confirm-btn');

      if (cancelBtn) {
        cancelBtn.onclick = () => {
          modal.style.display = 'none';
        };
      }

      if (confirmBtn) {
        confirmBtn.onclick = () => {
          StorageManager.clearAllSelections();
          modal.style.display = 'none';
          this.updateSelectionCount();

          // Also re-render the grid if we're in the product grid interface
          if (this.currentScreen === 'product-grid') {
            if (window.productGridManager) {
              window.productGridManager.clearAll();
            }
          }
        };
      }
    }
  }


  updateSelectionCount() {
    const countElement = document.getElementById('selection-count');
    if (countElement) {
      countElement.textContent = StorageManager.getSelectionCount().toString();
    }
  }

  handleRoomSelectChange(event) {
    const select = event.target;
    const selectedValue = select.value;

    if (selectedValue === '__ADD_NEW_ROOM__') {
      // User selected "Add new room..." option
      const roomName = prompt('Enter new room name:');
      if (roomName && roomName.trim()) {
        const trimmedName = roomName.trim();
        if (StorageManager.addCustomRoom(trimmedName)) {
          // Successfully added room, refresh dropdown and select it
          this.populateRoomSelect(select);
          select.value = trimmedName;

          console.log('✅ Added new room:', trimmedName);
        } else {
          alert('Room name already exists or is invalid');
          // Reset to Blank
          select.value = 'Blank';
        }
      } else {
        // User cancelled or entered empty name, reset to Blank
        select.value = 'Blank';
      }
    }
    // Normal room selection doesn't need any special handling
  }
}
