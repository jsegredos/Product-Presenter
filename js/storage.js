/**
 * Storage Management Module
 * Handles all localStorage operations with enhanced error handling and validation
 *
 * @author Seima Development Team
 * @version 2.0.0
 * @since 1.8.1
 */

import { config } from './config-manager.js';
import { errorHandler, ErrorCategory, LogLevel } from './error-handler.js';
import { Utils } from './utils.js';

/**
 * Storage Manager class for handling all localStorage operations
 * Provides safe, validated storage with error handling and data validation
 * @class StorageManager
 */
export class StorageManager {
  /**
   * Get custom rooms from storage
   * @static
   * @returns {Array<Object>} Array of custom room objects
   */
  static getCustomRooms() {
    return Utils.getStorageItem(config.get('storage.keys.customRooms'), []);
  }

  /**
   * Set custom rooms in storage
   * @static
   * @param {Array<Object>} rooms - Array of room objects to store
   * @returns {boolean} True if successful
   */
  static setCustomRooms(rooms) {
    return Utils.setStorageItem(config.get('storage.keys.customRooms'), rooms);
  }

  /**
   * Add a new custom room
   * @static
   * @param {string} roomName - Name of the room to add
   * @returns {boolean} True if room was added successfully
   */
  static addCustomRoom(roomName) {
    const customRooms = this.getCustomRooms();
    const sanitizedName = Utils.sanitizeInput(roomName, 50);

    if (!sanitizedName) {return false;}

    // Check if room already exists
    const predefinedRooms = config.get('rooms.predefined', []);
    const allRooms = [...predefinedRooms.map(r => r.name), ...customRooms.map(r => r.name)];
    if (allRooms.includes(sanitizedName)) {return false;}

    customRooms.push({ name: sanitizedName });
    return this.setCustomRooms(customRooms);
  }

  /**
   * Remove a custom room by index
   * @static
   * @param {number} index - Index of the room to remove
   * @returns {boolean} True if room was removed successfully
   */
  static removeCustomRoom(index) {
    const customRooms = this.getCustomRooms();
    if (index >= 0 && index < customRooms.length) {
      customRooms.splice(index, 1);
      return this.setCustomRooms(customRooms);
    }
    return false;
  }

  /**
   * Get selected products from storage
   * @static
   * @returns {Array<Object>} Array of selected product objects
   */
  static getSelectedProducts() {
    return Utils.getStorageItem(config.get('storage.keys.selectedProducts'), []);
  }

  /**
   * Set selected products in storage
   * @static
   * @param {Array<Object>} products - Array of product objects to store
   * @returns {boolean} True if successful
   */
  static setSelectedProducts(products) {
    return Utils.setStorageItem(config.get('storage.keys.selectedProducts'), products);
  }

  /**
   * Add a product to the selection
   * @static
   * @param {Object} product - Product object to add
   * @param {string} notes - User notes for the product
   * @param {string} room - Room assignment
   * @param {number} quantity - Quantity to add
   * @returns {boolean} True if product was added successfully
   */
  static addProductToSelection(product, notes, room, quantity) {
    try {
      const selectedProducts = this.getSelectedProducts();
      const maxAnnotationLength = config.get('ui.annotationMaxLength', 140);

      const productEntry = {
        id: Utils.generateId(),
        product: Utils.deepClone(product),
        notes: Utils.sanitizeInput(notes, maxAnnotationLength),
        room: Utils.sanitizeInput(room, 50),
        quantity: Math.max(1, parseInt(quantity) || 1),
        timestamp: Date.now()
      };

      selectedProducts.push(productEntry);
      const success = this.setSelectedProducts(selectedProducts);

      if (success) {
        errorHandler.log(`Product added to selection: ${product.OrderCode}`, LogLevel.DEBUG);
      } else {
        errorHandler.handleError({
          message: 'Failed to save product to selection',
          category: ErrorCategory.STORAGE,
          level: LogLevel.WARN
        });
      }

      return success;
    } catch (error) {
      errorHandler.handleError({
        message: 'Error adding product to selection',
        error,
        category: ErrorCategory.STORAGE,
        level: LogLevel.ERROR
      });
      return false;
    }
  }

  static updateProductQuantity(productId, newQuantity) {
    const selectedProducts = this.getSelectedProducts();
    const productIndex = selectedProducts.findIndex(p => p.id === productId);

    if (productIndex !== -1) {
      selectedProducts[productIndex].quantity = Math.max(1, parseInt(newQuantity) || 1);
      return this.setSelectedProducts(selectedProducts);
    }
    return false;
  }

  static updateProductRoom(productId, newRoom) {
    const selectedProducts = this.getSelectedProducts();
    const productIndex = selectedProducts.findIndex(p => p.id === productId);

    if (productIndex !== -1) {
      selectedProducts[productIndex].room = Utils.sanitizeInput(newRoom, 50);
      return this.setSelectedProducts(selectedProducts);
    }
    return false;
  }

  static updateProductNotes(productId, newNotes) {
    const selectedProducts = this.getSelectedProducts();
    const productIndex = selectedProducts.findIndex(p => p.id === productId);

    if (productIndex !== -1) {
      selectedProducts[productIndex].notes = Utils.sanitizeInput(newNotes, config.get('ui.annotationMaxLength', 140));
      return this.setSelectedProducts(selectedProducts);
    }
    return false;
  }

  static updateProductPrice(productId, newPrice) {
    const selectedProducts = this.getSelectedProducts();
    const productIndex = selectedProducts.findIndex(p => p.id === productId);

    if (productIndex !== -1) {
      // Update the UserEditedPrice field in the product data
      selectedProducts[productIndex].product.UserEditedPrice = newPrice;
      return this.setSelectedProducts(selectedProducts);
    }
    return false;
  }

  static removeProductFromSelection(productId) {
    const selectedProducts = this.getSelectedProducts();
    const filteredProducts = selectedProducts.filter(p => p.id !== productId);
    return this.setSelectedProducts(filteredProducts);
  }

  static clearAllSelections() {
    return this.setSelectedProducts([]) && this.setCustomRooms([]);
  }

  static getSelectionCount() {
    return this.getSelectedProducts().length;
  }

  static getUserSettings() {
    return Utils.getStorageItem(config.get('storage.keys.userPreferences'), {});
  }

  static saveUserSettings(settings) {
    return Utils.setStorageItem(config.get('storage.keys.userPreferences'), settings);
  }
}
