import { StorageManager } from './storage.js';
import { CONFIG, dataLayer } from './modules.js';
import { Utils } from './utils.js';

export class ProductGridManager {
  constructor() {
    this.gridRows = [];
    this.nextRowId = 1;
    this.currentSearchRow = null;
    this.searchCache = new Map();
    this.searchTimeout = null;
  }

  init() {
    // Clean up any leftover dropdown elements and restore table layout
    const gridTable = document.querySelector('.grid-table');
    if (gridTable) {
      gridTable.style.removeProperty('table-layout');
      gridTable.style.removeProperty('overflow');
      gridTable.classList.remove('has-open-dropdown');
    }
    
    // Clean up any leftover global dropdown styles
    const existingDropdown = document.querySelector('.global-search-dropdown');
    if (existingDropdown) {
      existingDropdown.remove();
    }
    
    this.setupEventListeners();
    this.populateRoomOptions();
    this.loadExistingProducts();
    this.updateTotals();
    
    // Add initial empty row
    if (this.gridRows.length === 0) {
      this.addEmptyRow();
    }
    
    // Initialize sorting (default to room)
    this.handleSortChange();
  }

  setupEventListeners() {
    // Header actions
    const backBtn = document.getElementById('back-to-home');
    const importBtn = document.getElementById('import-file-btn');
    const downloadBtn = document.getElementById('download-btn');
    const clearAllBtn = document.getElementById('clear-all-btn');
    const addRowBtn = document.getElementById('add-row-btn');

    if (backBtn) {
      backBtn.onclick = () => location.reload();
    }

    if (importBtn) {
      importBtn.onclick = () => this.showImportModal();
    }

    if (downloadBtn) {
      downloadBtn.onclick = () => this.showDownloadModal();
    }

    if (clearAllBtn) {
      clearAllBtn.onclick = () => this.showClearAllModal();
    }

    if (addRowBtn) {
      addRowBtn.onclick = () => this.addEmptyRow();
    }

    // Sort functionality
    const sortSelect = document.getElementById('sort-by');
    if (sortSelect) {
      sortSelect.onchange = () => this.handleSortChange();
    }

    // Grid event delegation
    const gridBody = document.getElementById('grid-body');
    if (gridBody) {
      gridBody.addEventListener('input', this.handleGridInput.bind(this));
      gridBody.addEventListener('change', this.handleGridChange.bind(this));
      gridBody.addEventListener('click', this.handleGridClick.bind(this));
      gridBody.addEventListener('keydown', this.handleGridKeydown.bind(this));
      gridBody.addEventListener('focusin', this.handleGridFocusIn.bind(this));
      gridBody.addEventListener('focusout', this.handleGridFocusOut.bind(this));
      
      // Drag and drop event listeners
      gridBody.addEventListener('dragstart', this.handleDragStart.bind(this));
      gridBody.addEventListener('dragover', this.handleDragOver.bind(this));
      gridBody.addEventListener('drop', this.handleDrop.bind(this));
      gridBody.addEventListener('dragend', this.handleDragEnd.bind(this));
    }

    // Document click handler to hide dropdowns when clicking outside
    document.addEventListener('click', (event) => {
      if (!event.target.closest('.grid-product-cell') && !event.target.closest('.global-search-dropdown')) {
        this.hideAllDropdowns();
      }
    });
  }

  addEmptyRow() {
    const rowId = 'row_' + this.nextRowId++;
    const row = {
      id: rowId,
      product: null,
      room: 'Blank',
      quantity: 1,
      price: '',
      notes: ''
    };

    this.gridRows.push(row);
    this.renderGrid();
    
    // Focus on the search input of the new row
    setTimeout(() => {
      const searchInput = document.querySelector(`[data-row-id="${rowId}"] .grid-search-input`);
      if (searchInput) {
        searchInput.focus();
      }
    }, 100);
  }

  removeRow(rowId) {
    const index = this.gridRows.findIndex(row => row.id === rowId);
    if (index !== -1) {
      const row = this.gridRows[index];
      
      // Remove from storage if it has a product
      if (row.product && row.storageId) {
        StorageManager.removeProductFromSelection(row.storageId);
      }

      this.gridRows.splice(index, 1);
      this.renderGrid();
      this.updateTotals();

      // Ensure at least one empty row
      if (this.gridRows.length === 0) {
        this.addEmptyRow();
      }
    }
  }

  moveRow(rowId, direction) {
    const currentIndex = this.gridRows.findIndex(row => row.id === rowId);
    if (currentIndex === -1) return;

    let newIndex;
    if (direction === 'up') {
      newIndex = Math.max(0, currentIndex - 1);
    } else if (direction === 'down') {
      newIndex = Math.min(this.gridRows.length - 1, currentIndex + 1);
    }

    if (newIndex === currentIndex) return; // No movement needed

    // Move the row in the array
    const row = this.gridRows.splice(currentIndex, 1)[0];
    this.gridRows.splice(newIndex, 0, row);

    this.renderGrid();
    this.updateTotals();

    // Highlight the moved row briefly
    setTimeout(() => {
      const movedRowElement = document.querySelector(`[data-row-id="${rowId}"]`);
      if (movedRowElement) {
        movedRowElement.style.backgroundColor = '#dbeafe';
        setTimeout(() => {
          movedRowElement.style.backgroundColor = '';
        }, 500);
      }
    }, 100);
  }

  async handleProductSearch(searchInput, query) {
    if (!query || query.length < 2) {
      this.hideSearchDropdown(searchInput);
      return;
    }

    // Use cached results if available
    const cacheKey = query.toLowerCase();
    if (this.searchCache.has(cacheKey)) {
      this.showSearchResults(searchInput, this.searchCache.get(cacheKey), query);
      return;
    }

    // Debounce search
    clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(async () => {
      try {
        const products = await this.searchProducts(query);
        this.searchCache.set(cacheKey, products);
        this.showSearchResults(searchInput, products, query);
      } catch (error) {
        console.error('Product search failed:', error);
        this.hideSearchDropdown(searchInput);
      }
    }, 300);
  }

  async searchProducts(query) {
    if (!dataLayer.isLoaded) {
      await new Promise(resolve => {
        const checkLoaded = () => {
          if (dataLayer.isLoaded) {
            resolve();
          } else {
            setTimeout(checkLoaded, 100);
          }
        };
        checkLoaded();
      });
    }

    const allProducts = dataLayer.getAllProducts();
    const searchTerm = query.toLowerCase();
    
    return allProducts.filter(product => {
      const orderCode = (product.OrderCode || product.Code || '').toString().toLowerCase();
      const description = (product.Description || product.ProductName || product['Product Name'] || '').toLowerCase();
      const longDescription = (product.LongDescription || '').toLowerCase();
      
      return orderCode.includes(searchTerm) || 
             description.includes(searchTerm) || 
             longDescription.includes(searchTerm);
    }).slice(0, 10); // Limit to 10 results
  }

  showSearchResults(searchInput, products, query) {
    // Remove any existing dropdown first
    const existingDropdown = document.querySelector('.global-search-dropdown');
    if (existingDropdown) {
      existingDropdown.remove();
    }
    
    // Create dropdown outside the table structure
    const dropdown = document.createElement('ul');
    dropdown.className = 'global-search-dropdown';
    
    // SMART DROPDOWN POSITIONING - Full screen width with intelligent placement
    const inputRect = searchInput.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const dropdownWidth = Math.min(1000, viewportWidth - 40);
    const dropdownHeight = 300; // Expected dropdown height
    
    // Smart positioning: above input if no space below, below if space available
    const spaceBelow = viewportHeight - inputRect.bottom;
    const spaceAbove = inputRect.top;
    const showAbove = spaceBelow < dropdownHeight && spaceAbove > dropdownHeight;
    
    const topPosition = showAbove 
      ? (inputRect.top - dropdownHeight - 8) + 'px'
      : (inputRect.bottom + 8) + 'px';
    
    // Clean modern dropdown styling
    const styles = {
      position: 'fixed',
      top: topPosition,
      left: '20px',
      right: '20px',
      width: 'auto',
      minWidth: dropdownWidth + 'px',
      maxWidth: 'none',
      backgroundColor: '#ffffff',
      border: '1px solid #d1d5db',
      borderRadius: '8px',
      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
      maxHeight: dropdownHeight + 'px',
      overflowY: 'auto',
      overflowX: 'hidden',
      zIndex: '999999',
      listStyle: 'none',
      margin: '0',
      padding: '4px 0',
      whiteSpace: 'normal',
      wordWrap: 'break-word',
      display: 'block',
      pointerEvents: 'auto',
      transform: 'none',
      contain: 'none',
      isolation: 'isolate'
    };
    
    // Apply all styles with !important for reliable positioning
    Object.keys(styles).forEach(prop => {
      dropdown.style.setProperty(prop, styles[prop], 'important');
    });
    
    // Don't modify table layout - dropdown is positioned in document.body so it doesn't need table changes
    
    // Store positioning info for updates
    dropdown.dropdownHeight = dropdownHeight;

    if (products.length === 0) {
      dropdown.innerHTML = '<li style="padding: 12px 16px; color: #6b7280; font-style: italic;">No products found</li>';
    } else {
      dropdown.innerHTML = products.map(product => {
        const orderCode = product.OrderCode || product.Code || '';
        const description = product.Description || product.ProductName || product['Product Name'] || '';
        
        return `<li data-product='${JSON.stringify(product).replace(/'/g, "&apos;")}'
                     style="padding: 12px 16px; cursor: pointer; border-bottom: 1px solid #f3f4f6; 
                            transition: background-color 0.15s ease; font-size: 14px; line-height: 1.5;
                            margin: 0; display: block; width: 100%; 
                            white-space: normal; word-wrap: break-word; overflow: visible;">
          <span style="font-weight: 600; color: #2563eb;">${Utils.sanitizeInput(orderCode)}</span>
          <span style="color: #6b7280; margin: 0 8px;">—</span>
          <span style="color: #374151;">${Utils.sanitizeInput(description)}</span>
        </li>`;
      }).join('');
    }

    // Add to document body to escape all container constraints
    document.body.appendChild(dropdown);
    
    // Store reference to the input for cleanup
    dropdown.dataset.inputId = searchInput.closest('.grid-row').dataset.rowId;
    
    this.setupDropdownEvents(dropdown, searchInput);
  }

  setupDropdownEvents(dropdown, searchInput) {
    dropdown.querySelectorAll('li[data-product]').forEach(li => {
      // Add hover effects
      li.addEventListener('mouseenter', () => {
        li.style.backgroundColor = '#f0f9ff';
        li.style.borderLeft = '3px solid #3b82f6';
        li.style.paddingLeft = '13px';
      });
      
      li.addEventListener('mouseleave', () => {
        li.style.backgroundColor = '';
        li.style.borderLeft = '';
        li.style.paddingLeft = '16px';
      });
      
      li.onclick = () => {
        try {
          const product = JSON.parse(li.getAttribute('data-product'));
          this.selectProduct(searchInput, product);
          this.hideGlobalDropdown();
        } catch (error) {
          console.error('Failed to parse product data:', error);
        }
      };
    });
    
    // Update position on scroll/resize with smart positioning
    const updatePosition = () => {
      const inputRect = searchInput.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const dropdownHeight = dropdown.dropdownHeight || 300;
      const spaceBelow = viewportHeight - inputRect.bottom;
      const spaceAbove = inputRect.top;
      const showAbove = spaceBelow < dropdownHeight && spaceAbove > dropdownHeight;
      
      const newTop = showAbove 
        ? (inputRect.top - dropdownHeight - 8) + 'px'
        : (inputRect.bottom + 8) + 'px';
        
      dropdown.style.setProperty('top', newTop, 'important');
    };
    
    window.addEventListener('scroll', updatePosition);
    window.addEventListener('resize', updatePosition);
    
    // Store cleanup function
    dropdown.updatePosition = updatePosition;
  }

  hideSearchDropdown(searchInput) {
    this.hideGlobalDropdown();
  }

  hideGlobalDropdown() {
    const dropdown = document.querySelector('.global-search-dropdown');
    if (dropdown) {
      // Clean up event listeners
      if (dropdown.updatePosition) {
        window.removeEventListener('scroll', dropdown.updatePosition);
        window.removeEventListener('resize', dropdown.updatePosition);
      }
      
      // Dropdown cleanup complete
      
      dropdown.remove();
    }
  }

  selectProduct(searchInput, product) {
    const rowElement = searchInput.closest('.grid-row');
    const rowId = rowElement.dataset.rowId;
    const row = this.gridRows.find(r => r.id === rowId);

    if (!row) return;

    // Update row data
    row.product = product;
    
    // Set default price
    const defaultPrice = product.RRP_INCGST || product.rrpIncGst || product.Price || '';
    row.price = defaultPrice;

    // Clear search input
    searchInput.value = '';

    // Render the row to show product details
    this.renderRow(row);

    // Save to storage
    this.saveRowToStorage(row);

    // Focus next row or create new row
    this.focusNextRowOrCreate(rowId);
  }

  saveRowToStorage(row) {
    if (!row.product) return;

    const productData = {
      ...row.product,
      // Ensure consistent field naming
      OrderCode: row.product.OrderCode || row.product.Code || '',
      Description: row.product.Description || row.product.ProductName || row.product['Product Name'] || '',
      RRP_INCGST: row.price || row.product.RRP_INCGST || row.product.rrpIncGst || '0',
      Image_URL: row.product.Image_URL || row.product.imageUrl || row.product.Image || 'assets/no-image.png'
    };

    const storageId = StorageManager.addProductToSelection(
      productData,
      row.notes,
      row.room,
      row.quantity
    );

    if (storageId) {
      row.storageId = storageId;
      this.updateTotals();
    }
  }

  focusNextRowOrCreate(currentRowId) {
    const currentIndex = this.gridRows.findIndex(row => row.id === currentRowId);
    
    if (currentIndex < this.gridRows.length - 1) {
      // Focus next row
      const nextRow = this.gridRows[currentIndex + 1];
      setTimeout(() => {
        const nextInput = document.querySelector(`[data-row-id="${nextRow.id}"] .grid-search-input`);
        if (nextInput && !nextInput.classList.contains('populated')) {
          nextInput.focus();
        }
      }, 100);
    } else {
      // Create new row and focus it
      this.addEmptyRow();
    }
  }

  handleGridInput(event) {
    const target = event.target;
    
    if (target.classList.contains('grid-search-input') && !target.classList.contains('populated')) {
      this.handleProductSearch(target, target.value);
    } else if (target.classList.contains('grid-input') || target.classList.contains('grid-textarea')) {
      this.updateRowFromInput(target);
    }
  }

  handleGridChange(event) {
    const target = event.target;
    
    if (target.classList.contains('grid-select') || target.classList.contains('grid-input')) {
      this.updateRowFromInput(target);
    }
  }

  handleGridClick(event) {
    const target = event.target;
    
    if (target.classList.contains('grid-remove-btn')) {
      const rowElement = target.closest('.grid-row');
      const rowId = rowElement.dataset.rowId;
      this.removeRow(rowId);
    } else if (target.classList.contains('grid-move-btn')) {
      const rowElement = target.closest('.grid-row');
      const rowId = rowElement.dataset.rowId;
      const direction = target.dataset.direction;
      this.moveRow(rowId, direction);

    } else if (!target.closest('.grid-search-dropdown')) {
      // Hide any visible dropdowns when clicking outside
      document.querySelectorAll('.grid-search-dropdown.visible').forEach(dropdown => {
        dropdown.classList.remove('visible');
      });
    }
  }

  handleGridKeydown(event) {
    if (event.target.classList.contains('grid-search-input')) {
      const dropdown = event.target.parentElement.querySelector('.grid-search-dropdown.visible');
      
      if (dropdown) {
        this.handleDropdownKeyboard(event, dropdown);
      } else if (event.key === 'Enter') {
        event.preventDefault();
        this.handleProductSearch(event.target, event.target.value);
      }
    }
  }

  handleDropdownKeyboard(event, dropdown) {
    // Always check for global dropdown
    const globalDropdown = document.querySelector('.global-search-dropdown');
    if (!globalDropdown) return;
    
    const items = globalDropdown.querySelectorAll('li[data-product]');
    let activeItem = globalDropdown.querySelector('li.active');
    
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        if (!activeItem) {
          items[0]?.classList.add('active');
          items[0]?.style.setProperty('background-color', '#e0f2fe', 'important');
        } else {
          activeItem.classList.remove('active');
          activeItem.style.backgroundColor = '';
          const currentIndex = Array.from(items).indexOf(activeItem);
          const nextIndex = (currentIndex + 1) % items.length;
          items[nextIndex]?.classList.add('active');
          items[nextIndex]?.style.setProperty('background-color', '#e0f2fe', 'important');
        }
        break;
        
      case 'ArrowUp':
        event.preventDefault();
        if (!activeItem) {
          items[items.length - 1]?.classList.add('active');
          items[items.length - 1]?.style.setProperty('background-color', '#e0f2fe', 'important');
        } else {
          activeItem.classList.remove('active');
          activeItem.style.backgroundColor = '';
          const currentIndex = Array.from(items).indexOf(activeItem);
          const prevIndex = currentIndex === 0 ? items.length - 1 : currentIndex - 1;
          items[prevIndex]?.classList.add('active');
          items[prevIndex]?.style.setProperty('background-color', '#e0f2fe', 'important');
        }
        break;
        
      case 'Enter':
        event.preventDefault();
        if (activeItem) {
          activeItem.click();
        }
        break;
        
      case 'Escape':
        event.preventDefault();
        this.hideGlobalDropdown();
        break;
    }
  }

  handleGridFocusIn(event) {
    if (event.target.classList.contains('grid-search-input')) {
      this.currentSearchRow = event.target.closest('.grid-row').dataset.rowId;
    }
  }

  handleGridFocusOut(event) {
    // Hide dropdown when focus leaves search area
    if (event.target.classList.contains('grid-search-input')) {
      setTimeout(() => {
        if (!event.relatedTarget || !event.target.parentElement.contains(event.relatedTarget)) {
          this.hideSearchDropdown(event.target);
        }
      }, 150);
    }
  }

  // Helper method to clean up all open dropdowns
  hideAllDropdowns() {
    this.hideGlobalDropdown();
  }



  updateRowFromInput(input) {
    const rowElement = input.closest('.grid-row');
    const rowId = rowElement.dataset.rowId;
    const row = this.gridRows.find(r => r.id === rowId);

    if (!row) return;

    let shouldUpdateTotal = false;

    // Update row data based on input type
    if (input.classList.contains('grid-select') && input.name === 'room') {
      row.room = input.value;
    } else if (input.classList.contains('grid-input') && input.name === 'quantity') {
      row.quantity = Math.max(1, parseInt(input.value) || 1);
      input.value = row.quantity; // Ensure valid value
      shouldUpdateTotal = true;
    } else if (input.classList.contains('grid-input') && input.name === 'price') {
      row.price = input.value;
      shouldUpdateTotal = true;
    } else if (input.classList.contains('grid-textarea') && input.name === 'notes') {
      row.notes = input.value;
    }

    // Update row total if quantity or price changed
    if (shouldUpdateTotal) {
      this.updateRowTotal(rowElement, row);
    }

    // Update storage if product exists
    if (row.product && row.storageId) {
      StorageManager.updateProductQuantity(row.storageId, row.quantity);
      StorageManager.updateProductRoom(row.storageId, row.room);
      StorageManager.updateProductNotes(row.storageId, row.notes);
      // Note: Price updates would need additional storage method
      this.updateTotals();
    }
  }

  updateRowTotal(rowElement, row) {
    const totalDisplay = rowElement.querySelector('.grid-total-display');
    if (totalDisplay) {
      const unitPrice = parseFloat(row.price) || 0;
      const quantity = parseInt(row.quantity) || 1;
      const totalPrice = unitPrice * quantity;
      totalDisplay.textContent = totalPrice > 0 ? totalPrice.toFixed(2) : '';
    }
  }

  renderGrid() {
    const gridBody = document.getElementById('grid-body');
    const emptyState = document.getElementById('product-grid-empty');
    const gridContainer = document.getElementById('product-grid-container');
    
    if (!gridBody) return;

    if (this.gridRows.length === 0) {
      gridContainer.style.display = 'none';
      emptyState.style.display = 'block';
      return;
    }

    emptyState.style.display = 'none';
    gridContainer.style.display = 'block';

    // Group by room for organized display
    const groupedRows = this.groupRowsByRoom();
    
    // CREATE PROPER TABLE STRUCTURE - NO DIV WRAPPERS!
    const tableRows = [];
    
    Object.entries(groupedRows).forEach(([room, rows]) => {
      const roomIcon = this.getRoomIcon(room);
      const roomClass = this.getRoomClass(room);
      
      // Room header as a proper table row that spans all columns
      const roomHeaderRow = `
        <div class="grid-row room-header-row ${roomClass}">
          <div class="col-search room-header-cell" colspan="8">
            <div class="room-header-content">
              <span class="room-icon">${roomIcon}</span>
              <span class="room-name">${room}</span>
              <span class="room-count">(${rows.length})</span>
            </div>
          </div>
          <div class="col-image"></div>
          <div class="col-product"></div>
          <div class="col-room"></div>
          <div class="col-qty"></div>
          <div class="col-price"></div>
          <div class="col-notes"></div>
          <div class="col-actions"></div>
        </div>
      `;
      
      tableRows.push(roomHeaderRow);
      
      // Add product rows
      rows.forEach(row => {
        tableRows.push(this.renderRowHtml(row));
      });
         });
     
     gridBody.innerHTML = tableRows.join('');
    }

  renderRow(row) {
    const existingRowElement = document.querySelector(`[data-row-id="${row.id}"]`);
    if (existingRowElement) {
      existingRowElement.outerHTML = this.renderRowHtml(row);
    }
  }

  renderRowHtml(row) {
    const product = row.product;
    const imageUrl = product ? (product.Image_URL || product.imageUrl || product.Image || 'assets/no-image.png') : 'assets/no-image.png';
    const productName = product ? (product.Description || product.ProductName || product['Product Name'] || '') : '';
    const productCode = product ? (product.OrderCode || product.Code || '') : '';
    const displayPrice = row.price || (product ? (product.RRP_INCGST || product.rrpIncGst || '') : '');
    
    // Calculate total price
    const unitPrice = parseFloat(displayPrice) || 0;
    const quantity = parseInt(row.quantity) || 1;
    const totalPrice = unitPrice * quantity;
    const displayTotal = totalPrice > 0 ? totalPrice.toFixed(2) : '';

    return `
      <div class="grid-row" data-row-id="${row.id}" draggable="true">
        <div class="col-image grid-image-cell">
          ${product ? `<img src="${imageUrl}" alt="Product" class="grid-product-image" onerror="this.src='assets/no-image.png';">` : ''}
        </div>
        <div class="col-product grid-product-cell ${product ? 'has-product' : 'empty-product'}">
          ${product ? `
            <div class="grid-product-display">
              <div class="grid-product-name">
                <strong>${Utils.sanitizeInput(productCode)}</strong> ${Utils.sanitizeInput(productName)}
              </div>
            </div>
          ` : `
            <input type="text" 
                   class="grid-search-input" 
                   placeholder="Search for a product..." 
                   value="">
          `}
        </div>
        <div class="col-room">
          <select class="grid-select" name="room">
            ${this.getRoomOptions(row.room)}
          </select>
        </div>
        <div class="col-qty">
          <input type="number" class="grid-input" name="quantity" value="${row.quantity}" min="1" step="1">
        </div>
        <div class="col-price">
          <input type="text" class="grid-input" name="price" value="${displayPrice}" placeholder="0.00">
        </div>
        <div class="col-total">
          <div class="grid-total-display">${displayTotal}</div>
        </div>
        <div class="col-notes">
          <textarea class="grid-textarea" name="notes" placeholder="Notes..." rows="1">${Utils.sanitizeInput(row.notes)}</textarea>
        </div>
        <div class="col-actions grid-actions-cell">
          <div class="grid-actions-group">
            <button class="grid-move-btn grid-move-up" title="Move up" data-direction="up">↑</button>
            <button class="grid-move-btn grid-move-down" title="Move down" data-direction="down">↓</button>
            <div class="grid-drag-handle" title="Drag to reorder">⋮⋮</div>
            <button class="grid-remove-btn" title="Remove row">×</button>
          </div>
        </div>
      </div>
    `;
  }

  handleSortChange() {
    const sortSelect = document.getElementById('sort-by');
    const sortBy = sortSelect ? sortSelect.value : 'room';
    
    this.sortGridRows(sortBy);
    this.renderGrid();
  }

  sortGridRows(sortBy) {
    switch (sortBy) {
      case 'room':
        this.gridRows.sort((a, b) => {
          const roomA = a.room || 'Blank';
          const roomB = b.room || 'Blank';
          return roomA.localeCompare(roomB);
        });
        break;
        
      case 'product':
        this.gridRows.sort((a, b) => {
          const nameA = a.product ? (a.product.Description || a.product.ProductName || '') : '';
          const nameB = b.product ? (b.product.Description || b.product.ProductName || '') : '';
          return nameA.localeCompare(nameB);
        });
        break;
        
      case 'code':
        this.gridRows.sort((a, b) => {
          const codeA = a.product ? (a.product.OrderCode || a.product.Code || '') : '';
          const codeB = b.product ? (b.product.OrderCode || b.product.Code || '') : '';
          return codeA.localeCompare(codeB);
        });
        break;
        
      case 'order':
      default:
        // Keep original order (no sorting)
        break;
    }
  }

  groupRowsByRoom() {
    const sortSelect = document.getElementById('sort-by');
    const sortBy = sortSelect ? sortSelect.value : 'room';
    
    if (sortBy !== 'room') {
      // For non-room sorting, return all rows in a single group
      return { 'All Products': this.gridRows };
    }
    
    const grouped = {};
    
    this.gridRows.forEach(row => {
      const room = row.room || 'Blank';
      if (!grouped[room]) {
        grouped[room] = [];
      }
      grouped[room].push(row);
    });

    return grouped;
  }

  getRoomIcon(roomName) {
    const roomIcons = {
      'Blank': '📋',
      'Bath 1': '🛁',
      'Bath 2': '🚿', 
      'Ensuite': '🛀',
      'Powder': '🚽',
      'Kitchen': '🍳',
      'Laundry': '🧺',
      'Alfresco': '🌿',
      'Butlers': '🍽️',
      'Other': '🏠',
      'All Products': '📦'
    };
    
    return roomIcons[roomName] || '📝';
  }

  getRoomClass(roomName) {
    const roomClasses = {
      'Blank': 'blank-room',
      'Bath 1': 'bath-room',
      'Bath 2': 'bath-room',
      'Ensuite': 'bath-room',
      'Powder': 'bath-room',
      'Kitchen': 'kitchen-room',
      'Laundry': 'laundry-room',
      'Alfresco': 'kitchen-room',
      'Butlers': 'kitchen-room'
    };
    
    return roomClasses[roomName] || '';
  }

  getRoomOptions(selectedRoom) {
    let options = `<option value="Blank" ${selectedRoom === 'Blank' ? 'selected' : ''}>Blank</option>`;
    
    CONFIG.ROOMS.PREDEFINED.forEach(room => {
      options += `<option value="${room.name}" ${selectedRoom === room.name ? 'selected' : ''}>${room.name}</option>`;
    });

    const customRooms = StorageManager.getCustomRooms();
    customRooms.forEach(room => {
      options += `<option value="${room.name}" ${selectedRoom === room.name ? 'selected' : ''}>${room.name}</option>`;
    });

    return options;
  }

  populateRoomOptions() {
    const bulkRoomSelect = document.getElementById('bulk-room-select');
    if (bulkRoomSelect) {
      bulkRoomSelect.innerHTML = this.getRoomOptions('Blank');
    }
  }

  loadExistingProducts() {
    const selectedProducts = StorageManager.getSelectedProducts();
    
    // Clear existing rows first
    this.gridRows = [];
    this.nextRowId = 1;
    
    selectedProducts.forEach(item => {
      const rowId = 'row_' + this.nextRowId++;
      const row = {
        id: rowId,
        product: item.product,
        room: item.room || 'Blank',
        quantity: item.quantity || 1,
        price: item.product.RRP_INCGST || item.product.rrpIncGst || item.product.Price || '',
        notes: item.notes || '',
        storageId: item.id
      };

      this.gridRows.push(row);
    });

    this.renderGrid();
  }

  updateTotals() {
    const totalItemsElement = document.getElementById('total-items');
    const totalValueElement = document.getElementById('total-value');

    let totalItems = 0;
    let totalValue = 0;

    this.gridRows.forEach(row => {
      if (row.product) {
        totalItems += row.quantity;
        const price = parseFloat(row.price) || 0;
        totalValue += price * row.quantity;
      }
    });

    if (totalItemsElement) {
      totalItemsElement.textContent = `${totalItems} items`;
    }

    if (totalValueElement) {
      totalValueElement.textContent = `$${totalValue.toFixed(2)}`;
    }
  }

  // Import functionality
  showImportModal() {
    const modal = document.getElementById('file-import-modal');
    if (modal) {
      modal.style.display = 'flex';
      // Import modal functionality is handled by existing FileImportManager
      if (window.fileImportManager) {
        window.fileImportManager.showModal();
      }
    }
  }

  // Download functionality  
  showDownloadModal() {
    const modal = document.getElementById('pdf-email-modal');
    if (modal) {
      modal.style.display = 'flex';
      
      const form = document.getElementById('pdf-email-form');
      const cancelBtn = document.getElementById('pdf-email-cancel');
      const submitBtn = document.getElementById('pdf-email-send');
      
      // Setup cancel button
      if (cancelBtn) {
        cancelBtn.onclick = () => {
          modal.style.display = 'none';
        };
      }
      
      // Setup form submission
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
      name: formData.get('user-name') || '',
      project: formData.get('user-project') || '',
      address: formData.get('user-address') || '',
      email: formData.get('user-email') || '',
      telephone: formData.get('user-telephone') || '',
      excludePrice: false,
      exportCsv: true
    };

    // Generate and download PDF using the existing system
    if (window.showPdfFormScreen) {
      window.showPdfFormScreen(userDetails);
    } else {
      // Fallback: dispatch custom event
      window.dispatchEvent(new CustomEvent('generatePdf', { detail: userDetails }));
    }
  }

  // Clear all functionality
  showClearAllModal() {
    if (confirm('Are you sure you want to clear all products from the grid?')) {
      this.clearAll();
    }
  }

  clearAll() {
    // Clear storage
    StorageManager.clearAllSelections();
    
    // Clear grid
    this.gridRows = [];
    this.renderGrid();
    this.updateTotals();
    
    // Add initial empty row
    this.addEmptyRow();
  }

  // Method to handle imported products
  addImportedProducts(products) {
    products.forEach(productData => {
      const rowId = 'row_' + this.nextRowId++;
      const row = {
        id: rowId,
        product: productData.product,
        room: productData.room || 'Blank',
        quantity: productData.quantity || 1,
        price: productData.product.RRP_INCGST || productData.product.rrpIncGst || productData.product.price || '',
        notes: productData.notes || '',
        storageId: productData.id
      };

      this.gridRows.push(row);
    });

    this.renderGrid();
    this.updateTotals();
  }

  // Drag and Drop handlers
  handleDragStart(event) {
    const rowElement = event.target.closest('.grid-row');
    if (!rowElement) return;

    this.draggedRowId = rowElement.dataset.rowId;
    rowElement.classList.add('dragging');
    
    // Set drag effect
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/html', rowElement.outerHTML);
  }

  handleDragOver(event) {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';

    const rowElement = event.target.closest('.grid-row');
    if (!rowElement || rowElement.dataset.rowId === this.draggedRowId) return;

    // Remove existing drag-over indicators
    document.querySelectorAll('.grid-row.drag-over').forEach(row => {
      row.classList.remove('drag-over');
    });

    // Add drag-over indicator
    rowElement.classList.add('drag-over');
  }

  handleDrop(event) {
    event.preventDefault();
    
    const targetRowElement = event.target.closest('.grid-row');
    if (!targetRowElement || !this.draggedRowId) return;

    const targetRowId = targetRowElement.dataset.rowId;
    if (targetRowId === this.draggedRowId) return;

    // Find indices
    const draggedIndex = this.gridRows.findIndex(row => row.id === this.draggedRowId);
    const targetIndex = this.gridRows.findIndex(row => row.id === targetRowId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    // Move the row
    const draggedRow = this.gridRows.splice(draggedIndex, 1)[0];
    this.gridRows.splice(targetIndex, 0, draggedRow);

    this.renderGrid();
    this.updateTotals();

    // Highlight the moved row
    setTimeout(() => {
      const movedRowElement = document.querySelector(`[data-row-id="${this.draggedRowId}"]`);
      if (movedRowElement) {
        movedRowElement.style.backgroundColor = '#dbeafe';
        setTimeout(() => {
          movedRowElement.style.backgroundColor = '';
        }, 500);
      }
    }, 100);
  }

  handleDragEnd(event) {
    const rowElement = event.target.closest('.grid-row');
    if (rowElement) {
      rowElement.classList.remove('dragging');
    }

    // Remove all drag-over indicators
    document.querySelectorAll('.grid-row.drag-over').forEach(row => {
      row.classList.remove('drag-over');
    });

    this.draggedRowId = null;
  }
} 