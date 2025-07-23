// Configuration constants
export const CONFIG = {
  ROOMS: {
    PREDEFINED: [
      { name: "Bath 1", icon: "🛁" },
      { name: "Bath 2", icon: "🛁" },
      { name: "Bath 3", icon: "🛁" },
      { name: "Ensuite", icon: "🚿" },
      { name: "Powder", icon: "🚽" },
      { name: "Kitchen", icon: "🍽️" },
      { name: "Butlers", icon: "👨‍🍳" },
      { name: "Laundry", icon: "🧺" },
      { name: "Alfresco", icon: "🍽️" }
    ]
  },
  
  SCANNER: {
    DEFAULT_ENGINE: 'zxing',
    ENGINES: ['zxing', 'quagga']
  },
  
  SEARCH: {
    MAX_RESULTS: 8,
    SEARCH_FIELDS: ['Description', 'ProductName', 'OrderCode', 'BARCODE']
  },
  
  CSV: {
    URL: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRnMqBCqB9L52W6YNgreLHJKvxOanS76CJN8ZUorBl8Iccha6MzUpDkGa0N8GSYFPP2zyql1Tq6aBn8/pub?gid=0&single=true&output=csv'
  },
  
  STORAGE_KEYS: {
    CUSTOM_ROOMS: 'customRooms',
    SELECTED_PRODUCTS: 'selectedProducts',
    PRODUCT_CATALOG: 'productCatalog',
    USER_PREFERENCES: 'userPreferences',
    ROOM_ASSIGNMENTS: 'roomAssignments'
  },
  
  UI: {
    ANNOTATION_MAX_LENGTH: 140,
    QUANTITY_OPTIONS: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
  },
  
  // CSV import configuration
  CSV_CONFIG: {
    MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
    ACCEPTED_TYPES: ['.csv', '.xlsx'],
    REQUIRED_COLUMNS: ['OrderCode'],
    OPTIONAL_COLUMNS: ['Description', 'RRP_INCGST', 'Image_URL', 'Room', 'Quantity', 'Notes']
  },
  
  // Product catalog API configuration
  CATALOG_URL: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRnMqBCqB9L52W6YNgreLHJKvxOanS76CJN8ZUorBl8Iccha6MzUpDkGa0N8GSYFPP2zyql1Tq6aBn8/pub?gid=0&single=true&output=csv',
  
  // Version information
  VERSION: '1.3.0',
  
  // Performance settings
  PERFORMANCE: {
    MAX_PRODUCTS_PER_SESSION: 1000,
    IMAGE_CACHE_SIZE: 100,
    SCANNER_TIMEOUT: 30000,
    BARCODE_SCAN_INTERVAL: 100
  },

  // EmailJS Configuration
  // Note: These are your actual EmailJS credentials - configured and ready to use
  EMAIL: {
    PUBLIC_KEY: 'MHAEjvnc_xx8DIRCA',
    SERVICE_ID: 'service_rblizfg',
    TEMPLATE_ID: 'template_8st9fhk',
    
    // Email settings
    MAX_ATTACHMENT_SIZE: 15 * 1024 * 1024, // 15MB (increased for technical PDFs)
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY: 2000, // milliseconds
    
    // BCC for record keeping
    BCC_EMAIL: 'jsegredos@gmail.com' // Company email for BCC copy
  },
  
  // Browser Compatibility Settings
  COMPATIBILITY: {
    MIN_CHROME_VERSION: 80,
    MIN_FIREFOX_VERSION: 75,
    MIN_SAFARI_VERSION: 13,
    
    // Feature requirements
    REQUIRED_FEATURES: [
      'localStorage',
      'fileReader',
      'blob',
      'createObjectURL'
    ],
    
    // Performance thresholds
    MIN_COMPATIBILITY_SCORE: 70,
    MEMORY_WARNING_THRESHOLD: 0.8, // 80% of heap limit
    
    // Samsung-specific settings
    SAMSUNG_OPTIMIZATIONS: true,
    EXTENDED_TIMEOUTS_FOR_SAMSUNG: true
  }
};

// EmailJS Template Configuration
export const EMAIL_TEMPLATE_CONFIG = {
  // Template parameters that will be sent to EmailJS
  TEMPLATE_PARAMS: {
    // User info
    to_email: '{{USER_EMAIL}}',
    to_name: '{{USER_NAME}}',
    from_name: 'Seima Scanner App',
    
    // Email content
    subject: 'Your Seima Product Selection',
    message: '{{EMAIL_MESSAGE}}',
    
    // Customer details
    customer_name: '{{CUSTOMER_NAME}}',
    customer_project: '{{CUSTOMER_PROJECT}}',
    customer_address: '{{CUSTOMER_ADDRESS}}',
    customer_telephone: '{{CUSTOMER_TELEPHONE}}',
    
    // Selection info
    total_products: '{{TOTAL_PRODUCTS}}',
    total_rooms: '{{TOTAL_ROOMS}}',
    file_info: '{{FILE_INFO}}',
    
    // Attachment
    attachment: '{{PDF_BASE64}}',
    attachment_name: '{{FILENAME}}'
  },
  
  // Email template HTML (for reference - actual template is created in EmailJS dashboard)
  HTML_TEMPLATE: `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; }
        .header { background: #2563eb; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; }
        .summary { background: #f8fafc; padding: 15px; border-radius: 6px; margin: 15px 0; }
        .footer { background: #f1f5f9; padding: 15px; text-align: center; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Seima Product Selection</h1>
      </div>
      <div class="content">
        <p>Dear {{customer_name}},</p>
        <p>Thank you for using the Seima Product Scanner. Your product selection is attached.</p>
        
        <div class="summary">
          <h3>Selection Summary</h3>
          <ul>
            <li><strong>Customer:</strong> {{customer_name}}</li>
            <li><strong>Project:</strong> {{customer_project}}</li>
            <li><strong>Address:</strong> {{customer_address}}</li>
            <li><strong>Total Products:</strong> {{total_products}}</li>
            <li><strong>Rooms:</strong> {{total_rooms}}</li>
          </ul>
        </div>
        
        <p>{{message}}</p>
        
        <p>If you have any questions, please contact us at info@seima.com.au</p>
      </div>
      <div class="footer">
        <p>© 2024 Seima. Visit us at www.seima.com.au</p>
      </div>
    </body>
    </html>
  `
}; 