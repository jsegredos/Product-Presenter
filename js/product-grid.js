import { StorageManager } from './storage.js';
import { CONFIG, dataLayer } from './modules.js';
import { Utils } from './utils.js';

// --- DROPDOWN MANAGER (Reusable Component) ---
class DropdownManager {
  constructor() {
    this.activeDropdown = null;
    this.updatePositionHandler = null;
    document.addEventListener('click', (event) => {
      if (!event.target.closest('.global-search-dropdown')) {
        this.hideDropdown();
      }
    });
  }

  showDropdown(targetInput, items, onSelect) {
    this.hideDropdown();
    const dropdown = document.createElement('ul');
    dropdown.className = 'global-search-dropdown';
    const dropdownHeight = 300;
    const inputRect = targetInput.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    // Make dropdown width match input
    const dropdownWidth = inputRect.width;
    // Calculate available space above and below
    const spaceBelow = viewportHeight - inputRect.bottom;
    const spaceAbove = inputRect.top;
    // Decide whether to show above or below
    let showAbove = false;
    if (spaceBelow < dropdownHeight && spaceAbove > spaceBelow) {
      showAbove = true;
    }
    // Calculate top position, clamp to viewport
    let topPosition;
    if (showAbove) {
      topPosition = Math.max(8, inputRect.top - dropdownHeight - 8);
    } else {
      topPosition = Math.min(viewportHeight - dropdownHeight - 8, inputRect.bottom + 8);
    }
    // Clamp left/right to viewport
    let leftPosition = inputRect.left;
    if (leftPosition + dropdownWidth > viewportWidth - 8) {
      leftPosition = viewportWidth - dropdownWidth - 8;
    }
    if (leftPosition < 8) leftPosition = 8;
    const styles = {
      position: 'fixed',
      top: topPosition + 'px',
      left: leftPosition + 'px',
      width: dropdownWidth + 'px',
      minWidth: dropdownWidth + 'px',
      maxWidth: dropdownWidth + 'px',
      background: '#fff',
      border: '1px solid #d1d5db',
      borderRadius: '8px',
      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.10)',
      maxHeight: dropdownHeight + 'px',
      overflowY: 'auto',
      overflowX: 'hidden',
      zIndex: '10010',
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
    Object.keys(styles).forEach(prop => {
      dropdown.style.setProperty(prop, styles[prop], 'important');
    });
    dropdown.dropdownHeight = dropdownHeight;
    if (items.length === 0) {
      dropdown.innerHTML = '<li style="padding: 12px 16px; color: #6b7280; font-style: italic; background: #fff;">No products found</li>';
    } else {
      dropdown.innerHTML = items.map(item => {
        const orderCode = item.OrderCode || item.Code || '';
        const description = item.Description || item.ProductName || item['Product Name'] || '';
        return `<li data-product='${JSON.stringify(item).replace(/'/g, "&apos;")}'
                     style="padding: 12px 16px; cursor: pointer; border-bottom: 1px solid #f3f4f6; 
                            transition: background-color 0.15s ease; font-size: 14px; line-height: 1.5;
                            margin: 0; display: block; width: 100%; 
                            white-space: normal; word-wrap: break-word; overflow: visible; background: #fff !important;">
          <span style="font-weight: 600; color: #2563eb;">${Utils.sanitizeInput(orderCode)}</span>
          <span style="color: #6b7280; margin: 0 8px;">—</span>
          <span style="color: #374151;">${Utils.sanitizeInput(description)}</span>
        </li>`;
      }).join('');
    }
    dropdown.querySelectorAll('li[data-product]').forEach(li => {
      li.addEventListener('mouseenter', () => {
        li.classList.add('hover');
      });
      li.addEventListener('mouseleave', () => {
        li.classList.remove('hover');
      });
      li.onclick = () => {
        try {
          const product = JSON.parse(li.getAttribute('data-product'));
          onSelect(product);
          this.hideDropdown();
        } catch (error) {
          console.error('Failed to parse product data:', error);
        }
      };
    });
    document.body.appendChild(dropdown);
    this.activeDropdown = dropdown;
    // Smart reposition on scroll/resize
    this.updatePositionHandler = () => {
      const inputRect = targetInput.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const dropdownHeight = dropdown.dropdownHeight || 300;
      const spaceBelow = viewportHeight - inputRect.bottom;
      const spaceAbove = inputRect.top;
      let showAbove = false;
      if (spaceBelow < dropdownHeight && spaceAbove > spaceBelow) {
        showAbove = true;
      }
      let topPosition;
      if (showAbove) {
        topPosition = Math.max(8, inputRect.top - dropdownHeight - 8);
      } else {
        topPosition = Math.min(viewportHeight - dropdownHeight - 8, inputRect.bottom + 8);
      }
      let leftPosition = inputRect.left;
      if (leftPosition + inputRect.width > viewportWidth - 8) {
        leftPosition = viewportWidth - inputRect.width - 8;
      }
      if (leftPosition < 8) leftPosition = 8;
      dropdown.style.setProperty('top', topPosition + 'px', 'important');
      dropdown.style.setProperty('left', leftPosition + 'px', 'important');
      dropdown.style.setProperty('width', inputRect.width + 'px', 'important');
      dropdown.style.setProperty('min-width', inputRect.width + 'px', 'important');
      dropdown.style.setProperty('max-width', inputRect.width + 'px', 'important');
    };
    window.addEventListener('scroll', this.updatePositionHandler);
    window.addEventListener('resize', this.updatePositionHandler);
  }

  hideDropdown() {
    if (this.activeDropdown) {
      if (this.updatePositionHandler) {
        window.removeEventListener('scroll', this.updatePositionHandler);
        window.removeEventListener('resize', this.updatePositionHandler);
      }
      this.activeDropdown.remove();
      this.activeDropdown = null;
      this.updatePositionHandler = null;
    }
  }
}

/**
 * Manages the product selection grid, including state, rendering, and user interactions.
 */
export class ProductGridManager {
  /**
   * Initializes the ProductGridManager and sets up state.
   */
  constructor() {
    this.gridRows = [];
    this.nextRowId = 1;
    this.currentSearchRow = null;
    this.searchCache = new Map();
    this.searchTimeout = null;
    this.dropdownManager = new DropdownManager();
  }

  /**
   * Initializes the grid, event listeners, and loads any existing products.
   */
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
    this.updateAllRoomDropdowns();
    this.loadExistingProducts();
    this.updateTotals();
    // Remove: if (this.gridRows.length === 0) { this.addEmptyRow(); }
    // Instead, always ensure at least one empty row after loading products and updating totals
    this.ensureAtLeastOneEmptyRow();
    // Initialize sorting (default to room)
    this.handleSortChange();
  }

  /**
   * Sets up all event listeners for grid and UI actions.
   */
  setupEventListeners() {
    // Header actions
    const backBtn = document.getElementById('back-to-home');
    const importBtn = document.getElementById('import-file-btn');
    const downloadBtn = document.getElementById('download-btn');
    const clearAllBtn = document.getElementById('clear-all-btn');
    const settingsBtn = document.getElementById('settings-btn');
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

    if (settingsBtn) {
      settingsBtn.onclick = () => this.showSettingsModal();
    }

    if (addRowBtn) {
      addRowBtn.onclick = () => this.addEmptyRow();
    }

    // Clear All modal events
    const clearAllCancel = document.getElementById('clear-all-cancel');
    const clearAllConfirm = document.getElementById('clear-all-confirm');
    
    if (clearAllCancel) {
      clearAllCancel.onclick = () => this.hideClearAllModal();
    }
    
    if (clearAllConfirm) {
      clearAllConfirm.onclick = () => {
        this.clearAll();
        this.hideClearAllModal();
      };
    }

    // Settings modal events
    const settingsCancel = document.getElementById('settings-cancel');
    const settingsSave = document.getElementById('settings-save');
    
    if (settingsCancel) {
      settingsCancel.onclick = () => this.hideSettingsModal();
    }
    
    if (settingsSave) {
      settingsSave.onclick = () => this.saveSettings();
    }

    // Modal click-outside handlers
    const clearAllModal = document.getElementById('clear-all-modal');
    const settingsModal = document.getElementById('settings-modal');
    
    if (clearAllModal) {
      clearAllModal.onclick = (e) => {
        if (e.target === clearAllModal) {
          this.hideClearAllModal();
        }
      };
    }
    
    if (settingsModal) {
      settingsModal.onclick = (e) => {
        if (e.target === settingsModal) {
          this.hideSettingsModal();
        }
      };
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

    // PDF Download modal elements
    const pdfModal = document.getElementById('pdf-email-modal');
    // PDF Download modal cancel button
    const pdfCancelBtn = document.getElementById('pdf-email-cancel');
    if (pdfCancelBtn && pdfModal) {
      pdfCancelBtn.onclick = () => { pdfModal.style.display = 'none'; };
    }
    // PDF Download form submission
    const pdfForm = document.getElementById('pdf-email-form');
    if (pdfForm) {
      pdfForm.onsubmit = (e) => {
        e.preventDefault();
        const userDetails = {
          name: pdfForm['user-name']?.value || '',
          project: pdfForm['user-project']?.value || '',
          address: pdfForm['user-address']?.value || '',
          email: pdfForm['user-email']?.value || '',
          telephone: pdfForm['user-telephone']?.value || ''
        };
        if (window.showPdfFormScreen) {
          window.showPdfFormScreen(userDetails);
        } else if (typeof showPdfFormScreen === 'function') {
          showPdfFormScreen(userDetails);
        }
        if (pdfModal) pdfModal.style.display = 'none'; // Hide modal after download
      };
    }
  }

  /**
   * Adds an empty row to the grid for new product entry.
   */
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

  /**
   * Removes a row by ID and ensures at least one empty row remains.
   * @param {string} rowId
   */
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
    }
    this.ensureAtLeastOneEmptyRow();
  }

  /**
   * Moves a row up or down in the grid.
   * @param {string} rowId
   * @param {'up'|'down'} direction
   */
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

  /**
   * Handles product search input and displays dropdown results.
   * @param {HTMLElement} searchInput
   * @param {string} query
   */
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

  /**
   * Performs a product search against the data layer.
   * @param {string} query
   * @returns {Promise<Array>}
   */
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
    }); // Removed .slice(0, 10) to show all results
  }

  showSearchResults(searchInput, products, query) {
    this.dropdownManager.showDropdown(
      searchInput,
      products,
      (product) => this.selectProduct(searchInput, product)
    );
  }

  setupDropdownEvents(dropdown, searchInput) {
    // No longer needed, handled by DropdownManager
  }

  hideSearchDropdown(searchInput) {
    this.hideGlobalDropdown();
  }

  hideGlobalDropdown() {
    this.dropdownManager.hideDropdown();
  }

  /**
   * Handles selection of a product from the dropdown.
   * @param {HTMLElement} searchInput
   * @param {Object} product
   */
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

    // Render the grid to show product details
    this.renderGrid();

    // Save to storage
    this.saveRowToStorage(row);

    // Focus next row or create new row
    this.focusNextRowOrCreate(rowId);
  }

  /**
   * Saves a row's product selection to storage.
   * @param {Object} row
   */
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

  /**
   * Focuses the next row's search input or creates a new row if at the end.
   * @param {string} currentRowId
   */
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

  /**
   * Handles input events in the grid (delegated).
   * @param {Event} event
   */
  handleGridInput(event) {
    const target = event.target;
    if (
      target.classList.contains('grid-search-input') && !target.classList.contains('populated')
    ) {
      this.handleProductSearch(target, target.value);
    } else if (
      target.classList.contains('grid-input') ||
      target.classList.contains('grid-textarea') ||
      target.classList.contains('grid-select')
    ) {
      this.updateRowFromInput(target);
    }
  }

  /**
   * Handles change events in the grid (delegated).
   * @param {Event} event
   */
  handleGridChange(event) {
    const target = event.target;
    if (
      target.classList.contains('grid-select') ||
      target.classList.contains('grid-input') ||
      target.classList.contains('grid-textarea')
    ) {
      this.updateRowFromInput(target);
    }
  }

  /**
   * Handles click events in the grid (delegated).
   * @param {Event} event
   */
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
      // Always use the global dropdown for keyboard navigation
      const globalDropdown = document.querySelector('.global-search-dropdown');
      if (globalDropdown) {
        this.handleDropdownKeyboard(event, globalDropdown);
      } else if (event.key === 'Enter') {
        event.preventDefault();
        this.handleProductSearch(event.target, event.target.value);
      }
    }
  }

  handleDropdownKeyboard(event, dropdown) {
    const globalDropdown = document.querySelector('.global-search-dropdown');
    if (!globalDropdown) return;
    const items = globalDropdown.querySelectorAll('li[data-product]');
    let activeItem = globalDropdown.querySelector('li.active');
    let newActive = null;
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        if (!activeItem) {
          newActive = items[0];
        } else {
          activeItem.classList.remove('active');
          const currentIndex = Array.from(items).indexOf(activeItem);
          const nextIndex = (currentIndex + 1) % items.length;
          newActive = items[nextIndex];
        }
        if (newActive) {
          newActive.classList.add('active');
          newActive.scrollIntoView({block: 'nearest'});
        }
        break;
      case 'ArrowUp':
        event.preventDefault();
        if (!activeItem) {
          newActive = items[items.length - 1];
        } else {
          activeItem.classList.remove('active');
          const currentIndex = Array.from(items).indexOf(activeItem);
          const prevIndex = currentIndex === 0 ? items.length - 1 : currentIndex - 1;
          newActive = items[prevIndex];
        }
        if (newActive) {
          newActive.classList.add('active');
          newActive.scrollIntoView({block: 'nearest'});
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

  /**
   * Handles focusin events in the grid (delegated).
   * @param {Event} event
   */
  handleGridFocusIn(event) {}

  /**
   * Handles focusout events in the grid (delegated).
   * @param {Event} event
   */
  handleGridFocusOut(event) {}

  /**
   * Handles dragstart events in the grid (delegated).
   * @param {Event} event
   */
  handleDragStart(event) {}

  /**
   * Handles dragover events in the grid (delegated).
   * @param {Event} event
   */
  handleDragOver(event) {}

  /**
   * Handles drop events in the grid (delegated).
   * @param {Event} event
   */
  handleDrop(event) {}

  /**
   * Handles dragend events in the grid (delegated).
   * @param {Event} event
   */
  handleDragEnd(event) {}

  // Helper method to clean up all open dropdowns
  hideAllDropdowns() {
    this.hideGlobalDropdown();
  }

  /**
   * Shows the modal to confirm clearing all selections.
   */
  showClearAllModal() {
    const modal = document.getElementById('clear-all-modal');
    if (modal) {
      modal.style.display = 'flex';
    }
  }

  /**
   * Hides the clear-all confirmation modal.
   */
  hideClearAllModal() {
    const modal = document.getElementById('clear-all-modal');
    if (modal) {
      modal.style.display = 'none';
    }
  }

  /**
   * Shows the settings modal.
   */
  showSettingsModal() {
    const modal = document.getElementById('settings-modal');
    if (modal) {
      modal.style.display = 'flex';
    }
  }

  /**
   * Hides the settings modal.
   */
  hideSettingsModal() {
    const modal = document.getElementById('settings-modal');
    if (modal) {
      modal.style.display = 'none';
    }
  }

  /**
   * Updates a row's data from an input element.
   * @param {HTMLElement} input
   */
  updateRowFromInput(input) {
    const rowElement = input.closest('.grid-row');
    const rowId = rowElement.dataset.rowId;
    const row = this.gridRows.find(r => r.id === rowId);

    if (!row) return;

    let shouldUpdateTotal = false;

    // Update row data based on input type
    if (input.classList.contains('grid-select') && input.name === 'room') {
      if (input.value === '__ADD_NEW_ROOM__') {
        // User selected "Add new room..." option
        const roomName = prompt('Enter new room name:');
        if (roomName && roomName.trim()) {
          const trimmedName = roomName.trim();
          if (StorageManager.addCustomRoom(trimmedName)) {
            // Successfully added room
            row.room = trimmedName;
            console.log('✅ Added new room:', trimmedName);
            
            // Refresh all room dropdowns in the grid
            this.updateAllRoomDropdowns();
            
            // Set the new room value for this specific dropdown
            input.value = trimmedName;
          } else {
            alert('Room name already exists or is invalid');
            // Reset to previous selection
            input.value = row.room || 'Blank';
            return;
          }
        } else {
          // User cancelled or entered empty name, reset selection
          input.value = row.room || 'Blank';
          return;
        }
      } else {
        // Normal room selection
        row.room = input.value;
      }
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

  /**
   * Loads any previously selected products from storage and populates the grid.
   */
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
        price: item.product?.RRP_INCGST || item.product?.rrpIncGst || item.product?.Price || '',
        notes: item.notes || '',
        storageId: item.id
      };
      this.gridRows.push(row);
    });
    this.renderGrid();
  }

  /**
   * Renders the entire grid based on the current state.
   */
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
      const roomClass = this.getRoomClass(room);
      
      // Room header as a proper table row that spans all columns
      const roomHeaderRow = `
        <div class="grid-row room-header-row ${roomClass}">
          <div class="col-search room-header-cell" colspan="8">
            <div class="room-header-content">
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

  /**
   * Returns the HTML for a single row.
   * @param {Object} row
   * @returns {string}
   */
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

  getRoomClass(roomName) {
    const roomClasses = {
      'Blank': 'blank-room',
      'Bath 1': 'bath-room',
      'Bath 2': 'bath-room',
      'Ensuite': 'bath-room',
      'Powder': 'bath-room',
      'Kitchen': 'kitchen-room',
      'Laundry': 'laundry-room',
      'Alfresco': 'alfresco-room',
      'Butlers': 'butlers-room',
      'Other': 'other-room',
      'All Products': 'all-products'
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

    // Add "Add new room..." option
    options += '<option value="__ADD_NEW_ROOM__" style="font-weight: bold; color: #2563eb;">➕ Add new room...</option>';

    return options;
  }

  /**
   * Updates all room dropdowns in the grid and bulk modal.
   */
  updateAllRoomDropdowns() {
    // Update all room select dropdowns in the grid
    const roomSelects = document.querySelectorAll('.grid-select[name="room"]');
    roomSelects.forEach(select => {
      const currentValue = select.value;
      const currentRow = this.gridRows.find(r => r.id === select.closest('.grid-row').dataset.rowId);
      if (currentRow) {
        select.innerHTML = this.getRoomOptions(currentRow.room);
      }
    });
    // Update bulk room select if it exists
    const bulkRoomSelect = document.getElementById('bulk-room-select');
    if (bulkRoomSelect) {
      bulkRoomSelect.innerHTML = this.getRoomOptions('Blank');
    }
  }

  /**
   * Ensures there is always at least one empty row in the grid.
   */
  ensureAtLeastOneEmptyRow() {
    if (this.gridRows.length === 0) {
      this.addEmptyRow();
    }
  }

  /**
   * Updates the UI with the total items, rooms, and value.
   */
  updateTotals() {
    const totalItemsElement = document.getElementById('total-items');
    const totalRoomsElement = document.getElementById('total-rooms');
    const totalValueElement = document.getElementById('total-value');

    let totalItems = 0;
    let totalValue = 0;
    const uniqueRooms = new Set();

    this.gridRows.forEach(row => {
      if (row.product) {
        totalItems += row.quantity;
        const price = parseFloat(row.price) || 0;
        totalValue += price * row.quantity;
        if (row.room && row.room !== 'Blank' && row.room.trim() !== '') {
          uniqueRooms.add(row.room);
        }
      }
    });

    if (totalItemsElement) {
      totalItemsElement.textContent = `${totalItems} items`;
    }
    if (totalRoomsElement) {
      totalRoomsElement.textContent = `${uniqueRooms.size} Rooms`;
    }
    if (totalValueElement) {
      totalValueElement.textContent = `$${totalValue.toFixed(2)}`;
    }
  }

  /**
   * Clears all selections and resets the grid.
   */
  clearAll() {
    // Clear storage
    StorageManager.clearAllSelections();
    // Clear grid
    this.gridRows = [];
    this.nextRowId = 1;
    this.renderGrid();
    this.updateTotals();
    this.ensureAtLeastOneEmptyRow();
  }

  /**
   * Shows the import modal for importing products.
   */
  showImportModal() {
    const modal = document.getElementById('file-import-modal');
    if (modal) {
      modal.style.display = 'flex';
    }
  }

  /**
   * Shows the download modal for downloading the PDF/email.
   */
  showDownloadModal() {
    const modal = document.getElementById('pdf-email-modal');
    if (modal) {
      modal.style.display = 'flex';
    }
  }

  /**
   * Refreshes the grid UI and event listeners after major data changes (e.g., import).
   */
  refreshUI() {
    this.init();
  }
} 