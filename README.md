# Seima Product Presenter

> Interactive product catalogue and PDF generation tool for Seima products

## 🚀 Features

- **Interactive Product Grid**: Search and select products with real-time filtering
- **PDF Generation**: Create professional presentations with custom branding
- **File Import**: Import product selections from CSV/Excel files
- **Room Management**: Organise products by rooms with predefined and custom options
- **Browser Compatibility**: Enhanced support for mobile devices and various browsers
- **Offline Capable**: Works with cached product data when internet is unavailable

## 🏗️ Architecture

### Modern ES6 Module System
- **Modular Design**: Each feature is contained in focused, reusable modules
- **Dependency Management**: Clean import/export structure with minimal circular dependencies
- **Error Handling**: Comprehensive error tracking and user feedback system
- **Configuration Management**: Centralised, typed configuration with environment support

### Key Modules

| Module | Purpose | Documentation |
|--------|---------|---------------|
| `config-manager.js` | Centralised configuration with validation | [📖 Config API](docs/config-manager.html) |
| `error-handler.js` | Error tracking and user notifications | [📖 Error API](docs/error-handler.html) |
| `data-layer.js` | Product catalogue and search functionality | [📖 Data API](docs/data-layer.html) |
| `storage.js` | LocalStorage management with error handling | [📖 Storage API](docs/storage.html) |
| `pdf-generator.js` | PDF creation and customisation | [📖 PDF API](docs/pdf-generator.html) |
| `utils.js` | Common utility functions | [📖 Utils API](docs/utils.html) |

## 🛠️ Development Setup

### Prerequisites
- **Node.js** 14+ (recommended: 18.19.0)
- **Modern Browser** with ES6 module support
- **Internet Connection** for initial product catalogue download

### Quick Start

1. **Clone and Setup**
   ```bash
   git clone <repository-url>
   cd seima-product-presenter
   npm install
   ```

2. **Development Server**
   ```bash
   # Using Node.js
   npm run dev
   
   # Or using Python
   npm run dev:py
   ```

3. **Open Browser**
   Navigate to `http://localhost:8080`

### Development Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start development server (Node.js) |
| `npm run lint` | Check code quality with ESLint |
| `npm run format` | Format code with Prettier |
| `npm run docs` | Generate API documentation |
| `npm run validate` | Run all quality checks |
| `npm run build` | Full build with validation and docs |

## 📱 Browser Compatibility

### Fully Supported
- **Chrome** 80+ (recommended)
- **Firefox** 75+
- **Safari** 13+
- **Edge** 80+

### Mobile Optimisations
- **Samsung Devices**: Enhanced download compatibility
- **iOS**: Improved touch interactions and file handling
- **Android**: Optimised performance and memory management

### Feature Detection
The application automatically detects browser capabilities and provides:
- Graceful degradation for unsupported features
- User-friendly warnings for compatibility issues
- Alternative download methods for problematic browsers

## 🎨 Configuration

### Environment Detection
The application automatically detects and configures for:
- **Development**: Enhanced logging, longer timeouts, debug mode
- **Staging**: Watermarked PDFs, moderate logging
- **Production**: Optimised performance, minimal logging

### User Preferences
Settings are automatically saved and include:
- UI preferences (theme, animations)
- Performance settings (cache size, batch sizes)
- PDF generation options (quality, format)
- Staff contact details

### API Configuration
External services are configured through the config system:
- **Product Catalogue**: Google Sheets CSV endpoint
- **Email Service**: EmailJS integration
- **Asset Management**: Automatic asset detection

## 📊 Error Handling & Monitoring

### Comprehensive Error Tracking
- **Categorised Errors**: Network, data, UI, PDF, storage, compatibility
- **User Notifications**: Toast messages and modal dialogs
- **Automatic Recovery**: Smart fallbacks and retry mechanisms
- **Debug Information**: Detailed logs for troubleshooting

### Error Categories
- `NETWORK`: API failures, connectivity issues
- `DATA`: Product catalogue problems, import errors
- `UI`: Interface errors, user interaction issues
- `PDF`: Generation failures, rendering problems
- `STORAGE`: LocalStorage failures, quota exceeded
- `COMPATIBILITY`: Browser feature detection, device-specific issues

### Logging Levels
- `DEBUG`: Detailed development information
- `INFO`: General application flow
- `WARN`: Potential issues that don't break functionality
- `ERROR`: Errors that affect user experience
- `CRITICAL`: Serious errors requiring immediate attention

## 📄 PDF Generation

### Features
- **Professional Layouts**: Multiple template options
- **Custom Branding**: Customer logos and colour schemes
- **Flexible Content**: Include/exclude prices, quantities, notes
- **Appendix Support**: Prepend/append additional PDF documents
- **Optimised Output**: Compressed images, efficient rendering

### Customisation Options
- Paper size (A4, Letter, A3)
- Orientation (Portrait, Landscape)
- Image quality and compression
- Watermarks for staging/demo versions
- Font selection and sizing

## 💾 Data Management

### Storage Strategy
- **Primary**: LocalStorage for user selections and preferences
- **Caching**: Product catalogue cached for offline access
- **Validation**: All stored data validated on read/write
- **Cleanup**: Automatic management of storage quotas

### Import/Export
- **CSV Import**: Product lists with rooms and quantities
- **Excel Support**: .xlsx file processing
- **Data Validation**: Comprehensive checking of imported data
- **Error Reporting**: Detailed feedback on import issues

## 🔧 Debugging & Troubleshooting

### Developer Console
The application exposes several global objects for debugging:
```javascript
// Configuration management
window.config.get('ui.theme')
window.config.set('logging.logLevel', 'debug')

// Error tracking
window.errorHandler.getErrorStats()
window.errorHandler.exportLogs()

// Browser compatibility
window.browserCompatibility.getCompatibilityReport()
```

### Common Issues

**Product Catalogue Not Loading**
- Check internet connection
- Verify Google Sheets URL in config
- Clear browser cache and reload

**PDF Generation Fails**
- Check browser compatibility (Chrome recommended)
- Reduce image quality in settings
- Try with fewer products selected

**Storage Quota Exceeded**
- Clear application data in browser settings
- Reduce product selection size
- Check available storage space

## 🔄 Version Management

### Automatic Updates
- Version information displayed in UI
- Automatic cache invalidation on version changes
- Graceful handling of configuration migrations

### Release Process
```bash
# Patch version (bug fixes)
npm run version:patch

# Minor version (new features)
npm run version:minor

# Major version (breaking changes)
npm run version:major
```

## 📋 Testing

### Quality Assurance
- **Linting**: ESLint with custom rules for quality
- **Formatting**: Prettier for consistent code style
- **Documentation**: JSDoc for comprehensive API docs
- **Validation**: Automated checks in build process

### Browser Testing
Test the application across supported browsers:
1. Chrome (primary development browser)
2. Firefox (standards compliance)
3. Safari (WebKit engine, iOS compatibility)
4. Edge (Windows integration)
5. Samsung Internet (Android optimisation)

## 🤝 Contributing

### Code Style
- **ES6 Modules**: Use import/export syntax
- **Documentation**: JSDoc comments for all public APIs
- **Error Handling**: Comprehensive try/catch with proper logging
- **Configuration**: Use config system instead of hardcoded values

### Pull Request Process
1. Run `npm run validate` to ensure code quality
2. Update documentation for new features
3. Test across multiple browsers
4. Include error handling for new functionality
5. Update version.txt if needed

## 📜 License

MIT License - see LICENSE file for details

## 🆘 Support

- **Documentation**: [API Docs](docs/index.html)
- **Issues**: Create GitHub issue with error logs
- **Email**: jsegredos@gmail.com

---

*Built with ❤️ by the Seima Development Team*
