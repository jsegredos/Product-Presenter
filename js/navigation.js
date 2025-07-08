import { StorageManager } from './storage.js';
import { CONFIG, dataLayer } from './modules.js';
import { Utils } from './utils.js';

// Navigation and screen management
export class NavigationManager {
  constructor() {
    this.currentScreen = 'welcome';
    this.selectedRoom = null;
  }

  async init() {
    // Load product catalog
    try {
      await dataLayer.init();
    } catch (error) {
      console.error('Failed to load product catalog:', error);
    }

    // Setup welcome screen
    this.setupWelcomeScreen();
    this.updateSelectionCount();
  }

  setupWelcomeScreen() {
    const startBtn = document.getElementById('start-btn');
    const editRoomsBtn = document.getElementById('edit-rooms-btn');
    const viewSelectionBtn = document.getElementById('view-selection-btn');
    const clearSelectionBtn = document.getElementById('clear-selection-btn');

    if (startBtn) {
      startBtn.onclick = () => this.showProductLookupScreen();
    }
    if (editRoomsBtn) {
      editRoomsBtn.onclick = () => this.showRoomSelection();
    }
    if (viewSelectionBtn) {
      viewSelectionBtn.onclick = () => this.showReviewScreen();
    }
    if (clearSelectionBtn) {
      clearSelectionBtn.onclick = () => this.showClearConfirmModal();
    }
    // Load version
    this.loadVersion();
  }

  async loadVersion() {
    try {
      const response = await fetch('version.txt');
      const version = await response.text();
      const versionElement = document.getElementById('version-number');
      if (versionElement) {
        const lines = version.trim().split('\n').filter(line => line.trim() !== '');
        const latestVersion = lines.length > 0 ? lines[lines.length - 1] : 'Unknown';
        // Extract just the version number (before the first dash)
        const versionNumber = latestVersion.split(' - ')[0] || latestVersion;
        versionElement.textContent = versionNumber;
      }
    } catch (error) {
      console.warn('Could not load version:', error);
    }
  }

  async showRoomSelection() {
    try {
      const response = await fetch('screens/room-selection.html');
      const html = await response.text();
      document.body.innerHTML = html;
      
      this.currentScreen = 'room-selection';
      this.renderRoomGrid();
      
      // Setup event handlers
      const backBtn = document.getElementById('back-to-welcome');
      const addRoomBtn = document.getElementById('add-custom-room');
      
      if (backBtn) {
        backBtn.onclick = () => location.reload();
      }
      
      if (addRoomBtn) {
        addRoomBtn.onclick = () => this.handleAddCustomRoom();
      }
    } catch (error) {
      console.error('Failed to load room selection screen:', error);
    }
  }

  renderRoomGrid() {
    const grid = document.getElementById('room-grid');
    if (!grid) return;

    grid.innerHTML = '';
    
    // Render predefined rooms
    CONFIG.ROOMS.PREDEFINED.forEach(room => {
      const btn = document.createElement('button');
      btn.className = 'room-btn';
      btn.innerHTML = `<span class="room-icon">${room.icon}</span>${room.name}`;
      btn.onclick = () => this.selectRoom(room.name);
      grid.appendChild(btn);
    });

    // Render custom rooms
    const customRooms = StorageManager.getCustomRooms();
    customRooms.forEach((room, idx) => {
      const btn = document.createElement('button');
      btn.className = 'room-btn';
      btn.innerHTML = `<span class="room-icon">📝</span>${room.name}`;
      btn.onclick = () => this.selectRoom(room.name);
      btn.ondblclick = () => this.handleRemoveCustomRoom(idx);
      btn.title = 'Double-click to remove';
      grid.appendChild(btn);
    });
  }

  selectRoom(roomName) {
    this.selectedRoom = roomName;
    this.showProductLookupScreen();
  }

  async showProductLookupScreen() {
    try {
      const response = await fetch('screens/product-lookup.html');
      const html = await response.text();
      document.body.innerHTML = html;
      this.currentScreen = 'product-lookup';
      this.updateSelectionCount();
      this.setupProductSearch();
      // Setup Review button
      const reviewBtn = document.getElementById('review-btn');
      if (reviewBtn) {
        reviewBtn.onclick = () => this.showReviewScreen();
      }
      // Setup Back button
      const backBtn = document.getElementById('back-to-rooms');
      if (backBtn) {
        backBtn.onclick = () => location.reload(); // Go to welcome screen
      }
    } catch (error) {
      console.error('Failed to load product lookup screen:', error);
    }
  }

  setupProductSearch() {
    const input = document.getElementById('product-search-input');
    const dropdown = document.getElementById('product-search-dropdown');
    if (!input || !dropdown) return;
    let matches = [];
    // Debounced search function
    const debouncedSearch = Utils.debounce((query) => {
      this.performProductSearch(query, dropdown, matches);
    }, 200);
    input.addEventListener('input', () => {
      const query = input.value.trim();
      if (query) {
        debouncedSearch(query);
      } else {
        dropdown.innerHTML = '';
        dropdown.classList.remove('visible');
      }
    });
    input.addEventListener('focus', () => {
      if (input.value.trim()) debouncedSearch(input.value.trim());
    });
    dropdown.onclick = (e) => {
      const li = e.target.closest('li[data-idx]');
      if (!li) return;
      const idx = parseInt(li.getAttribute('data-idx'), 10);
      if (!isNaN(idx) && matches[idx]) {
        this.showProductDetailsScreen(matches[idx]);
      }
      dropdown.classList.remove('visible');
      input.value = '';
    };
    // Hide dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (!dropdown.contains(e.target) && e.target !== input) {
        dropdown.classList.remove('visible');
      }
    });
  }

  performProductSearch(query, dropdown, matches) {
    if (!dataLayer.isLoaded) {
      dropdown.innerHTML = '<li>Loading catalog...</li>';
      dropdown.classList.add('visible');
      return;
    }
    matches.length = 0;
    matches.push(...dataLayer.searchProducts(query));
    if (matches.length === 0) {
      dropdown.innerHTML = '<li>No products found</li>';
    } else {
      dropdown.innerHTML = matches
        .map((p, i) => `<li data-idx="${i}">${Utils.sanitizeInput(p.Description || p.OrderCode || p.ProductName || p['Product Name'] || '')}</li>`)
        .join('');
    }
    dropdown.classList.add('visible');
  }

  async showProductDetailsScreen(product, options = {}) {
    try {
      const response = await fetch('screens/product-details.html');
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
    document.getElementById('product-code').textContent = product.OrderCode ? 'Code: ' + product.OrderCode : '';
    
    // Price formatting like original
    let price = '';
    let priceNum = NaN;
    if (product.RRP_INCGST) {
      priceNum = parseFloat(product.RRP_INCGST.toString().replace(/,/g, ''));
    }
    if (!isNaN(priceNum) && priceNum > 0) {
      price = `$${priceNum.toFixed(2)} inc GST`;
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
      if (qtyInput) qtyInput.value = options.quantity;
    }

    // Show scan feedback if scanned
    if (options.scannedCode) {
      this.showScanFeedback(`Successfully scanned: ${options.scannedCode}`);
    }
  }

  populateRoomSelect() {
    const select = document.getElementById('room-select');
    if (!select) return;

    select.innerHTML = '';
    
    // Add predefined rooms
    CONFIG.ROOMS.PREDEFINED.forEach(room => {
      const option = document.createElement('option');
      option.value = room.name;
      option.textContent = room.name;
      if (room.name === this.selectedRoom) {
        option.selected = true;
      }
      select.appendChild(option);
    });

    // Add custom rooms
    const customRooms = StorageManager.getCustomRooms();
    customRooms.forEach(room => {
      const option = document.createElement('option');
      option.value = room.name;
      option.textContent = room.name;
      if (room.name === this.selectedRoom) {
        option.selected = true;
      }
      select.appendChild(option);
    });
  }

  setupQuantitySelect() {
    const select = document.getElementById('product-quantity');
    if (!select) return;

    select.innerHTML = '';
    CONFIG.UI.QUANTITY_OPTIONS.forEach(qty => {
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
      if (typeof productName === 'string') productName = productName.trim();
      let variants = [];
      
      if (productName) {
        variants = dataLayer.getAllProducts().filter(p => {
          let pName = p.ProductName || p['Product Name'] || '';
          if (typeof pName === 'string') pName = pName.trim();
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
      annotationInput.addEventListener('input', function() {
        // Prevent carriage returns
        annotationInput.value = annotationInput.value.replace(/\r?\n|\r/g, ' ');
        charCount.textContent = annotationInput.value.length + '/140';
      });
      annotationInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') e.preventDefault();
      });
      charCount.textContent = annotationInput.value.length + '/140';
      // Restore notes if passed in options
      if (options.notes) annotationInput.value = options.notes;
    }
  }

  setupAnnotationField() {
    // Now handled by setupAnnotationCharacterCount
  }

  setupProductDetailsHandlers(product) {
    const backBtn = document.getElementById('back-to-scanner');
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

    const room = roomSelect ? roomSelect.value : this.selectedRoom;
    const quantity = quantitySelect ? parseInt(quantitySelect.value) : 1;
    const notes = annotationField ? annotationField.value : '';

    if (StorageManager.addProductToSelection(product, notes, room, quantity)) {
      // Like the original, show review screen after adding
      this.showReviewScreen();
    } else {
      alert('Failed to add product to selection');
    }
  }

  async showReviewScreen() {
    try {
      const response = await fetch('screens/review.html');
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
    const backBtn = document.getElementById('back-to-scanner');
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
    
    if (!reviewList) return;

    const selectedProducts = StorageManager.getSelectedProducts();
    
    if (selectedProducts.length === 0) {
      reviewList.innerHTML = '';
      if (emptyState) emptyState.style.display = 'block';
      return;
    }

    if (emptyState) emptyState.style.display = 'none';

    // Group products by room - use original logic
    const byRoom = {};
    selectedProducts.forEach(item => {
      const room = item.room || 'Unassigned';
      if (!byRoom[room]) byRoom[room] = [];
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
          const rrpIncGst = product.RRP_INCGST || product.rrpIncGst || product.price || '0';
          
          return `
          <div class="review-product-card" style="display: flex; flex-direction: column; align-items: stretch;">
            <div style="display: flex; flex-direction: row; align-items: flex-start;">
              <div class="review-product-thumb-wrap">
                <img class="review-product-thumb" src="${imageUrl}" alt="Product" onerror="this.src='assets/no-image.png';" onload="">
                <div class="review-qty-pill" data-room="${room}" data-idx="${idx}">
                  <button class="review-qty-btn${(item.quantity||1)===1?' delete':''}" data-action="decrement" title="${(item.quantity||1)===1?'Delete':'Decrease'}">
                    ${(item.quantity||1)===1?`<svg viewBox='0 0 64 64' width='64' height='64'><rect x='10' y='8' width='44' height='6' rx='3' fill='black'/><polygon points='7,18 57,18 52,58 12,58' fill='none' stroke='black' stroke-width='7'/></svg>`:'–'}
                  </button>
                  <span class="review-qty-value">${item.quantity || 1}</span>
                  <button class="review-qty-btn" data-action="increment" title="Increase">+</button>
                </div>
              </div>
              <div class="review-product-info">
                <div class="review-product-title">${description}</div>
                <div class="review-product-meta">
                  <span class="review-product-code">${orderCode ? 'Code: ' + orderCode : ''}</span>
                  <span class="review-product-price">${rrpIncGst ? '$' + Number(rrpIncGst).toFixed(2) + ' ea' : ''}</span>
                </div>
                <div class="review-product-notes">${item.notes ? 'Notes: ' + item.notes : ''}</div>
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
      if (!groups[room]) groups[room] = [];
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
            if (item.room === room) count++;
            return item.room === room && count === idx;
          });
          
          if (toUpdateIdx !== -1) {
            const product = selectedProducts[toUpdateIdx];
            let qty = parseInt(product.quantity, 10) || 1;
            
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
      if (exportCsvRow) exportCsvRow.style.display = 'none';
      // Change button text
      if (downloadBtn) downloadBtn.textContent = 'Download';
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
    const form = document.getElementById('pdf-email-form');
    if (!form) return;
    const formData = new FormData(form);
    const userDetails = {
      name: formData.get('user-name'),
      project: formData.get('user-project'),
      address: formData.get('user-address'),
      email: formData.get('user-email'),
      telephone: formData.get('user-telephone'),
      excludePrice: formData.get('exclude-price') === 'on',
      exportCsv: true // Always true
    };
    // Generate and download PDF and CSV
    window.dispatchEvent(new CustomEvent('generatePdf', { detail: userDetails }));
    // CSV download is handled in the PDF generator module
  }

  handleAddCustomRoom() {
    const roomName = prompt('Enter custom room name:');
    if (roomName && roomName.trim()) {
      if (StorageManager.addCustomRoom(roomName.trim())) {
        this.renderRoomGrid();
      } else {
        alert('Room name already exists or is invalid');
      }
    }
  }

  handleRemoveCustomRoom(index) {
    if (confirm('Remove this custom room?')) {
      StorageManager.removeCustomRoom(index);
      this.renderRoomGrid();
    }
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
        };
      }
    }
  }

  showScanFeedback(message) {
    const feedback = document.getElementById('scanner-feedback');
    if (feedback) {
      feedback.innerHTML = `
        <div style="color: #16a34a; background: #f0f9ff; padding: 8px; border-radius: 6px; margin: 4px 0;">
          ${Utils.sanitizeInput(message)}
        </div>
      `;
      
      setTimeout(() => {
        feedback.innerHTML = '';
      }, 3000);
    }
  }

  updateSelectionCount() {
    const countElement = document.getElementById('selection-count');
    if (countElement) {
      countElement.textContent = StorageManager.getSelectionCount().toString();
    }
  }
} 