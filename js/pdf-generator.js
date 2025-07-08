import { CONFIG } from './config.js';

// Samsung Browser Compatibility Utilities
export function isSamsungBrowser() {
  const userAgent = navigator.userAgent;
  return /SamsungBrowser/i.test(userAgent) || /Samsung/i.test(userAgent);
}

export function isSamsungDevice() {
  const userAgent = navigator.userAgent;
  return /SM-|SCH-|SPH-|SGH-|GT-|Galaxy/i.test(userAgent) || /SamsungBrowser/i.test(userAgent);
}

function showSamsungDownloadHelp(blob, filename, fileType = 'PDF') {
  const modal = document.createElement('div');
  modal.style.cssText = `
    position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
    background: rgba(0,0,0,0.7); z-index: 10000; display: flex; 
    align-items: center; justify-content: center; padding: 20px;
  `;
  
  const content = document.createElement('div');
  content.style.cssText = `
    background: white; border-radius: 8px; padding: 24px; max-width: 500px; 
    width: 100%; max-height: 80vh; overflow-y: auto;
  `;
  
  content.innerHTML = `
    <h3 style="color: #dc2626; margin: 0 0 16px 0; display: flex; align-items: center;">
      <span style="margin-right: 8px;">⚠️</span>
      Samsung Device Download Issue
    </h3>
    <p style="margin: 0 0 16px 0; color: #374151;">
      Your Samsung device may have difficulty downloading ${fileType} files. Here's how to fix it:
    </p>
    <ol style="margin: 0 0 20px 0; padding-left: 20px; color: #374151;">
      <li style="margin-bottom: 8px;"><strong>Use Chrome Browser:</strong> Try opening this page in Chrome instead of Samsung Internet</li>
      <li style="margin-bottom: 8px;"><strong>Check Downloads:</strong> Look in your Downloads folder - the file may have saved without notification</li>
      <li style="margin-bottom: 8px;"><strong>Clear Cache:</strong> Go to Settings > Apps > Downloads > Storage > Clear Cache</li>
      <li style="margin-bottom: 8px;"><strong>Try Again:</strong> Wait 10 seconds and try the download again</li>
    </ol>
    <div style="display: flex; gap: 12px; justify-content: flex-end;">
      <button id="samsung-help-close" style="
        padding: 8px 16px; border: 1px solid #d1d5db; background: white; 
        border-radius: 4px; cursor: pointer;
      ">Close</button>
      <button id="samsung-help-retry" style="
        padding: 8px 16px; border: none; background: #2563eb; color: white; 
        border-radius: 4px; cursor: pointer;
      ">Try Download Again</button>
    </div>
  `;
  
  modal.appendChild(content);
  document.body.appendChild(modal);
  
  document.getElementById('samsung-help-close').onclick = () => {
    document.body.removeChild(modal);
  };
  
  document.getElementById('samsung-help-retry').onclick = () => {
    document.body.removeChild(modal);
    // Retry download after a delay
    setTimeout(() => {
      downloadWithFallback(blob, filename, fileType);
    }, 1000);
  };
  
  // Close on backdrop click
  modal.onclick = (e) => {
    if (e.target === modal) {
      document.body.removeChild(modal);
    }
  };
}

export async function downloadWithFallback(blob, filename, fileType = 'file') {
  // For Samsung devices, show help first if standard download fails
  if (isSamsungDevice()) {
    try {
      const success = await attemptStandardDownload(blob, filename);
      if (success) return;
      
      // Samsung-specific help
      console.warn('Download may have failed on Samsung device');
      showSamsungDownloadHelp(blob, filename, fileType);
    } catch (error) {
      console.error('Samsung download failed:', error);
      showSamsungDownloadHelp(blob, filename, fileType);
    }
  } else {
    // For non-Samsung devices, use enhanced fallbacks
    await downloadWithEnhancedFallbacks(blob, filename, fileType);
  }
}

function showBrowserCompatibilityWarning() {
  if (isSamsungDevice()) {
    const existingWarning = document.getElementById('samsung-browser-warning');
    if (existingWarning) return; // Don't show multiple warnings
    
    const warning = document.createElement('div');
    warning.id = 'samsung-browser-warning';
    warning.style.cssText = `
      position: fixed; top: 0; left: 0; right: 0; z-index: 9999;
      background: #fef3c7; border-bottom: 1px solid #f59e0b; padding: 12px;
      text-align: center; font-size: 14px; color: #92400e;
    `;
    
    warning.innerHTML = `
      <span style="margin-right: 8px;">📱</span>
      <strong>Samsung Device:</strong> For best results with PDF downloads, use Chrome browser instead of Samsung Internet.
      <button onclick="this.parentElement.remove()" style="
        margin-left: 12px; padding: 4px 8px; border: none; background: #f59e0b; 
        color: white; border-radius: 3px; cursor: pointer; font-size: 12px;
      ">Dismiss</button>
    `;
    
    document.body.insertBefore(warning, document.body.firstChild);
    
    // Auto-hide after 10 seconds
    setTimeout(() => {
      if (warning.parentElement) {
        warning.remove();
      }
    }, 10000);
  }
}

// Show compatibility warning when page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', showBrowserCompatibilityWarning);
} else {
  showBrowserCompatibilityWarning();
}

export function showPdfFormScreen(userDetails) {
  const spinner = document.getElementById('pdf-spinner');
  if (spinner) spinner.style.display = 'flex';
  
  // Reset image optimization stats for new PDF generation
  resetImageOptimizationStats();
  
      // Show processing notification
    const processingNotification = document.createElement('div');
    processingNotification.id = 'pdf-processing-notification';
    processingNotification.style.cssText = `
      position: fixed; top: 20px; right: 20px; z-index: 10001;
      background: #dbeafe; border: 1px solid #3b82f6; border-radius: 6px;
      padding: 16px; max-width: 320px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    `;
    
    const isEmailCompatible = userDetails.emailCompatible;
    
    processingNotification.innerHTML = `
      <div style="display: flex; align-items: center; margin-bottom: 8px;">
        <span style="font-size: 18px; margin-right: 8px;">${isEmailCompatible ? '📧' : '📄'}</span>
        <strong style="color: #1e40af;">Creating your product selection files</strong>
      </div>
      <p style="margin: 0; color: #1e40af; font-size: 14px;">
        ${isEmailCompatible ? 'Creating text-only PDF without images for optimal email delivery.' : 'This may take a moment.'}
      </p>
    `;
    document.body.appendChild(processingNotification);
  
  loadImageAsDataURL('assets/seima-logo.png', function(logoDataUrl, logoNaturalW, logoNaturalH) {
    // Before PDF export, ensure window.seimaLogoImg is loaded
    function ensureSeimaLogoLoaded(cb) {
      if (window.seimaLogoImg) return cb();
      const img = new window.Image();
      img.onload = function() {
        window.seimaLogoImg = img;
        cb();
      };
      img.src = 'assets/seima-logo.png';
    }
    // PDF export logic with improved layout and CORS proxy for images
    const storedSelection = JSON.parse(localStorage.getItem('selection') || '[]');
    const selectedProducts = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.SELECTED_PRODUCTS) || '[]');
    
    // Use new format if available, fallback to old format
    let selection = [];
    if (selectedProducts.length > 0) {
      // New format: convert to old format for PDF generation
      selection = selectedProducts.map(item => ({
        ...item.product,
        Room: item.room,
        Notes: item.notes,
        Quantity: item.quantity,
        Timestamp: new Date(item.timestamp).toISOString()
      }));
    } else {
      // Old format: use directly
      selection = storedSelection;
    }
    
    if (!selection.length) {
      alert('No products selected.');
      if (spinner) spinner.style.display = 'none';
      return;
    }
    // Group by room
    const byRoom = {};
    selection.forEach(item => {
      if (!byRoom[item.Room]) byRoom[item.Room] = [];
      byRoom[item.Room].push(item);
    });
    // jsPDF setup
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    // --- COVER PAGE ---
    loadImageAsDataURL('assets/seima-logo.png', function(coverLogoDataUrl, coverLogoNaturalW, coverLogoNaturalH) {
      
      // Debug: Track cover logo size
      if (coverLogoDataUrl) {
        console.log(`🔍 Debug - Cover logo size: ${(coverLogoDataUrl.length / 1024).toFixed(1)} KB (${coverLogoNaturalW}x${coverLogoNaturalH})`);
      }
      
      const coverLogoH = 60;
      const coverLogoW = coverLogoNaturalW && coverLogoNaturalH ? (coverLogoH * coverLogoNaturalW / coverLogoNaturalH) : 180;
      const coverLogoX = (pageWidth - coverLogoW) / 2;
      const coverLogoY = 64;
      if (coverLogoDataUrl) {
        doc.addImage(coverLogoDataUrl, 'PNG', coverLogoX, coverLogoY, coverLogoW, coverLogoH);
      }
      // Center details block vertically and horizontally, but align left edge with logo
      let detailsBlockY = coverLogoY + coverLogoH + 60 + 56.7; // lower by 2cm (56.7pt)
      const detailsBlockX = coverLogoX; // align with left edge of logo
      const labelX = detailsBlockX;
      const valueX = detailsBlockX + 90;
      doc.setFontSize(14);
      doc.setTextColor('#444');
      doc.setFont('helvetica', 'normal');
      let y = detailsBlockY;
      const details = [
        { label: 'Name:', value: userDetails?.name || '', bold: true },
        { label: 'Project:', value: userDetails?.project || '', bold: true },
        { label: 'Address:', value: userDetails?.address || '', bold: true },
        { label: 'Email:', value: userDetails?.email || '', bold: true },
        { label: 'Telephone:', value: userDetails?.telephone || '', bold: true },
      ];
      details.forEach(d => {
        if (d.value) {
          doc.setFont('helvetica', 'normal');
          doc.text(d.label, labelX, y);
          doc.setFont('helvetica', 'bold');
          doc.text(d.value, valueX, y);
          y += 28;
        }
      });
      // Thank you/info message at bottom above footer
      const infoMsg = 'Thank you for selecting Seima products. If you would like additional information';
      const infoMsg2 = 'please call or email your Seima representative, or email info@seima.com.au';
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(12);
      doc.setTextColor('#222');
      doc.text(infoMsg, pageWidth/2, pageHeight-60, { align: 'center' });
      doc.text(infoMsg2, pageWidth/2, pageHeight-44, { align: 'center' });
      // Footer bar with timestamp and www.seima.com.au
      const footerHeight = 28;
      doc.setFillColor('#888');
      doc.rect(0, pageHeight-footerHeight, pageWidth, footerHeight, 'F');
      doc.setTextColor('#fff');
      doc.setFontSize(11);
      // Timestamp (left)
      const now = new Date();
      const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
      const day = now.getDate();
      const month = months[now.getMonth()];
      const year = now.getFullYear();
      const hour = String(now.getHours()).padStart(2,'0');
      const min = String(now.getMinutes()).padStart(2, '0');
      const timestamp = `Printed ${day} ${month} ${year}, ${hour}:${min}`;
      doc.text(timestamp, 16, pageHeight-10);
      // www.seima.com.au (right)
      doc.text('www.seima.com.au', pageWidth-140, pageHeight-10);
      // --- END COVER PAGE ---
      // Add a new page for the product table
      doc.addPage();
      // Now load the white logo for product pages
      loadImageAsDataURL('assets/seima-logo-white.png', function(logoDataUrl, logoNaturalW, logoNaturalH) {
        
        // Debug: Track product page logo size
        if (logoDataUrl) {
          console.log(`🔍 Debug - Product page logo size: ${(logoDataUrl.length / 1024).toFixed(1)} KB (${logoNaturalW}x${logoNaturalH})`);
        }
        
        // Margins and layout
        const leftMargin = 32;
        const rightMargin = 32;
        const tableWidth = pageWidth - leftMargin - rightMargin;
        // Column layout: [images, code, description, price, qty, total]
        const imgW = 90, imgPad = 12;
        const codeX = leftMargin + imgW*2 + imgPad*2;
        const descX = codeX + 60;
        const priceX = pageWidth - 200;
        const qtyX = pageWidth - 120;
        const totalX = pageWidth - 60;
        const colX = [leftMargin, codeX, descX, priceX, qtyX, totalX];
        const colW = [imgW, imgW, 60, priceX-descX, 60, 60];
        // Table headings (no Product/Diagram, Total at far right)
        const headers = ['Code', 'Description', 'Price ea', 'Qty', 'Total'];
        // Reset image optimization stats for this PDF generation
        resetImageOptimizationStats();
        
        // Insert drawImage function definition before drawNextRow
        const drawImage = (doc, imgUrl, x, y, maxW, maxH, cb) => {
          if (!imgUrl) { 
            if (cb) cb(); 
            return; 
          }
          
          // Track image optimization attempt
          imageOptimizationStats.totalImages++;
          
          // For email compatibility, skip images entirely if requested
          if (userDetails.emailCompatible) {
            console.log(`📧 Email mode: Skipping image for smaller file size: ${imgUrl}`);
            imageOptimizationStats.failedImages++;
            if (cb) cb();
            return;
          }
          
          // *** IMAGE OPTIMIZATION TEMPORARILY DISABLED FOR TESTING ***
          // Optimize the image for PDF use with reasonable quality
          // optimizeImageForPDF(imgUrl, 400, 0.7) // 400px max, 70% quality for technical detail
          //   .then(optimizedUrl => {
          //     if (!optimizedUrl || optimizedUrl === 'assets/no-image.png') { 
          //       console.log(`⏭️ Skipping failed image: ${imgUrl}`);
          //       imageOptimizationStats.failedImages++;
          //       if (cb) cb(); 
          //       return; 
          //     }
          //     
          //     // If it's a data URL (base64), use it directly
          //     if (optimizedUrl.startsWith('data:')) {
          //       try {
          //         // Check base64 size - allow reasonable sizes for technical images
          //         const base64Data = optimizedUrl.split(',')[1];
          //         const sizeInBytes = base64Data ? (base64Data.length * 0.75) : 0;
          //         const sizeInKB = Math.round(sizeInBytes / 1024);
          //         
          //         if (sizeInBytes > 1048576) { // 1MB limit per image (very generous)
          //           console.warn(`🚫 Image too large: ${sizeInKB} KB, skipping: ${imgUrl}`);
          //           imageOptimizationStats.failedImages++;
          //           if (cb) cb();
          //           return;
          //         }
          //         
          //         const img = new window.Image();
          //         img.onload = function() {
          //           try {
          //             // Use reasonable dimensions for technical diagrams
          //             const pdfMaxW = Math.min(maxW, 120); // Larger display size
          //             const pdfMaxH = Math.min(maxH, 120);
          //             doc.addImage(optimizedUrl, 'JPEG', x, y, pdfMaxW, pdfMaxH);
          //             console.log(`✅ Added technical image to PDF: ${imgUrl} (${pdfMaxW}x${pdfMaxH}, ${sizeInKB} KB)`);
          //             imageOptimizationStats.optimizedImages++;
          //           } catch (e) {
          //             console.warn('Failed to add optimized image to PDF:', e);
          //             imageOptimizationStats.failedImages++;
          //           }
          //           if (cb) cb();
          //         };
          //         img.onerror = function() {
          //           console.warn('Failed to load optimized data URL');
          //           imageOptimizationStats.failedImages++;
          //           if (cb) cb();
          //         };
          //         img.src = optimizedUrl;
          //       } catch (e) {
          //         console.warn('Failed to create image from data URL:', e);
          //         imageOptimizationStats.failedImages++;
          //         if (cb) cb();
          //       }
          //     } else {
          //       // For other URLs, skip them to avoid CORS issues
          //       console.log(`⏭️ Skipping non-data URL to reduce file size: ${imgUrl}`);
          //       imageOptimizationStats.failedImages++;
          //       if (cb) cb();
          //     }
          //   })
          //   .catch(error => {
          //     console.warn('Image optimization failed:', error);
          //     imageOptimizationStats.failedImages++;
          //     if (cb) cb();
          //   });
          
          // *** TEMPORARY: USE ORIGINAL IMAGES WITHOUT OPTIMIZATION ***
          console.log(`🔍 TEST MODE: Using original image without optimization: ${imgUrl}`);
          
          // Try to use the original image directly
          const img = new window.Image();
          img.crossOrigin = 'Anonymous';
          
          img.onload = function() {
            try {
              // Use original image dimensions (up to reasonable PDF limits)
              const pdfMaxW = Math.min(maxW, 120);
              const pdfMaxH = Math.min(maxH, 120);
              doc.addImage(img, 'JPEG', x, y, pdfMaxW, pdfMaxH);
              console.log(`✅ Added UNOPTIMIZED image to PDF: ${imgUrl} (${pdfMaxW}x${pdfMaxH})`);
              imageOptimizationStats.optimizedImages++; // Keep stats for comparison
            } catch (e) {
              console.warn('Failed to add unoptimized image to PDF:', e);
              imageOptimizationStats.failedImages++;
            }
            if (cb) cb();
          };
          
          img.onerror = function() {
            console.warn('Failed to load original image, skipping:', imgUrl);
            imageOptimizationStats.failedImages++;
            if (cb) cb();
          };
          
          img.src = imgUrl;
        };
        // Restore rowsToDraw definition and initialization before drawNextRow
        let rowsToDraw = [];
        const roomNames = Object.keys(byRoom);
        roomNames.forEach((room, rIdx) => {
          const items = byRoom[room];
          if (!items || !Array.isArray(items)) {
            console.warn('⚠️ Skipping invalid room items:', room, items);
            return;
          }
          items.forEach((item, iIdx) => {
            // Add null checking to prevent invalid items from being added
            if (!item) {
              console.warn('⚠️ Skipping null item in room:', room, 'at index:', iIdx);
              return;
            }
            rowsToDraw.push({
              item,
              room,
              rIdx,
              iIdx,
              isFirstInRoom: iIdx === 0,
              roomCount: items.length
            });
          });
        });
        
        // Debug: Track product data size
        const totalTextLength = rowsToDraw.reduce((sum, row) => {
          // Add null checking for row and row.item
          if (!row || !row.item) {
            console.warn('⚠️ Skipping null row in data analysis:', row);
            return sum;
          }
          const description = String(row.item.Description || '');
          const longDescription = String(row.item.LongDescription || '');
          const notes = String(row.item.Notes || '');
          const orderCode = String(row.item.OrderCode || '');
          return sum + description.length + longDescription.length + notes.length + orderCode.length;
        }, 0);
        
        console.log(`🔍 Debug - Product data analysis:
          - Total products: ${rowsToDraw ? rowsToDraw.length : 0}
          - Total text characters: ${totalTextLength}
          - Average text per product: ${rowsToDraw && rowsToDraw.length > 0 ? Math.round(totalTextLength / rowsToDraw.length) : 0} chars
          - Estimated text size: ${(totalTextLength / 1024).toFixed(1)} KB`);
        
        // Draw all rows (images async)
        let rowIdx = 0;
        let pageRow = 0;
        // Restore maxRowsPerPage definition before drawNextRow
        const maxRowsPerPage = 4;
        // Reduce vertical padding to allow larger images
        const rowPadding = 8; // was 28+36, now less
        const rowHeight = Math.floor((pageHeight-80) / maxRowsPerPage); // less top/bottom margin
        let currentY = footerHeight + 8;
        function drawNextRow() {
          // Add comprehensive null checking at the start of drawNextRow
          if (!rowsToDraw || !Array.isArray(rowsToDraw)) {
            console.error('❌ Critical error: rowsToDraw is not a valid array:', rowsToDraw);
            showDetailedErrorMessage(new Error('Invalid product data structure'), 'generating PDF', 'unknown.pdf');
            return;
          }
          
          if (rowIdx >= rowsToDraw.length) {
            console.log(`✅ Finished processing all ${rowsToDraw.length} products, finalizing PDF...`);
            const pageCount = doc.internal.getNumberOfPages() - 1; // exclude cover
            for (let i = 2; i <= pageCount + 1; i++) { // start from 2 (first product page)
              doc.setPage(i);
              drawPDFHeader(doc, pageWidth, colX, leftMargin, footerHeight, logoDataUrl, logoNaturalW, logoNaturalH, userDetails.excludePrice);
              currentY = footerHeight + 8;
              // Footer bar (reduced height and font size)
              doc.setFillColor('#888');
              doc.rect(0, pageHeight-footerHeight, pageWidth, footerHeight, 'F');
              doc.setTextColor('#fff');
              doc.setFontSize(11);
              doc.text('www.seima.com.au', pageWidth-140, pageHeight-10);
              doc.text('Page ' + (i-1) + ' of ' + pageCount, leftMargin, pageHeight-10);
            }
            // --- PDF FILENAME LOGIC ---
            const now = new Date();
            const dd = String(now.getDate()).padStart(2, '0');
            const mm = String(now.getMonth() + 1).padStart(2, '0');
            const yy = String(now.getFullYear()).slice(-2);
            const hh = String(now.getHours()).padStart(2, '0');
            const min = String(now.getMinutes()).padStart(2, '0');
            const projectName = userDetails.project.replace(/[^a-zA-Z0-9\s]/g, '');
            const pdfFilename = `${projectName}-${dd}${mm}${yy}.${hh}${min}.pdf`;
            
            // Remove processing notification
            const processingNotification = document.getElementById('pdf-processing-notification');
            if (processingNotification) {
              processingNotification.remove();
            }
            
            // Show image optimization summary
            showImageOptimizationSummary(userDetails.emailCompatible);
            
            // Enhanced PDF download with Samsung compatibility and optimization
            try {
              // Configure jsPDF for smaller file size
              const pdfOptions = {
                compress: true,
                precision: 2,
                userUnit: 1.0
              };
              
              // Debug: Get PDF without compression first
              const uncompressedBlob = doc.output('blob');
              console.log(`🔍 Debug - Uncompressed PDF size: ${(uncompressedBlob.size / 1024 / 1024).toFixed(2)} MB`);
              
              const pdfBlob = doc.output('blob', pdfOptions);
              console.log(`🔍 Debug - Compressed PDF size: ${(pdfBlob.size / 1024 / 1024).toFixed(2)} MB`);
              
              // Debug: Analyze PDF structure - with proper null checks
              const pdfString = doc.output('string');
              console.log(`🔍 Debug - PDF string length: ${pdfString ? pdfString.length : 0} characters`);
              
              // Count different types of content with null safety
              const imageMatches = pdfString ? pdfString.match(/\/Type\s*\/XObject/g) : null;
              const textMatches = pdfString ? pdfString.match(/Tj\s/g) : null;
              const linkMatches = pdfString ? pdfString.match(/\/A\s*<</g) : null;
              
              // Enhanced debugging for PDF size investigation
              console.log(`🔍 Debug - Content analysis:
                - Images in PDF: ${imageMatches ? imageMatches.length : 0}
                - Text elements: ${textMatches ? textMatches.length : 0}
                - Links in PDF: ${linkMatches ? linkMatches.length : 0}
                - PDF pages: ${doc.internal.getNumberOfPages()}
                - Logo data size: ${logoDataUrl ? (logoDataUrl.length / 1024).toFixed(1) + 'KB' : 'N/A'}
                - PDF string size: ${pdfString ? (pdfString.length / 1024 / 1024).toFixed(2) : 0}MB`);
              
              // Check for large embedded images with null safety
              const base64Images = pdfString ? pdfString.match(/\/Filter\s*\/DCTDecode[\s\S]*?stream[\s\S]*?endstream/g) : null;
              if (base64Images && base64Images.length > 0) {
                console.log(`🔍 Debug - Found ${base64Images.length} embedded images`);
                base64Images.forEach((img, idx) => {
                  console.log(`  Image ${idx}: ${img ? (img.length / 1024).toFixed(1) : 0}KB`);
                });
              }
              
              // Store PDF size for later reference
              userDetails.pdfSize = pdfBlob.size;
              
              // Show file size information and optimization details
              const fileInfo = showFileSizeInfo(pdfBlob, pdfFilename);
              
              // Enhanced logging for size analysis
              console.log(`📊 PDF Analysis:
                - Final size: ${(pdfBlob.size / 1024 / 1024).toFixed(2)} MB
                - Products included: ${rowsToDraw ? rowsToDraw.length : 0}
                - Images included: ${imageOptimizationStats.optimizedImages} (technical quality)
                - Images skipped: ${imageOptimizationStats.failedImages}
                - Email compatible mode: ${userDetails.emailCompatible || false}`);
              
              // Check if file is too large for email and offer regeneration
              if (userDetails.sendEmail && pdfBlob.size > 15 * 1024 * 1024) {
                console.warn(`❌ PDF too large for email (${(pdfBlob.size / 1024 / 1024).toFixed(1)}MB), offering email-compatible version`);
                showEmailCompatibleOption(userDetails, pdfFilename);
                return;
              }
              
              // Apply optimization if needed
              const optimizedBlob = createOptimizedBlob(pdfBlob, fileInfo.settings);
              
              // Check if user wants to email the PDF
              if (userDetails.sendEmail && userDetails.email) {
                // Generate CSV if requested
                let csvBlob = null;
                if (userDetails.exportCsv) {
                  const csvFilename = pdfFilename.replace(/\.pdf$/, '.csv');
                  csvBlob = generateCsvBlob(userDetails, csvFilename);
                }
                
                // Trigger email sending
                window.dispatchEvent(new CustomEvent('sendEmail', {
                  detail: {
                    userDetails: userDetails,
                    pdfBlob: optimizedBlob,
                    csvBlob: csvBlob
                  }
                }));
              } else {
                // Standard download
                downloadWithFallback(optimizedBlob, pdfFilename, 'PDF');
                
                // Generate and download CSV if requested
                if (userDetails.exportCsv) {
                  const csvFilename = pdfFilename.replace(/\.pdf$/, '.csv');
                  const csvBlob = generateCsvBlob(userDetails, csvFilename);
                  if (csvBlob) {
                    // Small delay to ensure PDF download starts first
                    setTimeout(() => {
                      downloadWithFallback(csvBlob, csvFilename, 'CSV');
                    }, 1000);
                  }
                }
              }
            } catch (error) {
              console.error('PDF generation failed:', error);
              showDetailedErrorMessage(error, 'generating PDF', pdfFilename);
              
              // Remove processing notification on error
              const processingNotification = document.getElementById('pdf-processing-notification');
              if (processingNotification) {
                processingNotification.remove();
              }
            }
            // --- CSV EXPORT LOGIC ---
            // CSV is now supported for both email attachments and direct downloads
            if (spinner) spinner.style.display = 'none';
            return;
          }
          // New page if needed
          if (pageRow >= maxRowsPerPage) {
            doc.addPage();
            drawPDFHeader(doc, pageWidth, colX, leftMargin, footerHeight, logoDataUrl, logoNaturalW, logoNaturalH, userDetails.excludePrice);
            currentY = footerHeight + 8;
            pageRow = 0;
          }
          const row = rowsToDraw[rowIdx];
          
          // Critical fix: Skip null or invalid rows
          if (!row || !row.item) {
            console.warn(`⚠️  Skipping invalid row at index ${rowIdx}:`, row);
            rowIdx++;
            drawNextRow();
            return;
          }
          
          // Calculate y for this row
          const y = currentY + (rowHeight * pageRow);
          // Room header (always above first product in each room, on every page)
          if (row.isFirstInRoom) {
            doc.setFontSize(9);
            doc.setTextColor('#888');
            doc.text(row.room + ' (' + row.roomCount + ')', leftMargin, y+10);
          }
          // Product image (maintain aspect ratio)
          drawImage(doc, row.item.Image_URL || '', colX[0], y+rowPadding+16, imgW, rowHeight-rowPadding*2, function() {
            // Diagram image (maintain aspect ratio)
            drawImage(doc, row.item.Diagram_URL || '', colX[0]+imgW+imgPad, y+rowPadding+16, imgW, rowHeight-rowPadding*2, function() {
              // Code (top-aligned)
              doc.setFontSize(10);
              doc.setTextColor('#222');
              const codeY = y+28; // top-aligned
              doc.text(String(row.item.OrderCode || ''), Number(colX[1])+30, codeY+10, { align: 'center' });
              // Datasheet link under code, with padding
              let linkY = codeY+26;
              if (row.item.Datasheet_URL && row.item.Datasheet_URL !== '#') {
                doc.setFontSize(9);
                doc.setTextColor(80, 80, 80);
                doc.textWithLink('Datasheet', Number(colX[1])+30, linkY, { url: row.item.Datasheet_URL, align: 'center' });
                // Underline
                const dsWidth = doc.getTextWidth('Datasheet');
                doc.setDrawColor(180, 180, 180);
                doc.setLineWidth(0.7);
                doc.line(Number(colX[1])+30-dsWidth/2, linkY+1.5, Number(colX[1])+30+dsWidth/2, linkY+1.5);
                linkY += 14;
              }
              // Website link under datasheet
              if (row.item.Website_URL && row.item.Website_URL !== '#') {
                doc.setFontSize(9);
                doc.setTextColor(80, 80, 200);
                doc.textWithLink('Website', Number(colX[1])+30, linkY, { url: row.item.Website_URL, align: 'center' });
                // Underline
                const wsWidth = doc.getTextWidth('Website');
                doc.setDrawColor(120, 120, 200);
                doc.setLineWidth(0.7);
                doc.line(Number(colX[1])+30-wsWidth/2, linkY+1.5, Number(colX[1])+30+wsWidth/2, linkY+1.5);
                linkY += 14;
              }
              // Description (top-aligned with code)
              let descY = codeY+10;
              doc.setFontSize(10);
              doc.setTextColor('#222');
              // Main description
              const descColWidth = priceX - descX - 10;
              let descLines = doc.splitTextToSize(String(row.item.Description || ''), descColWidth);
              doc.text(descLines, Number(colX[2])+5, descY);
              descY += descLines.length * 12;
              
              // Long description
              if (row.item.LongDescription) {
                doc.setFontSize(9);
                doc.setTextColor('#444');
                let longDescLines = doc.splitTextToSize(String(row.item.LongDescription), descColWidth);
                doc.text(longDescLines, Number(colX[2])+5, descY);
                descY += longDescLines.length * 11;
              }
              
              // Notes below long description, with padding
              if (row.item.Notes) {
                doc.setFont('helvetica', 'italic');
                doc.setFontSize(9);
                doc.setTextColor('#444');
                let notesLines = doc.splitTextToSize('Notes: ' + String(row.item.Notes).replace(/\r?\n|\r/g, ' '), descColWidth);
                doc.text(notesLines, Number(colX[2])+5, descY);
                descY += notesLines.length * 11;
                doc.setFont('helvetica', 'normal');
              }
              // Price ea (top-aligned)
              doc.setFontSize(10);
              doc.setTextColor('#222');
              // Robust price parsing for PDF
              let pdfPriceNum = NaN;
              if (row.item.RRP_INCGST) {
                pdfPriceNum = parseFloat(row.item.RRP_INCGST.toString().replace(/,/g, ''));
              }
              let pdfPriceStr = pdfPriceNum && !isNaN(pdfPriceNum) && pdfPriceNum > 0 ? ('$' + pdfPriceNum.toFixed(2)) : '';
              if (!userDetails.excludePrice) {
                doc.text(pdfPriceStr, Number(colX[3])+30, codeY+10, { align: 'center' });
              }
              // Qty (top-aligned)
              doc.setFontSize(10);
              doc.setTextColor('#222');
              doc.text(String(row.item.Quantity || 1), Number(colX[4])+20, codeY+10, { align: 'center' });
              // Total (top-aligned, far right)
              doc.setFontSize(10);
              doc.setTextColor('#222');
              let pdfTotalStr = pdfPriceNum && !isNaN(pdfPriceNum) && pdfPriceNum > 0 ? ('$' + (pdfPriceNum * (row.item.Quantity || 1)).toFixed(2)) : '';
              if (!userDetails.excludePrice) {
                doc.text(pdfTotalStr, Number(colX[5])+20, codeY+10, { align: 'center' });
              }
              rowIdx++;
              pageRow++;
              drawNextRow();
            });
          });
        }
        drawNextRow();
      });
    });
  });
}

export function drawPDFHeader(doc, pageWidth, colX, leftMargin, footerHeight, logoDataUrl, logoNaturalW, logoNaturalH, excludePrice) {
  const headerHeight = footerHeight + 5.7;
  doc.setFillColor('#222');
  doc.rect(0, 0, pageWidth, headerHeight, 'F');
  if (logoDataUrl && logoNaturalW && logoNaturalH) {
    const logoH = headerHeight * 0.55;
    const logoAspect = logoNaturalW / logoNaturalH;
    let logoW = logoH * logoAspect;
    if (logoW > 80) { logoW = 80; }
    const logoY = (headerHeight - logoH) / 2;
    doc.addImage(logoDataUrl, 'PNG', leftMargin, logoY, logoW, logoH);
  }
  doc.setFontSize(10);
  doc.setTextColor('#f4f4f4');
  doc.setFont('helvetica', 'normal');
  const colY = headerHeight - 8;
  doc.text('Code', colX[1]+30, colY, { align: 'center' });
  doc.text('Description', colX[2]+(colX[3]-colX[2])/2, colY, { align: 'center' });
  if (!excludePrice) {
    doc.text('Price ea inc GST', colX[3]+30, colY, { align: 'center' });
    doc.text('Qty', colX[4]+20, colY, { align: 'center' });
    doc.text('Total', colX[5]+20, colY, { align: 'center' });
  } else {
    doc.text('Qty', colX[4]+20, colY, { align: 'center' });
  }
}

// Helper to load an image as a base64 data URL
export function loadImageAsDataURL(src, cb) {
  const img = new window.Image();
  img.crossOrigin = 'Anonymous';
  img.onload = function() {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // Optimize logo size for PDF usage
    const maxWidth = 400;
    const maxHeight = 150;
    
    let newWidth = img.width;
    let newHeight = img.height;
    
    // Scale down if too large
    if (newWidth > maxWidth || newHeight > maxHeight) {
      const widthRatio = maxWidth / newWidth;
      const heightRatio = maxHeight / newHeight;
      const scale = Math.min(widthRatio, heightRatio);
      
      newWidth = Math.round(newWidth * scale);
      newHeight = Math.round(newHeight * scale);
    }
    
    canvas.width = newWidth;
    canvas.height = newHeight;
    
    // Enable smoothing for better quality
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    
    ctx.drawImage(img, 0, 0, newWidth, newHeight);
    
    // Use PNG to preserve transparency (logos need transparent backgrounds)
    const optimizedDataUrl = canvas.toDataURL('image/png');
    
    console.log(`🖼️  Logo optimized: ${img.width}x${img.height} -> ${newWidth}x${newHeight} (${(optimizedDataUrl.length / 1024).toFixed(1)}KB)`);
    
    cb(optimizedDataUrl, newWidth, newHeight);
  };
  img.src = src;
}

export function ensurePdfSpinner() {
  if (!document.getElementById('pdf-spinner')) {
    const spinner = document.createElement('div');
    spinner.id = 'pdf-spinner';
    spinner.style.display = 'none';
    spinner.style.position = 'fixed';
    spinner.style.top = '0';
    spinner.style.left = '0';
    spinner.style.width = '100vw';
    spinner.style.height = '100vh';
    spinner.style.zIndex = '9999';
    spinner.style.background = 'rgba(255,255,255,0.7)';
    spinner.style.alignItems = 'center';
    spinner.style.justifyContent = 'center';
    spinner.innerHTML = '<div style="border:6px solid #e0e0e0;border-top:6px solid #2563eb;border-radius:50%;width:54px;height:54px;animation:spin 1s linear infinite;"></div>';
    document.body.appendChild(spinner);
    // Add keyframes if not present
    if (!document.getElementById('pdf-spinner-style')) {
      const style = document.createElement('style');
      style.id = 'pdf-spinner-style';
      style.innerHTML = '@keyframes spin { 0% { transform: rotate(0deg);} 100% { transform: rotate(360deg);} }';
      document.head.appendChild(style);
    }
  }
}

// --- CSV GENERATION AND DOWNLOAD ---
export function generateCsvBlob(userDetails, csvFilename) {
  // Use same logic as PDF generation to handle both storage formats
  const storedSelection = JSON.parse(localStorage.getItem('selection') || '[]');
  const selectedProducts = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.SELECTED_PRODUCTS) || '[]');
  
  let selection = [];
  if (selectedProducts.length > 0) {
    // New format: convert to old format for CSV generation
    selection = selectedProducts.map(item => ({
      ...item.product,
      Room: item.room,
      Notes: item.notes,
      Quantity: item.quantity,
      Timestamp: new Date(item.timestamp).toISOString()
    }));
  } else {
    // Old format: use directly
    selection = storedSelection;
  }
  
  if (!selection.length) {
    return null;
  }
  
  // Prepare CSV data with enhanced formatting
  const csvData = selection.map(item => {
    const priceStr = (item.RRP_INCGST || '').toString().replace(/,/g, '');
    const priceNum = parseFloat(priceStr);
    const total = (!isNaN(priceNum) ? (priceNum * (item.Quantity || 1)).toFixed(2) : '');
    const excludePrice = userDetails.excludePrice;
    
    return {
      Code: sanitizeCSVField(item.OrderCode || ''),
      Description: sanitizeCSVField(item.Description || ''),
      Quantity: item.Quantity || 1,
      'Price ea inc GST': excludePrice ? '0.00' : (item.RRP_INCGST || ''),
      'Price Total inc GST': excludePrice ? '0.00' : total,
      Notes: sanitizeCSVField(item.Notes || ''),
      Room: sanitizeCSVField(item.Room || ''),
      'Image URL': sanitizeCSVField(item.Image_URL || ''),
      'Diagram URL': sanitizeCSVField(item.Diagram_URL || ''),
      'Datasheet URL': sanitizeCSVField(item.Datasheet_URL || ''),
      'Website URL': sanitizeCSVField(item.Website_URL || '')
    };
  });
  
  // Use PapaParse with EmailJS-optimized configuration
  const csvString = window.Papa.unparse(csvData, {
    quotes: true,        // Always quote fields to prevent corruption
    quoteChar: '"',      // Use double quotes
    delimiter: ',',      // Use comma delimiter
    header: true,        // Include headers
    newline: '\r\n',     // Use Windows line endings for better email compatibility
    skipEmptyLines: false,
    escapeChar: '"',     // Escape quotes with double quotes
    transform: {
      // Clean up any problematic characters
      value: function(value, field) {
        if (typeof value === 'string') {
          // Remove null bytes and control characters that can corrupt CSV
          return value.replace(/\0/g, '').replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
        }
        return value;
      }
    }
  });
  
  console.log('📊 Enhanced CSV generated:', {
    length: csvString.length,
    preview: csvString.substring(0, 200)
  });
  
  // For EmailJS: Return base64-encoded data
  if (userDetails.sendEmail) {
    try {
      const base64Data = btoa(unescape(encodeURIComponent(csvString)));
      console.log('📧 CSV converted to base64 for EmailJS (length:', base64Data.length, ')');
      
      // Test decode to verify integrity
      const decoded = decodeURIComponent(escape(atob(base64Data)));
      console.log('✅ Base64 decode test successful (first 200 chars):', decoded.substring(0, 200));
      
      return {
        name: csvFilename,
        data: base64Data,
        contentType: 'text/csv',
        originalSize: csvString.length,
        base64Size: base64Data.length
      };
    } catch (error) {
      console.error('❌ CSV base64 encoding failed:', error);
      // Fallback to blob
      return new Blob([csvString], { type: 'text/csv' });
    }
  } else {
    // For downloads: Return standard blob
    return new Blob([csvString], { type: 'text/csv' });
  }
}

// Helper function to sanitize CSV fields and prevent corruption
function sanitizeCSVField(field) {
  if (typeof field !== 'string') {
    field = String(field);
  }
  
  // Remove problematic characters and normalize line breaks
  field = field
    .replace(/\0/g, '')                    // Remove null bytes
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '') // Remove control characters
    .replace(/\r?\n|\r/g, ' ')             // Replace line breaks with spaces
    .trim();                               // Remove leading/trailing whitespace
  
  return field;
}

export function generateAndDownloadCsv(userDetails, csvFilename) {
  const spinner = document.getElementById('pdf-spinner');
  
  const csvBlob = generateCsvBlob(userDetails, csvFilename);
  if (!csvBlob) {
    if (spinner) spinner.style.display = 'none';
    return;
  }
  // Download CSV with enhanced error handling
  try {
    const fileInfo = showFileSizeInfo(csvBlob, csvFilename);
    downloadWithFallback(csvBlob, csvFilename, 'CSV');
  } catch (error) {
    console.error('CSV generation failed:', error);
    showDetailedErrorMessage(error, 'generating CSV', csvFilename);
  }
  if (spinner) spinner.style.display = 'none';
}

// Alternative Download Methods for Enhanced Compatibility
export async function downloadViaFileSystemAPI(blob, filename, fileType = 'file') {
  try {
    // Check if File System Access API is supported
    if ('showSaveFilePicker' in window) {
      const fileHandle = await window.showSaveFilePicker({
        suggestedName: filename,
        types: [{
          description: `${fileType} files`,
          accept: {
            [blob.type]: [`.${filename.split('.').pop()}`]
          }
        }]
      });
      
      const writableStream = await fileHandle.createWritable();
      await writableStream.write(blob);
      await writableStream.close();
      
      return true; // Success
    }
  } catch (error) {
    console.warn('File System Access API failed:', error);
  }
  return false; // Failed or not supported
}

export function downloadViaDataURI(blob, filename, fileType = 'file') {
  try {
    // Check file size limit for data URI (usually ~2MB for most browsers)
    if (blob.size > 2 * 1024 * 1024) {
      console.warn('File too large for data URI method');
      return false;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
      try {
        const link = document.createElement('a');
        link.href = e.target.result;
        link.download = filename;
        link.style.display = 'none';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (error) {
        console.error('Data URI download failed:', error);
      }
    };
    reader.readAsDataURL(blob);
    return true;
  } catch (error) {
    console.warn('Data URI method failed:', error);
    return false;
  }
}

export function showManualDownloadOption(blob, filename, fileType = 'file') {
  const url = URL.createObjectURL(blob);
  
  const modal = document.createElement('div');
  modal.style.cssText = `
    position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
    background: rgba(0,0,0,0.8); z-index: 10001; display: flex; 
    align-items: center; justify-content: center; padding: 20px;
  `;
  
  const content = document.createElement('div');
  content.style.cssText = `
    background: white; border-radius: 8px; padding: 30px; max-width: 600px; 
    width: 100%; max-height: 80vh; overflow-y: auto;
  `;
  
  content.innerHTML = `
    <h3 style="color: #2563eb; margin: 0 0 20px 0; display: flex; align-items: center;">
      <span style="margin-right: 8px;">💾</span>
      Manual Download Required
    </h3>
    <p style="margin: 0 0 16px 0; color: #374151;">
      Automatic download failed. Please use one of these manual methods to save your ${fileType}:
    </p>
    
    <div style="background: #f3f4f6; padding: 16px; border-radius: 6px; margin: 16px 0;">
      <h4 style="margin: 0 0 12px 0; color: #1f2937;">Method 1: Right-click to save</h4>
      <p style="margin: 0 0 12px 0; color: #4b5563; font-size: 14px;">
        Right-click the button below and select "Save link as..." or "Download linked file":
      </p>
      <a href="${url}" download="${filename}" style="
        display: inline-block; padding: 10px 20px; background: #2563eb; color: white; 
        text-decoration: none; border-radius: 4px; font-weight: bold;
      ">📄 ${filename}</a>
    </div>
    
    <div style="background: #f3f4f6; padding: 16px; border-radius: 6px; margin: 16px 0;">
      <h4 style="margin: 0 0 12px 0; color: #1f2937;">Method 2: Copy download link</h4>
      <p style="margin: 0 0 12px 0; color: #4b5563; font-size: 14px;">
        Copy this link and paste it into a new browser tab:
      </p>
      <div style="display: flex; gap: 8px; align-items: center;">
        <input type="text" id="manual-download-url" value="${url}" readonly style="
          flex: 1; padding: 8px; border: 1px solid #d1d5db; border-radius: 4px; 
          font-family: monospace; font-size: 12px; background: white;
        ">
        <button id="copy-url-btn" style="
          padding: 8px 12px; border: none; background: #059669; color: white; 
          border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: bold;
        ">Copy</button>
      </div>
    </div>
    
    <div style="display: flex; gap: 12px; justify-content: flex-end; margin-top: 24px;">
      <button id="manual-download-close" style="
        padding: 10px 20px; border: 1px solid #d1d5db; background: white; 
        border-radius: 4px; cursor: pointer; font-weight: bold;
      ">Close</button>
      <button id="manual-download-retry" style="
        padding: 10px 20px; border: none; background: #2563eb; color: white; 
        border-radius: 4px; cursor: pointer; font-weight: bold;
      ">Try Auto Download Again</button>
    </div>
  `;
  
  modal.appendChild(content);
  document.body.appendChild(modal);
  
  // Event handlers
  document.getElementById('manual-download-close').onclick = () => {
    URL.revokeObjectURL(url);
    document.body.removeChild(modal);
  };
  
  document.getElementById('manual-download-retry').onclick = () => {
    URL.revokeObjectURL(url);
    document.body.removeChild(modal);
    setTimeout(() => {
      downloadWithEnhancedFallbacks(blob, filename, fileType);
    }, 1000);
  };
  
  document.getElementById('copy-url-btn').onclick = () => {
    const urlInput = document.getElementById('manual-download-url');
    urlInput.select();
    urlInput.setSelectionRange(0, 99999); // Mobile support
    
    try {
      navigator.clipboard.writeText(url).then(() => {
        const btn = document.getElementById('copy-url-btn');
        btn.textContent = 'Copied!';
        btn.style.background = '#059669';
        setTimeout(() => {
          btn.textContent = 'Copy';
          btn.style.background = '#059669';
        }, 2000);
      }).catch(() => {
        // Fallback for older browsers
        document.execCommand('copy');
        const btn = document.getElementById('copy-url-btn');
        btn.textContent = 'Copied!';
        setTimeout(() => btn.textContent = 'Copy', 2000);
      });
    } catch (error) {
      alert('Copy failed. Please select the URL manually and copy it.');
    }
  };
  
  // Close on backdrop click
  modal.onclick = (e) => {
    if (e.target === modal) {
      URL.revokeObjectURL(url);
      document.body.removeChild(modal);
    }
  };
  
  // Auto-cleanup after 5 minutes to prevent memory leaks
  setTimeout(() => {
    if (modal.parentElement) {
      URL.revokeObjectURL(url);
      document.body.removeChild(modal);
    }
  }, 5 * 60 * 1000);
}

export async function downloadWithEnhancedFallbacks(blob, filename, fileType = 'file') {
  // Try standard method first
  try {
    const success = await attemptStandardDownload(blob, filename);
    if (success) return;
  } catch (error) {
    console.warn('Standard download failed:', error);
  }
  
  // Try File System Access API (Chrome 86+, Edge 86+)
  if (await downloadViaFileSystemAPI(blob, filename, fileType)) {
    console.log('Downloaded via File System Access API');
    return;
  }
  
  // Try Data URI method for smaller files
  if (downloadViaDataURI(blob, filename, fileType)) {
    console.log('Downloaded via Data URI');
    return;
  }
  
  // Show manual download options as last resort
  console.log('Showing manual download options');
  showManualDownloadOption(blob, filename, fileType);
}

function attemptStandardDownload(blob, filename) {
  return new Promise((resolve) => {
    try {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.style.display = 'none';
      
      document.body.appendChild(link);
      
      // Set up timeout to detect failure
      const timeout = setTimeout(() => {
        cleanup();
        resolve(false);
      }, 3000);
      
      const cleanup = () => {
        clearTimeout(timeout);
        if (link.parentElement) {
          document.body.removeChild(link);
        }
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      };
      
      // Assume success if we get here
      link.onclick = () => {
        cleanup();
        resolve(true);
      };
      
      link.click();
      
      // For cases where onclick doesn't fire
      setTimeout(() => {
        cleanup();
        resolve(true);
      }, 500);
      
    } catch (error) {
      console.error('Standard download error:', error);
      resolve(false);
    }
  });
  }
  
  // *** IMAGE OPTIMIZATION FUNCTION TEMPORARILY DISABLED FOR TESTING ***
  /* 
  ORIGINAL FUNCTION COMMENTED OUT FOR TESTING - RESTORE BY UNCOMMENTING:
  
  export function optimizeImageForPDF(imageUrl, maxWidth = 400, quality = 0.9) {
    return new Promise((resolve) => {
      // CORS proxy services for image loading (updated for reliability)
      const proxies = [
        'https://api.codetabs.com/v1/proxy?quest=',
        'https://corsproxy.io/?',
        // Removed problematic proxies: allorigins.win (QUIC errors) and thingproxy (502 errors)
      ];
      
      let proxyIndex = 0;
      
      function tryLoadImage() {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        
        img.onload = function() {
          try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // Reasonable compression for technical images
            let width = Math.min(maxWidth, 400);  // Max 400px width for good detail
            let height = Math.min(maxWidth, 400); // Max 400px height
            
            // Maintain aspect ratio for technical accuracy
            if (img.width > img.height) {
              height = Math.round((width * img.height) / img.width);
            } else {
              width = Math.round((height * img.width) / img.height);
            }
            
            // Ensure minimum readable size for technical diagrams
            if (img.width > 100 || img.height > 100) {
              width = Math.max(width, 200);  // Minimum 200px for readability
              height = Math.max(height, 200);
            }
            
            canvas.width = width;
            canvas.height = height;
            
            // Enable smoothing for better image quality
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            
            // Draw and compress image with reasonable quality
            ctx.drawImage(img, 0, 0, width, height);
            
            // Convert with quality suitable for technical images
            const reasonableQuality = Math.max(quality, 0.6); // Minimum 60% quality for technical details
            const optimizedDataUrl = canvas.toDataURL('image/jpeg', reasonableQuality);
            
            // Check if data URL is reasonable size (under 500KB for technical images)
            const sizeInBytes = optimizedDataUrl.length * 0.75;
            if (sizeInBytes > 512000) { // ~500KB limit
              console.warn(`📊 Image large but acceptable for technical detail: ${(sizeInBytes/1024).toFixed(0)} KB - ${imageUrl}`);
              // Still use it - technical images need detail
            }
            
            console.log(`✅ Technical image optimized: ${img.width}x${img.height} -> ${width}x${height} (${Math.round(reasonableQuality*100)}% quality, ${(sizeInBytes/1024).toFixed(0)} KB)`);
            resolve(optimizedDataUrl);
            
          } catch (error) {
            console.warn('Image optimization failed:', error);
            resolve('assets/no-image.png');
          }
        };
        
        img.onerror = function() {
          console.warn(`❌ Failed to load image with proxy ${proxyIndex}: ${imageUrl}`);
          
          // Try next proxy
          proxyIndex++;
          if (proxyIndex < proxies.length) {
            setTimeout(() => {
              tryLoadImage();
            }, 200);
          } else {
            console.warn('All proxies failed, using placeholder');
            resolve('assets/no-image.png');
          }
        };
        
        // Reasonable timeout for quality images (reduced for failed proxies)
        setTimeout(() => {
          console.warn(`⏰ Timeout with proxy ${proxyIndex}: ${imageUrl}`);
          
          proxyIndex++;
          if (proxyIndex < proxies.length) {
            tryLoadImage();
          } else {
            console.warn('All proxies timed out, using placeholder');
            resolve('assets/no-image.png');
          }
        }, 3000); // 3 second timeout - faster fallback for failing proxies
        
        // Set the image source with current proxy
        let proxiedUrl = imageUrl;
        if (proxyIndex < proxies.length) {
          proxiedUrl = proxies[proxyIndex] + encodeURIComponent(imageUrl);
        }
        
        console.log(`🔄 Loading technical image ${proxyIndex}: ${proxiedUrl}`);
        img.src = proxiedUrl;
      }
      
      tryLoadImage();
    });
  }
  */
  
  // *** TEMPORARY PLACEHOLDER FUNCTION FOR TESTING ***
  export function optimizeImageForPDF(imageUrl, maxWidth = 400, quality = 0.9) {
    console.log(`🔍 TEST MODE: Optimization disabled, returning original URL: ${imageUrl}`);
    return Promise.resolve(imageUrl);
  }

function calculateOptimizedDimensions(originalWidth, originalHeight, maxWidth) {
  if (originalWidth <= maxWidth) {
    return { width: originalWidth, height: originalHeight };
  }
  
  const ratio = originalHeight / originalWidth;
  return {
    width: maxWidth,
    height: Math.round(maxWidth * ratio)
  };
}

export function compressPDFBlob(pdfBlob, compressionLevel = 'medium') {
  // PDF compression settings based on level
  const compressionSettings = {
    low: { imageQuality: 0.9, imageMaxWidth: 400 },
    medium: { imageQuality: 0.8, imageMaxWidth: 300 },
    high: { imageQuality: 0.6, imageMaxWidth: 200 }
  };
  
  const settings = compressionSettings[compressionLevel] || compressionSettings.medium;
  
  // Note: Actual PDF compression would require more advanced techniques
  // For now, we'll focus on optimizing the generation process
  console.log(`PDF compression level: ${compressionLevel}`, settings);
  
  return pdfBlob; // Return as-is for now, optimization happens during generation
}

export function getOptimizedFileSettings(fileSize) {
  // Automatically determine optimization level based on file size - updated for technical images
  if (fileSize > 20 * 1024 * 1024) { // > 20MB
    return {
      compressionLevel: 'high',
      imageQuality: 0.6,
      imageMaxWidth: 300,
      removeImages: false,
      message: 'High compression applied - file very large with technical images'
    };
  } else if (fileSize > 15 * 1024 * 1024) { // > 15MB
    return {
      compressionLevel: 'medium',
      imageQuality: 0.7,
      imageMaxWidth: 400,
      removeImages: false,
      message: 'Medium compression applied for technical image optimization'
    };
  } else if (fileSize > 10 * 1024 * 1024) { // > 10MB
    return {
      compressionLevel: 'low',
      imageQuality: 0.75,
      imageMaxWidth: 450,
      removeImages: false,
      message: 'Light compression applied to maintain technical image quality'
    };
  } else {
    return {
      compressionLevel: 'minimal',
      imageQuality: 0.8,
      imageMaxWidth: 500,
      removeImages: false,
      message: 'Minimal compression - good size for technical documentation'
    };
  }
}

export function createOptimizedBlob(originalBlob, optimizationSettings) {
  // This is a placeholder for advanced PDF optimization
  // In a real implementation, you might use PDF-lib or similar library
  console.log('Optimization settings applied:', optimizationSettings);
  
  // For now, return the original blob
  // Future enhancement: implement actual PDF compression
  return originalBlob;
}

export function showFileSizeInfo(blob, filename) {
  const sizeInMB = (blob.size / (1024 * 1024)).toFixed(2);
  const settings = getOptimizedFileSettings(blob.size);
  
  console.log(`File: ${filename}`);
  console.log(`Size: ${sizeInMB} MB`);
  console.log(`Optimization: ${settings.message}`);
  
  // Show size warning for large files
  if (blob.size > 15 * 1024 * 1024) {
    console.warn(`Large file detected (${sizeInMB} MB) - exceeds typical email limit, may need email-compatible version`);
    
    // Show user-friendly notification
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed; top: 20px; right: 20px; z-index: 10001;
      background: #fef3c7; border: 1px solid #f59e0b; border-radius: 6px;
      padding: 16px; max-width: 300px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    `;
    notification.innerHTML = `
      <div style="display: flex; align-items: center; margin-bottom: 8px;">
        <span style="font-size: 18px; margin-right: 8px;">📁</span>
        <strong style="color: #92400e;">Large Technical PDF</strong>
      </div>
      <p style="margin: 0; color: #a16207; font-size: 14px;">
        PDF is ${sizeInMB} MB with quality technical images. May exceed some email limits.
      </p>
      <button onclick="this.parentElement.remove()" style="
        margin-top: 8px; padding: 4px 8px; border: none; background: #f59e0b;
        color: white; border-radius: 3px; cursor: pointer; font-size: 12px;
      ">OK</button>
    `;
    document.body.appendChild(notification);
    
    // Auto-remove after 8 seconds
    setTimeout(() => {
      if (notification.parentElement) {
        notification.remove();
      }
    }, 8000);
  } else if (blob.size > 3 * 1024 * 1024) {
    console.log(`Medium file size (${sizeInMB} MB) - images compressed for better email compatibility`);
  }
  
  return {
    size: blob.size,
    sizeInMB: parseFloat(sizeInMB),
    settings: settings
  };
}

// Enhanced Error Handling and User Messages
export function showDetailedErrorMessage(error, context = '', filename = '') {
  console.error('Detailed error:', error);
  
  const errorInfo = {
    type: identifyErrorType(error),
    message: error.message || 'Unknown error',
    context: context,
    filename: filename,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    isSamsung: isSamsungDevice()
  };
  
  const modal = document.createElement('div');
  modal.style.cssText = `
    position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
    background: rgba(0,0,0,0.8); z-index: 10002; display: flex; 
    align-items: center; justify-content: center; padding: 20px;
  `;
  
  const content = document.createElement('div');
  content.style.cssText = `
    background: white; border-radius: 8px; padding: 30px; max-width: 700px; 
    width: 100%; max-height: 80vh; overflow-y: auto;
  `;
  
  content.innerHTML = `
    <h3 style="color: #dc2626; margin: 0 0 20px 0; display: flex; align-items: center;">
      <span style="margin-right: 8px;">⚠️</span>
      ${getErrorTitle(errorInfo.type)}
    </h3>
    
    <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 16px; margin: 16px 0;">
      <p style="margin: 0; color: #b91c1c; font-weight: bold;">
        ${getUserFriendlyMessage(errorInfo.type, context, filename)}
      </p>
    </div>
    
    ${getSolutionSteps(errorInfo.type, errorInfo.isSamsung)}
    
    <details style="margin: 20px 0; padding: 16px; background: #f9fafb; border-radius: 6px;">
      <summary style="cursor: pointer; font-weight: bold; color: #374151;">
        🔧 Technical Details (for support)
      </summary>
      <div style="margin-top: 12px; font-family: monospace; font-size: 12px; color: #6b7280;">
        <p><strong>Error Type:</strong> ${errorInfo.type}</p>
        <p><strong>Message:</strong> ${errorInfo.message}</p>
        <p><strong>Context:</strong> ${errorInfo.context}</p>
        <p><strong>File:</strong> ${errorInfo.filename}</p>
        <p><strong>Time:</strong> ${errorInfo.timestamp}</p>
        <p><strong>Samsung Device:</strong> ${errorInfo.isSamsung ? 'Yes' : 'No'}</p>
        <p><strong>Browser:</strong> ${getBrowserInfo()}</p>
      </div>
    </details>
    
    <div style="display: flex; gap: 12px; justify-content: flex-end; margin-top: 24px;">
      <button id="error-close" style="
        padding: 10px 20px; border: 1px solid #d1d5db; background: white; 
        border-radius: 4px; cursor: pointer; font-weight: bold;
      ">Close</button>
      <button id="error-retry" style="
        padding: 10px 20px; border: none; background: #2563eb; color: white; 
        border-radius: 4px; cursor: pointer; font-weight: bold;
      ">Try Again</button>
      <button id="error-report" style="
        padding: 10px 20px; border: none; background: #059669; color: white; 
        border-radius: 4px; cursor: pointer; font-weight: bold;
      ">Report Issue</button>
    </div>
  `;
  
  modal.appendChild(content);
  document.body.appendChild(modal);
  
  // Event handlers
  document.getElementById('error-close').onclick = () => {
    document.body.removeChild(modal);
  };
  
  document.getElementById('error-retry').onclick = () => {
    document.body.removeChild(modal);
    // Retry logic would be context-specific
    console.log('Retry requested for:', context);
  };
  
  document.getElementById('error-report').onclick = () => {
    copyErrorReportToClipboard(errorInfo);
    alert('Error details copied to clipboard. Please send this to support.');
  };
  
  // Close on backdrop click
  modal.onclick = (e) => {
    if (e.target === modal) {
      document.body.removeChild(modal);
    }
  };
  
  return errorInfo;
}

function identifyErrorType(error) {
  const message = error.message?.toLowerCase() || '';
  const stack = error.stack?.toLowerCase() || '';
  
  if (message.includes('network') || message.includes('fetch')) {
    return 'network';
  } else if (message.includes('permission') || message.includes('denied')) {
    return 'permission';
  } else if (message.includes('memory') || message.includes('quota')) {
    return 'memory';
  } else if (message.includes('blob') || message.includes('url')) {
    return 'download';
  } else if (message.includes('canvas') || message.includes('image')) {
    return 'rendering';
  } else if (stack.includes('jspdf') || message.includes('pdf')) {
    return 'pdf';
  } else {
    return 'unknown';
  }
}

function getErrorTitle(errorType) {
  const titles = {
    network: 'Network Connection Error',
    permission: 'Permission Required',
    memory: 'Insufficient Memory',
    download: 'Download Failed',
    rendering: 'Display Error',
    pdf: 'PDF Generation Error',
    unknown: 'Unexpected Error'
  };
  return titles[errorType] || 'Error Occurred';
}

function getUserFriendlyMessage(errorType, context, filename) {
  const messages = {
    network: `Unable to load required resources. Please check your internet connection and try again.`,
    permission: `Browser permission required to save ${filename}. Please allow downloads and try again.`,
    memory: `Not enough memory to process this large file. Try closing other browser tabs or use fewer products.`,
    download: `Failed to download ${filename}. This may be due to browser security settings or storage limitations.`,
    rendering: `Unable to display product images properly. Some images may be missing from the final output.`,
    pdf: `PDF generation failed while ${context}. The file may be too large or contain problematic data.`,
    unknown: `An unexpected error occurred while ${context}. Please try again or contact support.`
  };
  return messages[errorType] || 'An unknown error has occurred.';
}

function getSolutionSteps(errorType, isSamsung) {
  const commonSamsungNote = isSamsung ? 
    `<div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 6px; padding: 12px; margin: 12px 0;">
      <p style="margin: 0; color: #92400e; font-size: 14px;">
        📱 <strong>Samsung Device Detected:</strong> Consider switching to Chrome browser instead of Samsung Internet for better compatibility.
      </p>
    </div>` : '';
  
  const solutions = {
    network: `
      ${commonSamsungNote}
      <div style="background: #f0f9ff; border-radius: 6px; padding: 16px; margin: 16px 0;">
        <h4 style="margin: 0 0 12px 0; color: #0369a1;">🌐 Try These Steps:</h4>
        <ol style="margin: 0; color: #0c4a6e;">
          <li>Check your internet connection</li>
          <li>Refresh the page and try again</li>
          <li>Clear browser cache and cookies</li>
          <li>Try using a different browser</li>
        </ol>
      </div>`,
    
    permission: `
      ${commonSamsungNote}
      <div style="background: #f0f9ff; border-radius: 6px; padding: 16px; margin: 16px 0;">
        <h4 style="margin: 0 0 12px 0; color: #0369a1;">🔐 Enable Downloads:</h4>
        <ol style="margin: 0; color: #0c4a6e;">
          <li>Click the download icon in your browser's address bar</li>
          <li>Select "Always allow downloads from this site"</li>
          <li>Check your browser's download settings</li>
          <li>Ensure sufficient storage space is available</li>
        </ol>
      </div>`,
    
    memory: `
      ${commonSamsungNote}
      <div style="background: #f0f9ff; border-radius: 6px; padding: 16px; margin: 16px 0;">
        <h4 style="margin: 0 0 12px 0; color: #0369a1;">💾 Free Up Memory:</h4>
        <ol style="margin: 0; color: #0c4a6e;">
          <li>Close other browser tabs and applications</li>
          <li>Reduce the number of products in your selection</li>
          <li>Try generating smaller sections at a time</li>
          <li>Restart your browser if problem persists</li>
        </ol>
      </div>`,
    
    download: `
      ${commonSamsungNote}
      <div style="background: #f0f9ff; border-radius: 6px; padding: 16px; margin: 16px 0;">
        <h4 style="margin: 0 0 12px 0; color: #0369a1;">📥 Download Troubleshooting:</h4>
        <ol style="margin: 0; color: #0c4a6e;">
          <li>Check your Downloads folder</li>
          <li>Allow pop-ups for this website</li>
          <li>Try right-clicking and "Save as..."</li>
          <li>Use a different browser if issues persist</li>
        </ol>
      </div>`,
    
    rendering: `
      ${commonSamsungNote}
      <div style="background: #f0f9ff; border-radius: 6px; padding: 16px; margin: 16px 0;">
        <h4 style="margin: 0 0 12px 0; color: #0369a1;">🖼️ Image Display Issues:</h4>
        <ol style="margin: 0; color: #0c4a6e;">
          <li>Check your internet connection</li>
          <li>Refresh the page to reload images</li>
          <li>Images may take time to load on slow connections</li>
          <li>PDF will still generate with available content</li>
        </ol>
      </div>`,
    
    pdf: `
      ${commonSamsungNote}
      <div style="background: #f0f9ff; border-radius: 6px; padding: 16px; margin: 16px 0;">
        <h4 style="margin: 0 0 12px 0; color: #0369a1;">📄 PDF Generation Issues:</h4>
        <ol style="margin: 0; color: #0c4a6e;">
          <li>Try reducing the number of products</li>
          <li>Check if any product data is corrupted</li>
          <li>Clear browser cache and try again</li>
          <li>Use CSV export as an alternative</li>
        </ol>
      </div>`,
    
    unknown: `
      ${commonSamsungNote}
      <div style="background: #f0f9ff; border-radius: 6px; padding: 16px; margin: 16px 0;">
        <h4 style="margin: 0 0 12px 0; color: #0369a1;">🔧 General Troubleshooting:</h4>
        <ol style="margin: 0; color: #0c4a6e;">
          <li>Refresh the page and try again</li>
          <li>Clear browser cache and cookies</li>
          <li>Try using a different browser</li>
          <li>Contact support with the technical details above</li>
        </ol>
      </div>`
  };
  
  return solutions[errorType] || solutions.unknown;
}

function getBrowserInfo() {
  const ua = navigator.userAgent;
  if (ua.includes('Chrome')) return 'Chrome';
  if (ua.includes('Firefox')) return 'Firefox';
  if (ua.includes('Safari')) return 'Safari';
  if (ua.includes('Edge')) return 'Edge';
  if (ua.includes('SamsungBrowser')) return 'Samsung Internet';
  return 'Unknown';
}

function copyErrorReportToClipboard(errorInfo) {
  const report = `
Seima Scanner Error Report
========================
Time: ${errorInfo.timestamp}
Error Type: ${errorInfo.type}
Message: ${errorInfo.message}
Context: ${errorInfo.context}
File: ${errorInfo.filename}
Samsung Device: ${errorInfo.isSamsung}
Browser: ${getBrowserInfo()}
User Agent: ${errorInfo.userAgent}
========================
  `.trim();
  
  try {
    navigator.clipboard.writeText(report);
  } catch (error) {
    console.error('Failed to copy error report:', error);
  }
}

export function showProgressiveErrorHandler(operation, retryCount = 0) {
  const maxRetries = 3;
  
  return async function handleWithRetry(...args) {
    try {
      return await operation(...args);
    } catch (error) {
      console.error(`Operation failed (attempt ${retryCount + 1}):`, error);
      
      if (retryCount < maxRetries) {
        console.log(`Retrying... (${retryCount + 1}/${maxRetries})`);
        
        // Exponential backoff
        const delay = Math.pow(2, retryCount) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        
        return showProgressiveErrorHandler(operation, retryCount + 1)(...args);
      } else {
        // Final failure - show detailed error
        showDetailedErrorMessage(error, 'after multiple retry attempts');
        throw error;
      }
    }
  };
}

// Add image optimization status tracking
let imageOptimizationStats = {
  totalImages: 0,
  optimizedImages: 0,
  failedImages: 0,
  totalSavings: 0
};

export function resetImageOptimizationStats() {
  imageOptimizationStats = {
    totalImages: 0,
    optimizedImages: 0,
    failedImages: 0,
    totalSavings: 0
  };
}

export function getImageOptimizationStats() {
  return { ...imageOptimizationStats };
}

export function showImageOptimizationSummary(isEmailCompatible = false) {
  const stats = imageOptimizationStats;
  if (stats.totalImages > 0) {
    console.log(`🖼️ Image Optimization Summary:`);
    console.log(`   Total images: ${stats.totalImages}`);
    console.log(`   Optimized: ${stats.optimizedImages}`);
    console.log(`   Failed: ${stats.failedImages}`);
    console.log(`   Success rate: ${((stats.optimizedImages / stats.totalImages) * 100).toFixed(1)}%`);
    console.log(`   Email compatible mode: ${isEmailCompatible}`);
    
    // No UI notification - just console logging for debugging
  }
}

export function showEmailCompatibleOption(userDetails, originalFilename) {
  const modal = document.createElement('div');
  modal.style.cssText = `
    position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
    background: rgba(0,0,0,0.8); z-index: 10001; display: flex; 
    align-items: center; justify-content: center; padding: 20px;
  `;
  
  const content = document.createElement('div');
  content.style.cssText = `
    background: white; border-radius: 8px; padding: 30px; max-width: 500px; 
    width: 100%; max-height: 80vh; overflow-y: auto;
  `;
  
  content.innerHTML = `
    <h3 style="color: #2563eb; margin: 0 0 20px 0; display: flex; align-items: center;">
      <span style="margin-right: 8px;">📧</span>
      Email-Compatible Version Available
    </h3>
    <p style="margin: 0 0 16px 0; color: #374151;">
      Your PDF is large (${(userDetails.pdfSize / 1024 / 1024).toFixed(1)} MB). 
      We can create a smaller, email-friendly version with optimized images.
    </p>
    
    <div style="background: #f3f4f6; padding: 16px; border-radius: 6px; margin: 16px 0;">
      <h4 style="margin: 0 0 12px 0; color: #1f2937;">Email-Compatible Features:</h4>
      <ul style="margin: 0; padding-left: 20px; color: #4b5563; font-size: 14px;">
        <li>Reduced image quality for smaller file size</li>
        <li>Optimized for email attachment limits</li>
        <li>Faster email delivery</li>
        <li>Better compatibility across email clients</li>
      </ul>
    </div>
    
    <div style="display: flex; gap: 12px; justify-content: flex-end; margin-top: 24px;">
      <button id="email-regular-version" style="
        padding: 10px 20px; border: 1px solid #d1d5db; background: white; 
        border-radius: 4px; cursor: pointer; font-weight: bold;
      ">Send Current Version</button>
      <button id="email-optimized-version" style="
        padding: 10px 20px; border: none; background: #2563eb; color: white; 
        border-radius: 4px; cursor: pointer; font-weight: bold;
      ">Create Email Version</button>
    </div>
  `;
  
  modal.appendChild(content);
  document.body.appendChild(modal);
  
  // Event handlers
  document.getElementById('email-regular-version').onclick = () => {
    modal.remove();
    // Continue with regular email sending
    const event = new CustomEvent('sendEmailRegular', { detail: { userDetails, originalFilename } });
    window.dispatchEvent(event);
  };
  
  document.getElementById('email-optimized-version').onclick = () => {
    modal.remove();
    // Create email-optimized version
    userDetails.emailCompatible = true;
    showPdfFormScreen(userDetails);
  };
}

// Test function for CSV generation and EmailJS compatibility
export function testCsvGeneration(userDetails = null, showModal = true) {
  console.log('🧪 Testing Enhanced CSV Generation...');
  
  // Use test data if no userDetails provided
  const testUserDetails = userDetails || {
    name: 'Test User',
    email: 'test@example.com',
    sendEmail: true,
    exportCsv: true,
    excludePrice: false
  };
  
  const testFilename = 'test-csv-' + Date.now() + '.csv';
  
  try {
    // Test the enhanced CSV generation
    const csvResult = generateCsvBlob(testUserDetails, testFilename);
    
    if (!csvResult) {
      console.warn('⚠️ No CSV data generated (empty selection?)');
      return null;
    }
    
    console.log('✅ CSV Generation Test Results:', {
      format: csvResult.data ? 'Enhanced (Base64)' : 'Legacy (Blob)',
      filename: csvResult.name || 'blob',
      contentType: csvResult.contentType || csvResult.type,
      originalSize: csvResult.originalSize || csvResult.size,
      base64Size: csvResult.base64Size || 'N/A'
    });
    
    // Test base64 decoding if available
    if (csvResult.data) {
      try {
        const decoded = decodeURIComponent(escape(atob(csvResult.data)));
        console.log('📋 Base64 Decode Test - First 300 chars:');
        console.log(decoded.substring(0, 300));
        
        // Count rows
        const rows = decoded.split('\r\n').filter(row => row.trim());
        console.log(`📊 CSV contains ${rows.length} rows (including header)`);
        
        if (showModal) {
          showCsvTestModal(csvResult, decoded, rows.length);
        }
        
      } catch (e) {
        console.error('❌ Base64 decode failed:', e);
      }
    }
    
    return csvResult;
    
  } catch (error) {
    console.error('❌ CSV generation test failed:', error);
    return null;
  }
}

// Show a modal with CSV test results
function showCsvTestModal(csvResult, csvContent, rowCount) {
  const modal = document.createElement('div');
  modal.style.cssText = `
    position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
    background: rgba(0,0,0,0.8); z-index: 10001; display: flex; 
    align-items: center; justify-content: center; padding: 20px;
  `;
  
  const content = document.createElement('div');
  content.style.cssText = `
    background: white; border-radius: 8px; padding: 30px; max-width: 700px; 
    width: 100%; max-height: 80vh; overflow-y: auto;
  `;
  
  content.innerHTML = `
    <h3 style="color: #059669; margin: 0 0 20px 0; display: flex; align-items: center;">
      <span style="margin-right: 8px;">🧪</span>
      CSV Generation Test Results
    </h3>
    
    <div style="background: #ecfdf5; padding: 16px; border-radius: 6px; margin: 16px 0;">
      <h4 style="margin: 0 0 12px 0; color: #047857;">Generation Summary</h4>
      <ul style="margin: 0; padding-left: 20px; color: #065f46; font-size: 14px;">
        <li><strong>Format:</strong> Enhanced (Base64 encoded for EmailJS)</li>
        <li><strong>Filename:</strong> ${csvResult.name}</li>
        <li><strong>Rows:</strong> ${rowCount} (including header)</li>
        <li><strong>Original Size:</strong> ${(csvResult.originalSize / 1024).toFixed(2)} KB</li>
        <li><strong>Base64 Size:</strong> ${(csvResult.base64Size / 1024).toFixed(2)} KB</li>
      </ul>
    </div>
    
    <div style="background: #f3f4f6; padding: 16px; border-radius: 6px; margin: 16px 0;">
      <h4 style="margin: 0 0 12px 0; color: #1f2937;">CSV Content Preview</h4>
      <textarea readonly style="
        width: 100%; height: 200px; font-family: monospace; font-size: 11px;
        border: 1px solid #d1d5db; border-radius: 4px; padding: 8px;
        background: white; resize: vertical;
      ">${csvContent.substring(0, 1000)}${csvContent.length > 1000 ? '\n... (content truncated)' : ''}</textarea>
    </div>
    
    <div style="display: flex; gap: 12px; justify-content: flex-end; margin-top: 24px;">
      <button id="csv-test-close" style="
        padding: 10px 20px; border: 1px solid #d1d5db; background: white; 
        border-radius: 4px; cursor: pointer; font-weight: bold;
      ">Close</button>
      <button id="csv-download-test" style="
        padding: 10px 20px; border: none; background: #059669; color: white; 
        border-radius: 4px; cursor: pointer; font-weight: bold;
      ">Download Test CSV</button>
    </div>
  `;
  
  modal.appendChild(content);
  document.body.appendChild(modal);
  
  // Event handlers
  document.getElementById('csv-test-close').onclick = () => modal.remove();
  
  document.getElementById('csv-download-test').onclick = () => {
    // Create a test download
    const blob = new Blob([csvContent], { type: 'text/csv' });
    downloadWithFallback(blob, csvResult.name, 'CSV');
    modal.remove();
  };
}

// --- CSV GENERATION FOR EMAILJS (RAW STRING) ---

// Fixed CSV generation - NO base64 encoding for EmailJS
export function generateCsvForEmailJS(userDetails, csvFilename) {
  const storedSelection = JSON.parse(localStorage.getItem('selection') || '[]');
  const selectedProducts = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.SELECTED_PRODUCTS) || '[]');
  
  let selection = [];
  if (selectedProducts.length > 0) {
    selection = selectedProducts.map(item => ({
      ...item.product,
      Room: item.room,
      Notes: item.notes,
      Quantity: item.quantity,
      Timestamp: new Date(item.timestamp).toISOString()
    }));
  } else {
    selection = storedSelection;
  }
  
  if (!selection.length) {
    return null;
  }
  
  // Prepare CSV data - clean strings only
  const csvData = selection.map(item => {
    const priceStr = (item.RRP_INCGST || '').toString().replace(/,/g, '');
    const priceNum = parseFloat(priceStr);
    const total = (!isNaN(priceNum) ? (priceNum * (item.Quantity || 1)).toFixed(2) : '');
    const excludePrice = userDetails.excludePrice;
    
    return {
      Code: sanitizeCSVField(item.OrderCode || ''),
      Description: sanitizeCSVField(item.Description || ''),
      Quantity: item.Quantity || 1,
      'Price ea inc GST': excludePrice ? '0.00' : (item.RRP_INCGST || ''),
      'Price Total inc GST': excludePrice ? '0.00' : total,
      Notes: sanitizeCSVField(item.Notes || ''),
      Room: sanitizeCSVField(item.Room || ''),
      'Image URL': sanitizeCSVField(item.Image_URL || ''),
      'Diagram URL': sanitizeCSVField(item.Diagram_URL || ''),
      'Datasheet URL': sanitizeCSVField(item.Datasheet_URL || ''),
      'Website URL': sanitizeCSVField(item.Website_URL || '')
    };
  });
  
  // Generate clean CSV string - NO base64 encoding
  const csvString = generateCleanCSVString(csvData);
  
  console.log('📊 Clean CSV generated:', {
    length: csvString.length,
    preview: csvString.substring(0, 200)
  });
  
  // Return RAW string for EmailJS - let EmailJS handle encoding
  return {
    name: csvFilename,
    data: csvString,  // RAW string, NOT base64
    contentType: 'text/csv'
  };
}

// Clean string function to remove problematic characters
function cleanString(field) {
  if (typeof field !== 'string') {
    field = String(field);
  }
  
  // Remove problematic characters and normalize line breaks
  field = field
    .replace(/\0/g, '')                    // Remove null bytes
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '') // Remove control characters
    .replace(/\r?\n|\r/g, ' ')             // Replace line breaks with spaces
    .trim();                               // Remove leading/trailing whitespace
  
  return field;
}

// Generate CSV with strict ASCII compliance
function generateCleanCSVString(data) {
  if (!data || data.length === 0) {
    return '';
  }
  
  const headers = Object.keys(data[0]);
  
  // Create header row - clean headers
  const headerRow = headers.map(header => {
    const cleaned = cleanString(header);
    return `"${cleaned}"`;
  }).join(',');
  
  // Create data rows - clean all values
  const dataRows = data.map(row => {
    return headers.map(header => {
      const value = row[header];
      const cleaned = cleanString(String(value || ''));
      return `"${cleaned}"`;
    }).join(',');
  });
  
  // Use \n instead of \r\n for better compatibility
  const csvString = [headerRow, ...dataRows].join('\n');
  
  console.log('📊 CSV string stats:', {
    totalLength: csvString.length,
    headerLength: headerRow.length,
    dataRows: dataRows.length,
    hasControlChars: /[\x00-\x1F\x7F]/.test(csvString),
    hasNonAscii: /[\u0080-\uFFFF]/.test(csvString)
  });
  
  return csvString;
}

// Alternative: Use simple format without quotes if still having issues
export function generateSimpleCsvForEmailJS(userDetails, csvFilename) {
  const storedSelection = JSON.parse(localStorage.getItem('selection') || '[]');
  const selectedProducts = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.SELECTED_PRODUCTS) || '[]');
  
  let selection = [];
  if (selectedProducts.length > 0) {
    selection = selectedProducts.map(item => ({
      ...item.product,
      Room: item.room,
      Notes: item.notes,
      Quantity: item.quantity
    }));
  } else {
    selection = storedSelection;
  }
  
  if (!selection.length) {
    return null;
  }
  
  // Ultra-simple CSV format - NO NEWLINES, use pipe separator
  let csvContent = 'Code|Description|Quantity|Room|Notes ';
  
  // Data rows - NO newlines, use double space as row separator
  selection.forEach(item => {
    const code = cleanFieldForCSV(item.OrderCode || '');
    const desc = cleanFieldForCSV(item.Description || '');
    const qty = item.Quantity || 1;
    const room = cleanFieldForCSV(item.Room || '');
    const notes = cleanFieldForCSV(item.Notes || '');
    
    csvContent += `${code}|${desc}|${qty}|${room}|${notes}  `;
  });
  
  // Final cleanup - remove any remaining control characters
  csvContent = csvContent.replace(/[\x00-\x1F\x7F-\xFF]/g, ' ').replace(/\s+/g, ' ').trim();
  
  console.log('📊 Simple CSV generated:', {
    length: csvContent.length,
    preview: csvContent.substring(0, 200),
    hasControlChars: /[\x00-\x1F\x7F]/.test(csvContent),
    hasNonAscii: /[\u0080-\uFFFF]/.test(csvContent),
    dataRows: selection.length
  });
  
  return {
    name: csvFilename,
    data: csvContent,
    contentType: 'text/plain'  // Plain text for maximum compatibility
  };
}

// Ultra-aggressive field cleaning for CSV
function cleanFieldForCSV(field) {
  if (!field) return '';
  
  // Convert to string and clean aggressively
  let cleaned = String(field)
    .replace(/[\x00-\x1F\x7F-\xFF]/g, ' ')    // Remove ALL control chars and non-ASCII
    .replace(/[|,\r\n\t]/g, ' ')              // Replace separators with spaces
    .replace(/\s+/g, ' ')                     // Normalize whitespace
    .trim();                                  // Remove leading/trailing spaces
  
  // Limit length to prevent issues
  if (cleaned.length > 50) {
    cleaned = cleaned.substring(0, 50) + '...';
  }
  
  return cleaned;
}

// Test function to debug CSV encoding
export function testCsvEncoding(userDetails, csvFilename) {
  console.log('🧪 Testing CSV encoding methods...');
  
  // Test method 1: Clean CSV
  const cleanCsv = generateCsvForEmailJS(userDetails, csvFilename);
  if (cleanCsv) {
    console.log('✅ Clean CSV method:', {
      name: cleanCsv.name,
      length: cleanCsv.data.length,
      preview: cleanCsv.data.substring(0, 150),
      hasControlChars: /[\x00-\x1F\x7F]/.test(cleanCsv.data),
      hasNonAscii: /[\u0080-\uFFFF]/.test(cleanCsv.data)
    });
  }
  
  // Test method 2: Simple CSV
  const simpleCsv = generateSimpleCsvForEmailJS(userDetails, csvFilename);
  if (simpleCsv) {
    console.log('✅ Simple CSV method:', {
      name: simpleCsv.name,
      length: simpleCsv.data.length,
      preview: simpleCsv.data.substring(0, 150),
      hasControlChars: /[\x00-\x1F\x7F]/.test(simpleCsv.data),
      hasNonAscii: /[\u0080-\uFFFF]/.test(simpleCsv.data)
    });
  }
  
  return cleanCsv || simpleCsv;
}

// Test function to verify CSV generation works correctly
export function testEmailCSVGeneration() {
  console.log('🧪 Testing Email CSV Generation...');
  
  // Create test user details
  const testUserDetails = {
    name: 'Test User',
    email: 'test@example.com',
    project: 'Test Project',
    address: '123 Test Street',
    excludePrice: false
  };
  
  try {
    // Test the new email CSV generation
    const csvFilename = 'test-email-output.csv';
    const emailCsvData = generateCsvForEmailJS(testUserDetails, csvFilename);
    
    if (emailCsvData) {
      console.log('✅ Email CSV Generation Test Results:', {
        filename: emailCsvData.name,
        contentType: emailCsvData.contentType,
        dataLength: emailCsvData.data.length,
        dataType: typeof emailCsvData.data,
        hasControlChars: /[\x00-\x1F\x7F]/.test(emailCsvData.data),
        hasNonAscii: /[\u0080-\uFFFF]/.test(emailCsvData.data),
        preview: emailCsvData.data.substring(0, 300)
      });
      
      // Test the simple CSV generation too
      const simpleCsvData = generateSimpleCsvForEmailJS(testUserDetails, csvFilename);
      if (simpleCsvData) {
        console.log('✅ Simple CSV Generation Test Results:', {
          filename: simpleCsvData.name,
          contentType: simpleCsvData.contentType,
          dataLength: simpleCsvData.data.length,
          dataType: typeof simpleCsvData.data,
          hasControlChars: /[\x00-\x1F\x7F]/.test(simpleCsvData.data),
          hasNonAscii: /[\u0080-\uFFFF]/.test(simpleCsvData.data),
          preview: simpleCsvData.data.substring(0, 300)
        });
      }
      
      console.log('🎉 Email CSV generation test completed successfully!');
      console.log('📧 Ready to test email sending with clean CSV data.');
      
      return {
        success: true,
        emailCsv: emailCsvData,
        simpleCsv: simpleCsvData
      };
    } else {
      console.warn('⚠️  No CSV data generated - make sure you have products selected');
      return { success: false, error: 'No CSV data generated' };
    }
  } catch (error) {
    console.error('❌ Email CSV generation test failed:', error);
    return { success: false, error: error.message };
  }
}

// Make test function globally available for console testing
window.testEmailCSVGeneration = testEmailCSVGeneration;

// FINAL FIX: Ultra-clean CSV with zero control characters
export function generateUltraCleanCsv(userDetails, csvFilename) {
  const storedSelection = JSON.parse(localStorage.getItem('selection') || '[]');
  const selectedProducts = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.SELECTED_PRODUCTS) || '[]');
  
  let selection = [];
  if (selectedProducts.length > 0) {
    selection = selectedProducts.map(item => ({
      ...item.product,
      Room: item.room,
      Notes: item.notes,
      Quantity: item.quantity
    }));
  } else {
    selection = storedSelection;
  }
  
  if (!selection.length) {
    return null;
  }
  
  // Create CSV rows using ONLY spaces - NO control characters whatsoever
  let csvText = '';
  
  // Header (single line, no \n)
  csvText += 'Code,Description,Quantity,Room,Notes';
  
  // Data rows (append with space separator instead of \n)
  selection.forEach(item => {
    // Clean ALL strings to remove ANY control characters
    const code = cleanForEmail(item.OrderCode || '');
    const desc = cleanForEmail(item.Description || '');
    const qty = cleanForEmail(item.Quantity || 1);
    const room = cleanForEmail(item.Room || '');
    const notes = cleanForEmail(item.Notes || '');
    
    // Use pipe separator instead of newline to avoid control chars
    csvText += ` | ${code},${desc},${qty},${room},${notes}`;
  });
  
  console.log('🧹 Ultra-clean CSV created:', {
    length: csvText.length,
    preview: csvText.substring(0, 200),
    hasControlChars: /[\x00-\x1F\x7F-\x9F]/.test(csvText),
    hasNewlines: /[\r\n]/.test(csvText),
    hasNonAscii: /[^\x00-\x7F]/.test(csvText)
  });
  
  return {
    name: csvFilename,
    data: csvText,
    contentType: 'text/plain'
  };
}

// Even more aggressive cleaning function
function cleanForEmail(field) {
  if (!field) return '';
  
  // Convert to string and clean aggressively
  let cleaned = String(field)
    .replace(/[\x00-\x1F\x7F-\xFF]/g, ' ')    // Remove ALL control chars and non-ASCII
    .replace(/[|,\r\n\t]/g, ' ')              // Replace separators with spaces
    .replace(/\s+/g, ' ')                     // Normalize whitespace
    .trim();                                  // Remove leading/trailing spaces
  
  // Limit length to prevent issues
  if (cleaned.length > 50) {
    cleaned = cleaned.substring(0, 50) + '...';
  }
  
  return cleaned;
}

// Alternative: Send as JSON string instead of CSV
export function generateJsonForEmail(userDetails, filename) {
  const storedSelection = JSON.parse(localStorage.getItem('selection') || '[]');
  const selectedProducts = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.SELECTED_PRODUCTS) || '[]');
  
  let selection = [];
  if (selectedProducts.length > 0) {
    selection = selectedProducts.map(item => ({
      ...item.product,
      Room: item.room,
      Notes: item.notes,
      Quantity: item.quantity
    }));
  } else {
    selection = storedSelection;
  }
  
  if (!selection.length) {
    return null;
  }
  
  // Create clean JSON data
  const cleanData = selection.map(item => ({
    Code: cleanForEmail(item.OrderCode || ''),
    Description: cleanForEmail(item.Description || ''),
    Quantity: cleanForEmail(item.Quantity || 1),
    Room: cleanForEmail(item.Room || ''),
    Notes: cleanForEmail(item.Notes || '')
  }));
  
  // Convert to JSON string (no control characters in JSON)
  const jsonString = JSON.stringify(cleanData, null, 2);
  
  console.log('📊 JSON data created:', {
    length: jsonString.length,
    preview: jsonString.substring(0, 200),
    hasControlChars: /[\x00-\x1F\x7F-\x9F]/.test(jsonString)
  });
  
  return {
    name: filename.replace('.csv', '.json'),
    data: jsonString,
    contentType: 'application/json'
  };
}

// Simplest possible format: Space-separated values
export function generateSpaceSeparatedData(userDetails, filename) {
  const storedSelection = JSON.parse(localStorage.getItem('selection') || '[]');
  const selectedProducts = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.SELECTED_PRODUCTS) || '[]');
  
  let selection = [];
  if (selectedProducts.length > 0) {
    selection = selectedProducts.map(item => ({
      ...item.product,
      Room: item.room,
      Notes: item.notes,
      Quantity: item.quantity
    }));
  } else {
    selection = storedSelection;
  }
  
  if (!selection.length) {
    return null;
  }
  
  // Create space-separated data (absolutely no control characters)
  let dataText = 'SEIMA_PRODUCT_SELECTION ';
  
  selection.forEach((item, index) => {
    const code = cleanForEmail(item.OrderCode || '');
    const desc = cleanForEmail(item.Description || '');
    const qty = cleanForEmail(item.Quantity || 1);
    const room = cleanForEmail(item.Room || '');
    
    dataText += `ITEM${index + 1} CODE:${code} DESC:${desc} QTY:${qty} ROOM:${room} `;
  });
  
  console.log('📊 Space-separated data:', {
    length: dataText.length,
    preview: dataText.substring(0, 200),
    hasControlChars: /[\x00-\x1F\x7F-\x9F]/.test(dataText)
  });
  
  return {
    name: filename.replace('.csv', '.txt'),
    data: dataText,
    contentType: 'text/plain'
  };
}

// Alternative: Use simple format without quotes if still having issues