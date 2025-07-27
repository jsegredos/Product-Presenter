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

const ASSETS_PDF_PATH = 'assets/';
const TIP_TAIL_STORAGE_KEY = 'tipTailSettings';
const CUSTOMER_LOGO_KEY = 'customerLogo';

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
    const sortRefreshBtn = document.getElementById('sort-refresh-btn');
    if (sortRefreshBtn) {
      sortRefreshBtn.onclick = () => this.handleSortChange();
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
    // PDF Download form persistence keys
    const PDF_FORM_KEY = 'pdfFormSettings';
    // PDF Download form submission
    const pdfForm = document.getElementById('pdf-email-form');
    // Load persisted values on modal open
    if (pdfModal) {
      pdfModal.addEventListener('show', () => {
        const saved = Utils.getStorageItem(PDF_FORM_KEY, {});
        if (pdfForm) {
          pdfForm['user-name'].value = saved.name || '';
          pdfForm['user-project'].value = saved.project || '';
          pdfForm['user-address'].value = saved.address || '';
          pdfForm['user-email'].value = saved.email || '';
          pdfForm['user-telephone'].value = saved.telephone || '';
          pdfForm['exclude-prices'].checked = !!saved.excludePrices;
          pdfForm['exclude-qty'].checked = !!saved.excludeQty;
        }
      });
    }
    // Save on change
    if (pdfForm) {
      pdfForm.addEventListener('input', () => {
        Utils.setStorageItem(PDF_FORM_KEY, {
          name: pdfForm['user-name'].value,
          project: pdfForm['user-project'].value,
          address: pdfForm['user-address'].value,
          email: pdfForm['user-email'].value,
          telephone: pdfForm['user-telephone'].value,
          excludePrices: pdfForm['exclude-prices'].checked,
          excludeQty: pdfForm['exclude-qty'].checked
        });
      });
      pdfForm.addEventListener('change', () => {
        Utils.setStorageItem(PDF_FORM_KEY, {
          name: pdfForm['user-name'].value,
          project: pdfForm['user-project'].value,
          address: pdfForm['user-address'].value,
          email: pdfForm['user-email'].value,
          telephone: pdfForm['user-telephone'].value,
          excludePrices: pdfForm['exclude-prices'].checked,
          excludeQty: pdfForm['exclude-qty'].checked
        });
      });
      pdfForm.onsubmit = (e) => {
        e.preventDefault();
        Utils.setStorageItem(PDF_FORM_KEY, {
          name: pdfForm['user-name'].value,
          project: pdfForm['user-project'].value,
          address: pdfForm['user-address'].value,
          email: pdfForm['user-email'].value,
          telephone: pdfForm['user-telephone'].value,
          excludePrices: pdfForm['exclude-prices'].checked,
          excludeQty: pdfForm['exclude-qty'].checked
        });
        const userDetails = {
          name: pdfForm['user-name']?.value || '',
          project: pdfForm['user-project']?.value || '',
          address: pdfForm['user-address']?.value || '',
          email: pdfForm['user-email']?.value || '',
          telephone: pdfForm['user-telephone']?.value || '',
          excludePrice: pdfForm['exclude-qty']?.checked
            ? true
            : (pdfForm['exclude-price']?.checked || pdfForm['exclude-prices']?.checked || false),
          excludeQty: pdfForm['exclude-qty']?.checked || false
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
      price: '0.00',
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
    const defaultPrice = product.RRP_INCGST || product['RRP INC GST'] || product.rrpIncGst || product.Price || '';
    row.price = defaultPrice;

    // Update the price input field in the DOM immediately
    const priceInput = rowElement.querySelector('input[name="price"]');
    if (priceInput) {
      priceInput.value = defaultPrice;
    }

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
      RRP_INCGST: row.price || row.product.RRP_INCGST || row.product['RRP INC GST'] || row.product.rrpIncGst || '0',
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
  handleDragStart(event) {
    const row = event.target.closest('.grid-row');
    if (!row || !event.target.classList.contains('grid-drag-handle')) {
      event.preventDefault();
      return;
    }
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', row.dataset.rowId);
    row.classList.add('dragging');
  }

  /**
   * Handles dragover events in the grid (delegated).
   * @param {Event} event
   */
  handleDragOver(event) {
    event.preventDefault();
    const row = event.target.closest('.grid-row');
    if (row && !row.classList.contains('dragging')) {
      row.classList.add('drag-over');
    }
    event.dataTransfer.dropEffect = 'move';
  }

  /**
   * Handles drop events in the grid (delegated).
   * @param {Event} event
   */
  handleDrop(event) {
    event.preventDefault();
    const fromRowId = event.dataTransfer.getData('text/plain');
    const toRow = event.target.closest('.grid-row');
    if (!toRow || !fromRowId) return;
    const toRowId = toRow.dataset.rowId;
    if (fromRowId === toRowId) return;
    // Find indexes
    const fromIdx = this.gridRows.findIndex(r => r.id === fromRowId);
    const toIdx = this.gridRows.findIndex(r => r.id === toRowId);
    if (fromIdx === -1 || toIdx === -1) return;
    // Move row
    const [movedRow] = this.gridRows.splice(fromIdx, 1);
    this.gridRows.splice(toIdx, 0, movedRow);
    this.renderGrid();
  }

  /**
   * Handles dragend events in the grid (delegated).
   * @param {Event} event
   */
  handleDragEnd(event) {
    document.querySelectorAll('.grid-row.dragging').forEach(row => row.classList.remove('dragging'));
    document.querySelectorAll('.grid-row.drag-over').forEach(row => row.classList.remove('drag-over'));
  }

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
  async showSettingsModal() {
    const modal = document.getElementById('settings-modal');
    if (modal) {
      modal.style.display = 'flex';
      // Load existing settings when modal opens
      setTimeout(async () => {
        // Load staff contact details from storage and populate fields
        const userSettings = StorageManager.getUserSettings();
        if (userSettings) {
          const staffNameInput = document.getElementById('staff-name');
          const staffEmailInput = document.getElementById('staff-email');
          const staffPhoneInput = document.getElementById('staff-telephone');
          if (staffNameInput) staffNameInput.value = userSettings.staffName || '';
          if (staffEmailInput) staffEmailInput.value = userSettings.staffEmail || '';
          if (staffPhoneInput) staffPhoneInput.value = userSettings.staffPhone || '';
        }
        const versionSpan = document.getElementById('settings-version-info');
        if (versionSpan) {
          try {
            const resp = await fetch('version.txt');
            let version = (await resp.text()).trim();
            // Only use the first line and strip unwanted characters
            version = version.split(/\r?\n/)[0].replace(/[^0-9.v]/g, '');
            versionSpan.innerText = version ? `v${version}` : '';
            versionSpan.title = 'App Version';
          } catch (e) {
            versionSpan.innerText = '';
          }
        }
        // Add manual refresh for product catalog
        const refreshBtn = document.getElementById('refresh-catalog-btn');
        if (refreshBtn) {
          refreshBtn.onclick = () => {
            localStorage.removeItem('productCatalogCsv');
            window.location.reload();
          };
        }
        // Add manual refresh for PDF files
        const refreshPdfBtn = document.getElementById('refresh-pdf-files-btn');
        if (refreshPdfBtn) {
          refreshPdfBtn.onclick = async () => {
            await this.refreshPdfFileList();
            // Show a brief success message
            const originalText = refreshPdfBtn.textContent;
            refreshPdfBtn.textContent = '✅ Refreshed!';
            refreshPdfBtn.style.background = '#dcfce7';
            refreshPdfBtn.style.color = '#059669';
            setTimeout(() => {
              refreshPdfBtn.textContent = originalText;
              refreshPdfBtn.style.background = '#f3f4f6';
              refreshPdfBtn.style.color = '#059669';
            }, 2000);
          };
        }
        // --- Customer Logo UI logic ---
        this.loadCustomerLogoPreview();
        this.setupCustomerLogoHandlers();
        // --- Tip/Tail PDF UI logic ---
        await this.populateTipTailDropdowns();
        this.loadTipTailSelections();
        this.setupTipTailHandlers();
      }, 0);
    }
  }

  loadCustomerLogoPreview() {
    const preview = document.getElementById('customer-logo-preview');
    const logoData = localStorage.getItem(CUSTOMER_LOGO_KEY);
    if (preview) {
      preview.innerHTML = logoData ? `<img src="${logoData}" style="max-height:90px;max-width:180px;object-fit:contain;">` : '';
    }
  }

  setupCustomerLogoHandlers() {
    const upload = document.getElementById('customer-logo-upload');
    const clear = document.getElementById('customer-logo-clear');
    const preview = document.getElementById('customer-logo-preview');
    upload.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          localStorage.setItem(CUSTOMER_LOGO_KEY, ev.target.result);
          if (preview) preview.innerHTML = `<img src="${ev.target.result}" style="max-height:90px;max-width:180px;object-fit:contain;">`;
        };
        reader.readAsDataURL(file);
      }
    };
    clear.onclick = () => {
      localStorage.removeItem(CUSTOMER_LOGO_KEY);
      if (preview) preview.innerHTML = '';
      if (upload) upload.value = '';
    };
  }

  async populateTipTailDropdowns() {
    // Fetch PDF files from server
    let assetPdfs = [];
    try {
      const resp = await fetch('/assets-list');
      if (resp.ok) {
        assetPdfs = await resp.json();
      }
    } catch (e) {
      // Dynamic fallback: try to detect PDF files in assets directory
      assetPdfs = await this.detectAvailablePdfFiles();
    }
    assetPdfs = assetPdfs.map(f => 'assets/' + f);
    const tipSelect = document.getElementById('tip-pdf-select');
    const tailSelect = document.getElementById('tail-pdf-select');
    if (tipSelect && tailSelect) {
      tipSelect.innerHTML = '<option value="">(None)</option>';
      tailSelect.innerHTML = '<option value="">(None)</option>';
      assetPdfs.forEach(pdf => {
        const name = pdf.split('/').pop();
        tipSelect.innerHTML += `<option value="${pdf}">${name}</option>`;
        tailSelect.innerHTML += `<option value="${pdf}">${name}</option>`;
      });
    }
  }

  // Dynamic PDF file detection for live environments
  async detectAvailablePdfFiles() {
    const availableFiles = [];
    
    // First, try to get a list from the server if available (most reliable)
    try {
      const response = await fetch('/assets-list');
      if (response.ok) {
        const serverFiles = await response.json();
        console.log('✅ Server provided files:', serverFiles);
        return serverFiles;
      }
    } catch (error) {
      console.log('ℹ️ Server endpoint not available, using dynamic detection');
    }
    
    // Dynamic detection: comprehensive pattern matching
    const patternsToTry = [
      // Current known files
      'tip-AandD.pdf', 'tip-Builder.pdf', 'tip-Merchant.pdf', 'tip-Volume Merchant.pdf',
      'tail.pdf', 'tail-generic.pdf',
      // Common variations
      'tip.pdf', 'prepend.pdf', 'append.pdf', 'header.pdf', 'footer.pdf',
      // Generic variations
      'tip-generic.pdf', 'prepend-generic.pdf', 'append-generic.pdf',
      // Numbered variations (tip-1, tip-2, etc.)
      ...Array.from({length: 20}, (_, i) => `tip-${i+1}.pdf`),
      ...Array.from({length: 20}, (_, i) => `tail-${i+1}.pdf`),
      ...Array.from({length: 20}, (_, i) => `prepend-${i+1}.pdf`),
      ...Array.from({length: 20}, (_, i) => `append-${i+1}.pdf`),
      // Letter variations (tip-a, tip-b, etc.)
      ...Array.from({length: 26}, (_, i) => `tip-${String.fromCharCode(97+i)}.pdf`),
      ...Array.from({length: 26}, (_, i) => `tail-${String.fromCharCode(97+i)}.pdf`),
      // Date variations (tip-2024, tip-2023, etc.)
      ...Array.from({length: 5}, (_, i) => `tip-${2024-i}.pdf`),
      ...Array.from({length: 5}, (_, i) => `tail-${2024-i}.pdf`)
    ];
    
    console.log('🔍 Scanning for PDF files in assets directory...');
    
    // Test each pattern to see if it exists
    for (const filename of patternsToTry) {
      try {
        const response = await fetch(`assets/${filename}`, { 
          method: 'HEAD',
          cache: 'no-cache' // Prevent caching issues
        });
        if (response.ok) {
          availableFiles.push(filename);
          console.log(`✅ Found: ${filename}`);
        }
      } catch (error) {
        // File doesn't exist or can't be accessed - skip silently
      }
    }
    
    console.log(`🎯 Final detected PDF files (${availableFiles.length} found):`, availableFiles);
    return availableFiles;
  }

  // Refresh PDF file list manually
  async refreshPdfFileList() {
    console.log('🔄 Refreshing PDF file list...');
    await this.populateTipTailDropdowns();
    console.log('✅ PDF file list refreshed');
  }

  loadTipTailSelections() {
    const settings = JSON.parse(localStorage.getItem(TIP_TAIL_STORAGE_KEY) || '{}');
    const tipSelect = document.getElementById('tip-pdf-select');
    const tailSelect = document.getElementById('tail-pdf-select');
    const tipUpload = document.getElementById('tip-pdf-upload');
    const tailUpload = document.getElementById('tail-pdf-upload');
    
    // Handle tip selection
    if (tipSelect) {
      if (settings.tipUpload) {
        // Custom file uploaded - show "Custom file selected"
        tipSelect.innerHTML = '<option value="">Custom file selected</option>';
        tipSelect.value = '';
        // Make the file input bold blue to show there's a file
        if (tipUpload) {
          tipUpload.style.fontWeight = 'bold';
          tipUpload.style.color = '#2563eb';
        }
      } else if (settings.tipAsset) {
        tipSelect.value = settings.tipAsset;
      }
    }
    
    // Handle tail selection
    if (tailSelect) {
      if (settings.tailUpload) {
        // Custom file uploaded - show "Custom file selected"
        tailSelect.innerHTML = '<option value="">Custom file selected</option>';
        tailSelect.value = '';
        // Make the file input bold blue to show there's a file
        if (tailUpload) {
          tailUpload.style.fontWeight = 'bold';
          tailUpload.style.color = '#2563eb';
        }
      } else if (settings.tailAsset) {
        tailSelect.value = settings.tailAsset;
      }
    }
  }

  setupTipTailHandlers() {
    const tipSelect = document.getElementById('tip-pdf-select');
    const tailSelect = document.getElementById('tail-pdf-select');
    const tipUpload = document.getElementById('tip-pdf-upload');
    const tailUpload = document.getElementById('tail-pdf-upload');
    const tipClear = document.getElementById('tip-pdf-clear');
    const tailClear = document.getElementById('tail-pdf-clear');
    const tipSelected = document.getElementById('tip-pdf-selected');
    const tailSelected = document.getElementById('tail-pdf-selected');

    tipSelect.onchange = () => {
      this.saveTipTailSettings({ tipAsset: tipSelect.value, tipUpload: null, tipUploadName: '' });
      if (tipSelected) tipSelected.textContent = '';
    };
    tailSelect.onchange = () => {
      this.saveTipTailSettings({ tailAsset: tailSelect.value, tailUpload: null, tailUploadName: '' });
      if (tailSelected) tailSelected.textContent = '';
    };
    tipUpload.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          // Convert ArrayBuffer to base64 string for localStorage storage
          const arrayBuffer = ev.target.result;
          const uint8Array = new Uint8Array(arrayBuffer);
          let binaryString = '';
          for (let i = 0; i < uint8Array.length; i++) {
            binaryString += String.fromCharCode(uint8Array[i]);
          }
          const base64String = btoa(binaryString);
          this.saveTipTailSettings({ tipAsset: '', tipUpload: base64String, tipUploadName: file.name });
          if (tipSelect) {
            tipSelect.value = '';
            tipSelect.innerHTML = '<option value="">Custom file selected</option>';
          }
          // Make the file input filename bold blue
          if (tipUpload) {
            tipUpload.style.fontWeight = 'bold';
            tipUpload.style.color = '#2563eb';
          }
        };
        reader.readAsArrayBuffer(file);
      }
    };
    tailUpload.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          // Convert ArrayBuffer to base64 string for localStorage storage
          const arrayBuffer = ev.target.result;
          const uint8Array = new Uint8Array(arrayBuffer);
          let binaryString = '';
          for (let i = 0; i < uint8Array.length; i++) {
            binaryString += String.fromCharCode(uint8Array[i]);
          }
          const base64String = btoa(binaryString);
          this.saveTipTailSettings({ tailAsset: '', tailUpload: base64String, tailUploadName: file.name });
          if (tailSelect) {
            tailSelect.value = '';
            tailSelect.innerHTML = '<option value="">Custom file selected</option>';
          }
          // Make the file input filename bold blue
          if (tailUpload) {
            tailUpload.style.fontWeight = 'bold';
            tailUpload.style.color = '#2563eb';
          }
        };
        reader.readAsArrayBuffer(file);
      }
    };
    tipClear.onclick = async () => {
      this.saveTipTailSettings({ tipAsset: '', tipUpload: null, tipUploadName: '' });
      if (tipSelect) {
        tipSelect.value = '';
        // Restore original dropdown options for tip only
        tipSelect.innerHTML = '<option value="">(None)</option>';
        // Get asset PDFs dynamically
        let assetPdfs = [];
        try {
          const resp = await fetch('/assets-list');
          if (resp.ok) {
            assetPdfs = await resp.json();
          }
        } catch (e) {
          // Dynamic fallback: try to detect PDF files in assets directory
          assetPdfs = await this.detectAvailablePdfFiles();
        }
        assetPdfs.forEach(pdf => {
          tipSelect.innerHTML += `<option value="assets/${pdf}">${pdf}</option>`;
        });
      }
      // Clear the file input element and reset styling
      if (tipUpload) {
        tipUpload.value = '';
        tipUpload.style.fontWeight = 'normal';
        tipUpload.style.color = ''; // Reset color
      }
    };
    tailClear.onclick = async () => {
      this.saveTipTailSettings({ tailAsset: '', tailUpload: null, tailUploadName: '' });
      if (tailSelect) {
        tailSelect.value = '';
        // Restore original dropdown options for tail only
        tailSelect.innerHTML = '<option value="">(None)</option>';
        // Get asset PDFs dynamically
        let assetPdfs = [];
        try {
          const resp = await fetch('/assets-list');
          if (resp.ok) {
            assetPdfs = await resp.json();
          }
        } catch (e) {
          // Dynamic fallback: try to detect PDF files in assets directory
          assetPdfs = await this.detectAvailablePdfFiles();
        }
        assetPdfs.forEach(pdf => {
          tailSelect.innerHTML += `<option value="assets/${pdf}">${pdf}</option>`;
        });
      }
      // Clear the file input element and reset styling
      if (tailUpload) {
        tailUpload.value = '';
        tailUpload.style.fontWeight = 'normal';
        tailUpload.style.color = ''; // Reset color
      }
    };
  }

  saveTipTailSettings(partial) {
    const settings = JSON.parse(localStorage.getItem(TIP_TAIL_STORAGE_KEY) || '{}');
    const newSettings = { ...settings, ...partial };
    localStorage.setItem(TIP_TAIL_STORAGE_KEY, JSON.stringify(newSettings));
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

  saveSettings() {
    const staffName = document.getElementById('staff-name')?.value || '';
    const staffEmail = document.getElementById('staff-email')?.value || '';
    const staffPhone = document.getElementById('staff-telephone')?.value || '';
    
    const settings = {
      staffName: staffName.trim(),
      staffEmail: staffEmail.trim(),
      staffPhone: staffPhone.trim()
    };
    
    // Save to storage
    StorageManager.saveUserSettings(settings);
    
    // Hide the modal
    this.hideSettingsModal();
    
    // Show success message
    console.log('Settings saved successfully:', settings);
  }

  loadSettings() {
    const settings = StorageManager.getUserSettings();
    
    // Populate the form fields
    const staffNameField = document.getElementById('staff-name');
    const staffEmailField = document.getElementById('staff-email');
    const staffPhoneField = document.getElementById('staff-telephone');
    
    if (staffNameField) staffNameField.value = settings.staffName || '';
    if (staffEmailField) staffEmailField.value = settings.staffEmail || '';
    if (staffPhoneField) staffPhoneField.value = settings.staffPhone || '';
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
      const unitPrice = parseFloat((row.price || '').toString().replace(/,/g, '')) || 0;
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
    // Ensure order code is shown as a plain integer (no decimals, no commas)
    const displayOrderCode = productCode ? String(parseInt(productCode, 10)) : '';
    // Always show product's price if product is selected, otherwise row.price
    const displayPrice = product ? (product.RRP_INCGST || product.rrpIncGst || product.Price || row.price || '') : (row.price || '');
    
    // Calculate total price
    const unitPrice = parseFloat((displayPrice || '').toString().replace(/,/g, '')) || 0;
    const quantity = parseInt(row.quantity) || 1;
    const totalPrice = unitPrice * quantity;
    const displayTotal = totalPrice > 0 ? totalPrice.toFixed(2) : '';

    return `
      <div class="grid-row" data-row-id="${row.id}">
        <div class="col-image grid-image-cell">
          ${product ? `<img src="${imageUrl}" alt="Product" class="grid-product-image" onerror="this.src='assets/no-image.png';">` : ''}
        </div>
        <div class="col-product grid-product-cell ${product ? 'has-product' : 'empty-product'}">
          ${product ? `
            <div class="grid-product-display">
              <div class="grid-product-name">
                <strong>${Utils.sanitizeInput(displayOrderCode)}</strong> ${Utils.sanitizeInput(productName)}
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
          <textarea class="grid-textarea" name="notes" placeholder="Notes..." rows="1" maxlength="140">${Utils.sanitizeInput(row.notes)}</textarea>
        </div>
        <div class="col-actions grid-actions-cell">
          <div class="grid-actions-group">
            <button class="grid-move-btn grid-move-up" title="Move up" data-direction="up">↑</button>
            <button class="grid-move-btn grid-move-down" title="Move down" data-direction="down">↓</button>
            <div class="grid-drag-handle" title="Drag to reorder" draggable="true">⋮⋮</div>
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
  async showDownloadModal() {
    const modal = document.getElementById('pdf-email-modal');
    if (modal) {
      modal.style.display = 'flex';
      // Load customer logo preview for the PDF modal
      this.loadCustomerLogoPreview();
      this.setupCustomerLogoHandlers();
      // Populate tip/tail dropdowns and handlers for the PDF modal
      await this.populateTipTailDropdowns();
      this.loadTipTailSelections();
      this.setupTipTailHandlers();
    }
  }

  /**
   * Refreshes the grid UI and event listeners after major data changes (e.g., import).
   */
  refreshUI() {
    this.init();
  }
} 