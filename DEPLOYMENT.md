# Deployment Guide

## 🚀 Quick Deployment Checklist

### Pre-Deployment
- [ ] Run `npm run validate` - ensure code quality
- [ ] Test in multiple browsers (Chrome, Firefox, Safari, Edge)
- [ ] Verify mobile compatibility (iOS Safari, Samsung Internet)
- [ ] Check PDF generation with various product selections
- [ ] Test file import functionality
- [ ] Verify email integration works

### Version Updates
```bash
# Update version number
npm run version:patch  # or minor/major

# Update version.txt file
echo "1.8.2 - Bug fixes and improved error handling" > version.txt

# Generate documentation
npm run docs
```

### Configuration Review
- [ ] Verify Google Sheets URL is accessible
- [ ] Check EmailJS configuration (service ID, template ID, public key)
- [ ] Confirm asset file paths are correct
- [ ] Review browser compatibility settings

### Performance Checklist
- [ ] Product catalogue loads within 3 seconds
- [ ] PDF generation completes within 10 seconds for typical selections
- [ ] UI remains responsive during operations
- [ ] Memory usage stays below 100MB for typical use

## 🌐 Server Deployment

### Static Hosting (Recommended)
The application is designed as a static web app and can be deployed to:

- **Vercel**: `vercel --prod`
- **Netlify**: Drag and drop build folder
- **GitHub Pages**: Push to gh-pages branch
- **AWS S3**: Upload files with public read access
- **Azure Static Web Apps**: Connect to repository

### Server Requirements
- **HTTPS**: Required for camera access and service workers
- **CORS Headers**: Configured for external image loading
- **MIME Types**: Proper JS module support (`application/javascript`)
- **Compression**: Enable gzip for better performance

### Example Nginx Configuration
```nginx
server {
    listen 443 ssl;
    server_name your-domain.com;
    
    root /var/www/seima-product-presenter;
    index index.html;
    
    # Enable compression
    gzip on;
    gzip_types text/css application/javascript text/javascript;
    
    # Proper MIME types for modules
    location ~* \.js$ {
        add_header Content-Type application/javascript;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # CORS for external images
    location / {
        add_header Access-Control-Allow-Origin *;
        try_files $uri $uri/ /index.html;
    }
    
    # API proxying (if needed)
    location /api/ {
        proxy_pass https://docs.google.com/;
        proxy_ssl_server_name on;
    }
}
```

## 🔧 Environment Configuration

### Development
```javascript
// Automatically detected when localhost
{
  debug: true,
  logLevel: 'debug',
  enableConsoleLogging: true,
  apiTimeout: 60000
}
```

### Staging
```javascript
{
  debug: true,
  logLevel: 'info',
  pdfWatermark: true,  // Adds "STAGING" watermark
  apiTimeout: 30000
}
```

### Production
```javascript
{
  debug: false,
  logLevel: 'warn',
  enableConsoleLogging: false,
  apiTimeout: 30000
}
```

## 📊 Monitoring & Analytics

### Error Tracking
The application includes comprehensive error tracking:

```javascript
// View error statistics
window.errorHandler.getErrorStats()

// Export error logs
window.errorHandler.exportLogs()

// Monitor compatibility issues
window.browserCompatibility.getCompatibilityReport()
```

### Performance Monitoring
Key metrics to monitor:
- **Load Time**: Application ready in < 3 seconds
- **Memory Usage**: < 100MB for typical usage
- **Error Rate**: < 1% of user sessions
- **Compatibility Score**: > 90% across target browsers

### User Analytics
Consider adding analytics for:
- Most searched products
- Popular room assignments
- PDF generation frequency
- File import usage
- Browser/device breakdown

## 🔐 Security Considerations

### Content Security Policy
```html
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  script-src 'self' 'unsafe-inline' cdn.jsdelivr.net;
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https:;
  connect-src 'self' docs.google.com api.emailjs.com;
  font-src 'self' data:;
">
```

### Data Privacy
- All user data stored locally (localStorage)
- No sensitive information transmitted to servers
- Product catalogue cached locally for offline use
- PDF generation happens client-side

### API Security
- Google Sheets published as CSV (read-only)
- EmailJS public key is safe to expose
- No authentication tokens or sensitive keys in client code

## 🚨 Troubleshooting

### Common Deployment Issues

**Module Loading Errors**
```
Error: Failed to resolve module specifier
```
- Ensure server serves .js files with correct MIME type
- Check all import paths are relative and include .js extension
- Verify no circular dependencies exist

**CORS Issues**
```
Access to fetch at '...' has been blocked by CORS policy
```
- Configure server to send proper CORS headers
- Use proxy for external API calls if needed
- Check Google Sheets CSV URL is publicly accessible

**Performance Issues**
- Enable compression (gzip/brotli)
- Set proper cache headers for static assets
- Consider CDN for better global performance
- Monitor memory usage on mobile devices

### Browser-Specific Issues

**Safari iOS**
- Test PDF download functionality
- Verify localStorage persistence
- Check touch event handling

**Samsung Internet**
- Test enhanced download compatibility
- Verify extended timeout handling
- Check device-specific optimisations

**Firefox**
- Test ES6 module loading
- Verify async/await compatibility
- Check PDF generation performance

## 🔄 Updates & Maintenance

### Regular Maintenance
- **Weekly**: Check Google Sheets connectivity
- **Monthly**: Review error logs and user feedback
- **Quarterly**: Update dependencies and browser compatibility

### Version Release Process
1. Test new features thoroughly
2. Update version number and changelog
3. Generate new documentation
4. Deploy to staging environment
5. Perform user acceptance testing
6. Deploy to production
7. Monitor for issues

### Rollback Procedure
If issues occur after deployment:
1. Immediately revert to previous version
2. Investigate issue using error logs
3. Apply fix in development environment
4. Re-test and re-deploy

## 📈 Performance Optimization

### Bundle Optimization
```bash
# Minify JavaScript (if needed)
npx terser js/*.js --compress --mangle --output dist/

# Optimize images
npx imagemin assets/*.png --out-dir=dist/assets/

# Generate service worker for caching
npx workbox-build
```

### Cache Strategy
- **Product Catalogue**: Cache with automatic refresh
- **Static Assets**: Long-term caching with versioning
- **User Data**: Store in localStorage with backup
- **API Responses**: Cache with appropriate TTL

### Mobile Optimization
- Lazy load non-critical modules
- Optimize images for different screen densities
- Use virtual scrolling for large product lists
- Implement progressive loading for PDF generation

---

*For deployment support, contact: jsegredos@gmail.com*
