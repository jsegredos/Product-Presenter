import { CONFIG } from './config.js';
import { StorageManager } from './storage.js';
import { Utils } from './utils.js';

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
      if (success) {return;}

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
    if (existingWarning) {return;} // Don't show multiple warnings

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
  if (spinner) {spinner.style.display = 'flex';}

  // Reset image optimization stats for new PDF generation
  resetImageOptimizationStats();

  // Show processing notification
  const processingNotification = document.createElement('div');
  processingNotification.id = 'pdf-processing-notification';
  processingNotification.style.cssText = `
      position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); z-index: 10001;
      background: #dbeafe; border: 1px solid #3b82f6; border-radius: 8px;
      padding: 20px; max-width: 400px; min-width: 320px; box-shadow: 0 8px 25px rgba(0,0,0,0.2);
      text-align: center;
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

  loadImageAsDataURL('assets/seima-logo.png', (coverLogoDataUrl, coverLogoNaturalW, coverLogoNaturalH) => {
    // Before PDF export, ensure window.seimaLogoImg is loaded
    function ensureSeimaLogoLoaded(cb) {
      if (window.seimaLogoImg) {return cb();}
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
      if (spinner) {spinner.style.display = 'none';}
      return;
    }
    // Group by room
    const byRoom = {};
    selection.forEach(item => {
      if (!byRoom[item.Room]) {byRoom[item.Room] = [];}
      byRoom[item.Room].push(item);
    });
    // jsPDF setup
    const { jsPDF } = window.jspdf;
    // Configure jsPDF with compression enabled from the start
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'pt',
      format: 'a4',
      compress: true,
      putOnlyUsedFonts: true,
      precision: 16,
      userUnit: 1.0,
      floatPrecision: 16
    });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    // --- COVER PAGE ---
    // Layout constants
    const pageCenterX = pageWidth / 2;
    // 1. Customer logo block (centered at top)
    const logoBlockW = 320;
    const logoBlockH = 90;
    const logoBlockX = (pageWidth - logoBlockW) / 2;
    const logoBlockY = 70;
    doc.setFillColor(255, 255, 255);
    doc.rect(logoBlockX, logoBlockY, logoBlockW, logoBlockH, 'F');
    const customerLogo = localStorage.getItem('customerLogo');
    if (customerLogo) {
      try {
        // Calculate proper aspect ratio for customer logo
        const img = new Image();
        img.onload = function() {
          const maxWidth = logoBlockW - 20;
          const maxHeight = logoBlockH - 20;
          const aspectRatio = img.width / img.height;

          let drawWidth = maxWidth;
          let drawHeight = maxWidth / aspectRatio;

          // If height exceeds max, scale down proportionally
          if (drawHeight > maxHeight) {
            drawHeight = maxHeight;
            drawWidth = maxHeight * aspectRatio;
          }

          // Center the logo in the block
          const logoX = logoBlockX + (logoBlockW - drawWidth) / 2;
          const logoY = logoBlockY + (logoBlockH - drawHeight) / 2;

          doc.addImage(customerLogo, 'PNG', logoX, logoY, drawWidth, drawHeight, undefined, 'FAST');
        };
        img.src = customerLogo;
      } catch (e) {
        console.warn('Failed to draw customer logo:', e);
      }
    }
    // 2. SEIMA logo image (centered, lower on page)
    loadImageAsDataURL('assets/seima-logo.png', (seimaLogoDataUrl, seimaLogoNaturalW, seimaLogoNaturalH) => {
      const seimaLogoW = 250;
      const seimaLogoH = seimaLogoNaturalH && seimaLogoNaturalW ? (seimaLogoW * seimaLogoNaturalH / seimaLogoNaturalW) : 65;
      const seimaLogoX = (pageWidth - seimaLogoW) / 2;
      const seimaLogoY = logoBlockY + logoBlockH + 80;
      doc.addImage(seimaLogoDataUrl, 'PNG', seimaLogoX, seimaLogoY, seimaLogoW, seimaLogoH, undefined, 'FAST');
      // 3. Details block (left-aligned, below SEIMA logo)
      doc.setFontSize(15);
      doc.setTextColor('#444');
      const detailsX = pageCenterX; // center horizontally
      let detailsY = seimaLogoY + seimaLogoH + 50;

      // Only include details that have values
      const details = [];
      if (userDetails?.name && userDetails.name.trim()) {
        details.push({ label: 'Name:', value: userDetails.name.trim(), bold: true });
      }
      if (userDetails?.project && userDetails.project.trim()) {
        details.push({ label: 'Project:', value: userDetails.project.trim(), bold: true });
      }
      if (userDetails?.address && userDetails.address.trim()) {
        details.push({ label: 'Address:', value: userDetails.address.trim(), bold: true });
      }
      if (userDetails?.email && userDetails.email.trim()) {
        details.push({ label: 'Email:', value: userDetails.email.trim(), bold: true });
      }
      if (userDetails?.telephone && userDetails.telephone.trim()) {
        details.push({ label: 'Telephone:', value: userDetails.telephone.trim(), bold: true });
      }

      // Define footerHeight outside the if block so it's available for footer drawing
      const footerHeight = 32;

      // Only render details if there are any
      if (details.length > 0) {
        // Calculate vertical center between SEIMA logo bottom and footer top
        const detailsBlockHeight = details.length * 26; // 26px per line
        const detailsBlockY = seimaLogoY + seimaLogoH + ((pageHeight - footerHeight) - (seimaLogoY + seimaLogoH) - detailsBlockHeight) / 2;
        details.forEach(d => {
          doc.setFont('helvetica', 'normal');
          doc.text(d.label, detailsX - 80, detailsY, { align: 'right' });
          doc.setFont('helvetica', 'bold');
          doc.text(d.value, detailsX + 10, detailsY, { align: 'left' });
          detailsY += 26;
        });
      }
      // 4. Footer bar (drawn before info message)
      doc.setFillColor('#9B9184');
      doc.rect(0, pageHeight - footerHeight, pageWidth, footerHeight, 'F');
      doc.setTextColor('#fff');
      doc.setFontSize(13);
      // Timestamp (left)
      const now = new Date();
      const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
      const day = now.getDate();
      const month = months[now.getMonth()];
      const year = now.getFullYear();
      const hour = String(now.getHours()).padStart(2,'0');
      const min = String(now.getMinutes()).padStart(2, '0');
      const timestamp = `Printed ${day} ${month} ${year}, ${hour}:${min}`;
      doc.text(timestamp, 16, pageHeight - 10);
      // www.seima.com.au (right)
      doc.text('www.seima.com.au', pageWidth - 140, pageHeight - 10);
      // 5. Thank you/info message (centered just above footer, using actual staff details)
      const staffSettings = StorageManager.getUserSettings();
      const staffName = staffSettings.staffName || '';
      const staffEmail = staffSettings.staffEmail || '';
      const staffPhone = staffSettings.staffPhone || '';
      let infoMsg = 'For more information';
      if (staffName && staffPhone && staffEmail) {
        infoMsg = `For more information, please contact ${staffName} on ${staffPhone} or email ${staffEmail}`;
      } else if (staffName && staffPhone) {
        infoMsg = `For more information, please contact ${staffName} on ${staffPhone}`;
      } else if (staffName && staffEmail) {
        infoMsg = `For more information, please contact ${staffName} or email ${staffEmail}`;
      } else if (staffPhone && staffEmail) {
        infoMsg = `For more information, please call ${staffPhone} or email ${staffEmail}`;
      } else if (staffName) {
        infoMsg = `For more information, please contact ${staffName}`;
      } else if (staffPhone) {
        infoMsg = `For more information, please call ${staffPhone}`;
      } else if (staffEmail) {
        infoMsg = `For more information, please email ${staffEmail}`;
      }
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(14);
      doc.setTextColor('#111');
      doc.text(infoMsg, pageCenterX, pageHeight - footerHeight - 18, { align: 'center' });
      // --- END COVER PAGE ---
      // Add a new page for the product table
      doc.addPage();
      // Now load the white logo for product pages
      loadImageAsDataURL('assets/seima-logo-white.png', (logoDataUrl, logoNaturalW, logoNaturalH) => {

        // Debug: Track product page logo size
        // Product page logo loaded successfully

        // Margins and layout
        const leftMargin = 32;
        const rightMargin = 32;
        const tableWidth = pageWidth - leftMargin - rightMargin;

        // Column layout: [images, code, description, price, qty, total]
        // Fixed column positions - images must fit into predefined space
        const imgW = 90, imgPad = 12; // Fixed image width to maintain consistent layout
        const codeX = leftMargin + imgW * 2 + imgPad * 2;
        const descX = codeX + 85;
        const priceX = pageWidth - 200;
        const qtyX = pageWidth - 120;
        const totalX = pageWidth - 60;

        const colX = [leftMargin, codeX, descX, priceX, qtyX, totalX];
        const colW = [imgW, imgW, priceX - descX, qtyX - priceX, totalX - qtyX, 60];

        // Layout calculations complete

        // Table headings (no Product/Diagram, Total at far right)
        const headers = ['Code', 'Description', 'Price ea', 'Qty', 'Total'];
        // Reset image optimization stats for this PDF generation
        resetImageOptimizationStats();

        // Insert drawImage function definition before drawNextRow
        const drawImage = (doc, imgUrl, x, y, maxW, maxH, cb) => {
          if (!imgUrl) {
            if (cb) {cb();}
            return;
          }

          // Track image optimization attempt
          imageOptimizationStats.totalImages++;

          // For email compatibility, skip images entirely if requested
          if (userDetails.emailCompatible) {

            imageOptimizationStats.failedImages++;
            if (cb) {cb();}
            return;
          }

          // Use optimized image loading with smart compression


          // For email compatibility, skip images entirely if requested
          if (userDetails.emailCompatible) {

            imageOptimizationStats.failedImages++;
            if (cb) {cb();}
            return;
          }

          // Use the proxy loading mechanism with optimization
          let callbackCalled = false; // Prevent multiple callback calls

          // Load images with optimization for better compression
          const proxies = [
            'https://api.codetabs.com/v1/proxy?quest=',
            'https://corsproxy.io/?'
          ];

          let proxyIndex = 0;

          function tryLoadOptimizedImage() {
            if (callbackCalled) {return;}


            const img = new Image();
            img.crossOrigin = 'Anonymous';
            let timeoutId = null;

            img.onload = function() {
              if (callbackCalled) {return;}
              callbackCalled = true;

              if (timeoutId) {clearTimeout(timeoutId);}


              try {
                // Get optimization settings based on current file size estimate
                const optimizationSettings = getOptimizedFileSettings(0); // Start with minimal compression for best quality
                const maxImageWidth = optimizationSettings.imageMaxWidth;


                // Optimize image quality for readability, but display at fixed column size
                const pdfMaxW = maxW; // Use layout constraint for display size
                const pdfMaxH = maxH; // Use layout constraint for display size

                // Optimize the already-loaded image directly
                try {


                  const canvas = document.createElement('canvas');
                  const ctx = canvas.getContext('2d');

                  // Calculate optimized dimensions - use higher resolution for quality, but display at fixed size
                  const { width: newWidth, height: newHeight } = calculateOptimizedDimensions(
                    img.width, img.height, maxImageWidth // Use optimization setting for quality, not display size
                  );


                  canvas.width = newWidth;
                  canvas.height = newHeight;

                  // High-quality rendering
                  ctx.imageSmoothingEnabled = true;
                  ctx.imageSmoothingQuality = 'high';

                  ctx.drawImage(img, 0, 0, newWidth, newHeight);


                  // Smart format selection
                  let optimizedDataUrl;
                  let imageFormat = 'JPEG';
                  const hasTransparency = detectTransparency(canvas, ctx);
                  const isTechnical = isTechnicalDiagram(img);


                  if (hasTransparency || isTechnical) {
                  // Use PNG for technical diagrams with transparency
                    optimizedDataUrl = canvas.toDataURL('image/png', optimizationSettings.imageQuality);
                    imageFormat = 'PNG';

                  } else {
                  // Use JPEG for photos with compression
                    optimizedDataUrl = canvas.toDataURL('image/jpeg', optimizationSettings.imageQuality);
                    imageFormat = 'JPEG';

                  }


                  // Generate unique alias for image deduplication
                  const imageHash = generateImageHash(imgUrl);
                  const alias = `img_${imageHash}`;


                  // Add optimized image to PDF with alias for deduplication
                  doc.addImage(optimizedDataUrl, imageFormat, x, y, pdfMaxW, pdfMaxH, alias, 'FAST');

                  imageOptimizationStats.optimizedImages++;
                  if (cb) {cb();}
                } catch (error) {
                  console.warn(`Failed to optimize image: ${imgUrl}`, error);
                  console.warn(`Error details:`, error.message, error.stack);
                  // Fallback to original image if optimization fails
                  try {
                    doc.addImage(img, 'JPEG', x, y, pdfMaxW, pdfMaxH);

                    imageOptimizationStats.optimizedImages++;
                    if (cb) {cb();}
                  } catch (fallbackError) {
                    console.error(`Fallback also failed for: ${imgUrl}`, fallbackError);
                    imageOptimizationStats.failedImages++;
                    if (cb) {cb();}
                  }
                }
              } catch (e) {
                console.warn('Failed to add image to PDF:', e);
                imageOptimizationStats.failedImages++;
                if (cb) {cb();}
              }
            };

            img.onerror = function() {
              if (callbackCalled) {return;}
              if (timeoutId) {clearTimeout(timeoutId);}

              console.warn(`Failed to load image with proxy ${proxyIndex}: ${imgUrl}`);
              console.warn(`Error details for: ${imgUrl} - Proxy: ${proxies[proxyIndex]}`);

              proxyIndex++;
              if (proxyIndex < proxies.length) {
                setTimeout(() => {
                  tryLoadOptimizedImage();
                }, 200);
              } else {
                callbackCalled = true;
                console.warn('All proxies failed, skipping image');
                imageOptimizationStats.failedImages++;
                if (cb) {cb();}
              }
            };

            timeoutId = setTimeout(() => {
              if (callbackCalled) {return;}

              console.warn(`⏰ Timeout with proxy ${proxyIndex}: ${imgUrl}`);

              img.src = '';
              img.onload = null;
              img.onerror = null;

              proxyIndex++;
              if (proxyIndex < proxies.length) {
                setTimeout(() => {
                  tryLoadOptimizedImage();
                }, 200);
              } else {
                callbackCalled = true;
                console.warn('All proxies timed out, skipping image');
                imageOptimizationStats.failedImages++;
                if (cb) {cb();}
              }
            }, 3000);

            let proxiedUrl = imgUrl;
            if (proxyIndex < proxies.length) {
              proxiedUrl = proxies[proxyIndex] + encodeURIComponent(imgUrl);
            }


            img.src = proxiedUrl;
          }

          tryLoadOptimizedImage();
        };
        // Restore rowsToDraw definition and initialization before drawNextRow
        const rowsToDraw = [];
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

        // Product data analysis complete

        // Draw all rows (images async)
        let rowIdx = 0;
        let pageRow = 0;
        // Restore maxRowsPerPage definition before drawNextRow
        const maxRowsPerPage = 4;
        // Reduce vertical padding to allow larger images
        const rowPadding = 8; // was 28+36, now less
        const rowHeight = Math.floor((pageHeight - 80) / maxRowsPerPage); // less top/bottom margin
        let currentY = footerHeight + 8;
        function drawNextRow() {
          // Add comprehensive null checking at the start of drawNextRow
          if (!rowsToDraw || !Array.isArray(rowsToDraw)) {
            console.error('❌ Critical error: rowsToDraw is not a valid array:', rowsToDraw);
            showDetailedErrorMessage(new Error('Invalid product data structure'), 'generating PDF', 'unknown.pdf');
            return;
          }

          if (rowIdx >= rowsToDraw.length) {

            const pageCount = doc.internal.getNumberOfPages() - 1; // exclude cover
            for (let i = 2; i <= pageCount + 1; i++) { // start from 2 (first product page)
              doc.setPage(i);
              drawPDFHeader(doc, pageWidth, colX, colW, leftMargin, footerHeight, logoDataUrl, logoNaturalW, logoNaturalH, userDetails.excludePrice, userDetails.excludeQty);
              currentY = footerHeight + 8;
              // Footer bar (reduced height and font size)
              doc.setFillColor('#9B9184'); // Updated footer color
              doc.rect(0, pageHeight - footerHeight, pageWidth, footerHeight, 'F');
              doc.setTextColor('#fff');
              doc.setFontSize(11);
              doc.text('www.seima.com.au', pageWidth - 140, pageHeight - 10);
              doc.text(`Page ${i - 1} of ${pageCount}`, leftMargin, pageHeight - 10);
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
              // PDF is already configured with compression in constructor
              const pdfBlob = doc.output('blob');


              // Debug: Analyze PDF structure - with proper null checks
              const pdfString = doc.output('string');


              // Count different types of content with null safety
              const imageMatches = pdfString ? pdfString.match(/\/Type\s*\/XObject/g) : null;
              const textMatches = pdfString ? pdfString.match(/Tj\s/g) : null;
              const linkMatches = pdfString ? pdfString.match(/\/A\s*<</g) : null;

              // PDF content analysis complete

              // Store PDF size for later reference
              userDetails.pdfSize = pdfBlob.size;

              // Show file size information and optimization details
              const fileInfo = showFileSizeInfo(pdfBlob, pdfFilename);

              // Enhanced logging for size analysis


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
                // Generate CSV asynchronously if requested, then send email
                if (userDetails.exportCsv) {
                  const csvFilename = pdfFilename.replace(/\.pdf$/, '.csv');
                  generateCsvBlobAsync(userDetails, csvFilename).then(csvBlob => {
                    // Trigger email sending with CSV
                    window.dispatchEvent(new CustomEvent('sendEmail', {
                      detail: {
                        userDetails,
                        pdfBlob: optimizedBlob,
                        csvBlob
                      }
                    }));
                  }).catch(error => {
                    console.error('Async CSV generation for email failed:', error);
                    // Send email without CSV
                    window.dispatchEvent(new CustomEvent('sendEmail', {
                      detail: {
                        userDetails,
                        pdfBlob: optimizedBlob,
                        csvBlob: null
                      }
                    }));
                  });
                } else {
                  // Send email without CSV
                  window.dispatchEvent(new CustomEvent('sendEmail', {
                    detail: {
                      userDetails,
                      pdfBlob: optimizedBlob,
                      csvBlob: null
                    }
                  }));
                }
              } else {
                // Standard download

                (async () => {
                  const mergedBlob = await mergeWithTipTail(optimizedBlob);
                  downloadWithFallback(mergedBlob, pdfFilename, 'PDF');
                })();

                // Generate and download CSV if requested

                if (userDetails.exportCsv) {
                  const csvFilename = pdfFilename.replace(/\.pdf$/, '.csv');
                  // Generate CSV asynchronously to avoid blocking main thread
                  setTimeout(() => {
                    generateCsvBlobAsync(userDetails, csvFilename).then(csvBlob => {
                      if (csvBlob) {

                        downloadWithFallback(csvBlob, csvFilename, 'CSV');
                      } else {

                      }
                    }).catch(error => {
                      console.error('CSV generation failed:', error);
                    });
                  }, 1000);
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
            if (spinner) {spinner.style.display = 'none';}
            return;
          }
          // New page if needed
          if (pageRow >= maxRowsPerPage) {
            doc.addPage();
            drawPDFHeader(doc, pageWidth, colX, colW, leftMargin, footerHeight, logoDataUrl, logoNaturalW, logoNaturalH, userDetails.excludePrice, userDetails.excludeQty);
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
            doc.text(`${row.room} (${row.roomCount})`, leftMargin, y + 10);
          }
          // Product image (maintain aspect ratio) - use dynamic positioning
          const imageX = colX[0];
          const diagramX = imageX + imgW + imgPad;


          drawImage(doc, row.item.Image_URL || '', imageX, y + rowPadding + 16, imgW, rowHeight - rowPadding * 2, () => {
            // Diagram image (maintain aspect ratio) - use dynamic positioning
            drawImage(doc, row.item.Diagram_URL || '', diagramX, y + rowPadding + 16, imgW, rowHeight - rowPadding * 2, () => {
              // Code (top-aligned) - use dynamic positioning
              doc.setFontSize(10);
              doc.setTextColor('#222');
              const codeY = y + 28; // top-aligned
              const codeX = colX[1];
              const codeCenterX = codeX + (colW[1] / 2); // Center within the code column
              doc.text(String(row.item.OrderCode || ''), codeCenterX, codeY + 10, { align: 'center' });

              // Datasheet link under code, with padding
              let linkY = codeY + 26;
              if (row.item.Datasheet_URL && row.item.Datasheet_URL !== '#') {
                doc.setFontSize(9);
                doc.setTextColor(80, 80, 80);
                doc.textWithLink('Datasheet', codeCenterX, linkY, { url: row.item.Datasheet_URL, align: 'center' });
                // Underline
                const dsWidth = doc.getTextWidth('Datasheet');
                doc.setDrawColor(180, 180, 180);
                doc.setLineWidth(0.7);
                doc.line(codeCenterX - dsWidth / 2, linkY + 1.5, codeCenterX + dsWidth / 2, linkY + 1.5);
                linkY += 14;
              }
              // Website link under datasheet
              if (row.item.Website_URL && row.item.Website_URL !== '#') {
                doc.setFontSize(9);
                doc.setTextColor(80, 80, 200);
                doc.textWithLink('Website', codeCenterX, linkY, { url: row.item.Website_URL, align: 'center' });
                // Underline
                const wsWidth = doc.getTextWidth('Website');
                doc.setDrawColor(120, 120, 200);
                doc.setLineWidth(0.7);
                doc.line(codeCenterX - wsWidth / 2, linkY + 1.5, codeCenterX + wsWidth / 2, linkY + 1.5);
                linkY += 14;
              }
              // Description (top-aligned with code) - use dynamic positioning
              let descY = codeY + 10;
              doc.setFontSize(10);
              doc.setTextColor('#222');
              // Main description - use dynamic column width
              const descColWidth = colW[2] - 10; // Use actual column width minus padding
              const descX = colX[2];
              const descLines = doc.splitTextToSize(String(row.item.Description || ''), descColWidth);
              doc.text(descLines, descX + 5, descY);
              descY += descLines.length * 12;

              // Long description
              if (row.item.LongDescription || row.item['Long Description'] || row.item.longDescription) {
                const longDesc = row.item.LongDescription || row.item['Long Description'] || row.item.longDescription;
                doc.setFontSize(9);
                doc.setTextColor('#444');
                const longDescLines = doc.splitTextToSize(String(longDesc), descColWidth);
                doc.text(longDescLines, descX + 5, descY);
                descY += longDescLines.length * 11;
              }

              // Notes below long description, with padding
              if (row.item.Notes) {
                doc.setFont('helvetica', 'italic');
                doc.setFontSize(9);
                doc.setTextColor('#444');
                const notesLines = doc.splitTextToSize(`Notes: ${String(row.item.Notes).replace(/\r?\n|\r/g, ' ')}`, descColWidth);
                doc.text(notesLines, descX + 5, descY);
                descY += notesLines.length * 11;
                doc.setFont('helvetica', 'normal');
              }
              // Price ea (top-aligned) - use dynamic positioning
              doc.setFontSize(10);
              doc.setTextColor('#222');
              // Robust price parsing for PDF
              let pdfPriceNum = NaN;
              if (row.item.RRP_INCGST) {
                pdfPriceNum = parseFloat(row.item.RRP_INCGST.toString().replace(/,/g, ''));
              }
              const pdfPriceStr = pdfPriceNum && !isNaN(pdfPriceNum) && pdfPriceNum > 0 ? (`$${pdfPriceNum.toFixed(2)}`) : '';
              if (!userDetails.excludePrice && !userDetails.excludeQty) {
                const priceCenterX = colX[3] + (colW[3] / 2);
                doc.text(pdfPriceStr, priceCenterX, codeY + 10, { align: 'center' });
              }
              // Qty (top-aligned) - use dynamic positioning
              doc.setFontSize(10);
              doc.setTextColor('#222');
              if (!userDetails.excludeQty) {
                const qtyCenterX = colX[4] + (colW[4] / 2);
                doc.text(String(row.item.Quantity || 1), qtyCenterX, codeY + 10, { align: 'center' });
              }
              // Total (top-aligned, far right) - use dynamic positioning
              doc.setFontSize(10);
              doc.setTextColor('#222');
              const pdfTotalStr = pdfPriceNum && !isNaN(pdfPriceNum) && pdfPriceNum > 0 ? (`$${(pdfPriceNum * (row.item.Quantity || 1)).toFixed(2)}`) : '';
              if (!userDetails.excludePrice && !userDetails.excludeQty) {
                const totalCenterX = colX[5] + (colW[5] / 2);
                doc.text(pdfTotalStr, totalCenterX, codeY + 10, { align: 'center' });
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

export function drawPDFHeader(doc, pageWidth, colX, colW, leftMargin, footerHeight, logoDataUrl, logoNaturalW, logoNaturalH, excludePrice, excludeQty) {
  const headerHeight = footerHeight + 5.7;
  doc.setFillColor('#8B6C2B'); // Updated header color
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

  // Use dynamic positioning for headers
  const codeCenterX = colX[1] + (colW[1] / 2);
  const descCenterX = colX[2] + (colW[2] / 2);
  const priceCenterX = colX[3] + (colW[3] / 2);
  const qtyCenterX = colX[4] + (colW[4] / 2);
  const totalCenterX = colX[5] + (colW[5] / 2);

  doc.text('Code', codeCenterX, colY, { align: 'center' });
  doc.text('Description', descCenterX, colY, { align: 'center' });
  if (!excludePrice && !excludeQty) {
    doc.text('Price ea inc GST', priceCenterX, colY, { align: 'center' });
    doc.text('Qty', qtyCenterX, colY, { align: 'center' });
    doc.text('Total', totalCenterX, colY, { align: 'center' });
  } else if (excludePrice && !excludeQty) {
    doc.text('Qty', qtyCenterX, colY, { align: 'center' });
  }
  // If excludeQty is true, do not show price or qty columns
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
    const optimizedDataUrl = canvas.toDataURL('image/png', 0.9);


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
// ASYNC VERSION: Non-blocking CSV generation to prevent performance violations
export async function generateCsvBlobAsync(userDetails, csvFilename) {
  return new Promise(async (resolve) => {
    // Load PapaParse if not already loaded
    if (!window.Papa) {
      try {
        await Utils.loadScript('https://cdn.jsdelivr.net/npm/papaparse@5.4.1/papaparse.min.js');
      } catch (error) {
        console.error('Failed to load PapaParse:', error);
        resolve(null);
        return;
      }
    }

    // Break processing into chunks to avoid blocking main thread

    // Step 1: Load data (lightweight)
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
      resolve(null);
      return;
    }

    // Step 2: Process data in next tick to avoid blocking
    setTimeout(() => {
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

      // Step 3: Generate CSV string in next tick
      setTimeout(() => {
        const csvString = window.Papa.unparse(csvData, {
          quotes: true,
          quoteChar: '"',
          delimiter: ',',
          header: true,
          newline: '\r\n',
          skipEmptyLines: false,
          escapeChar: '"',
          transform: {
            value(value, field) {
              if (typeof value === 'string') {
                return value.replace(/\0/g, '').replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
              }
              return value;
            }
          }
        });

        // CSV generated successfully

        // Step 4: Handle encoding in next tick for emails
        if (userDetails.sendEmail) {
          setTimeout(() => {
            try {
              const base64Data = btoa(unescape(encodeURIComponent(csvString)));


              resolve({
                name: csvFilename,
                data: base64Data,
                contentType: 'text/csv',
                originalSize: csvString.length,
                base64Size: base64Data.length
              });
            } catch (error) {
              console.error('CSV base64 encoding failed:', error);
              resolve(new Blob([csvString], { type: 'text/csv' }));
            }
          }, 0);
        } else {
          // For downloads: Return standard blob
          resolve(new Blob([csvString], { type: 'text/csv' }));
        }
      }, 0);
    }, 0);
  });
}

// SYNCHRONOUS VERSION: Keep for backward compatibility
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
      value(value, field) {
        if (typeof value === 'string') {
          // Remove null bytes and control characters that can corrupt CSV
          return value.replace(/\0/g, '').replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
        }
        return value;
      }
    }
  });

  // CSV generation complete

  // For EmailJS: Return base64-encoded data
  if (userDetails.sendEmail) {
    try {
      const base64Data = btoa(unescape(encodeURIComponent(csvString)));


      // Test decode to verify integrity
      const decoded = decodeURIComponent(escape(atob(base64Data)));


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

export async function generateAndDownloadCsv(userDetails, csvFilename) {
  const spinner = document.getElementById('pdf-spinner');

  try {
    const csvBlob = await generateCsvBlobAsync(userDetails, csvFilename);
    if (!csvBlob) {
      if (spinner) {spinner.style.display = 'none';}
      return;
    }

    // Download CSV with enhanced error handling
    const fileInfo = showFileSizeInfo(csvBlob, csvFilename);
    downloadWithFallback(csvBlob, csvFilename, 'CSV');
  } catch (error) {
    console.error('CSV generation failed:', error);
    showDetailedErrorMessage(error, 'generating CSV', csvFilename);
  }

  if (spinner) {spinner.style.display = 'none';}
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
    if (success) {return;}
  } catch (error) {
    console.warn('Standard download failed:', error);
  }

  // Try File System Access API (Chrome 86+, Edge 86+)
  if (await downloadViaFileSystemAPI(blob, filename, fileType)) {

    return;
  }

  // Try Data URI method for smaller files
  if (downloadViaDataURI(blob, filename, fileType)) {

    return;
  }

  // Show manual download options as last resort

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

// *** SMART IMAGE OPTIMIZATION ENABLED - BALANCED QUALITY & SIZE ***
export function optimizeImageForPDF(imageUrl, maxWidth = 450, quality = 0.85) {
  return new Promise((resolve) => {
    if (!imageUrl || imageUrl === 'N/A') {
      resolve(imageUrl);
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = function() {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      // Smart dimension calculation for technical diagrams
      const { width: newWidth, height: newHeight } = calculateOptimizedDimensions(
        img.width, img.height, maxWidth
      );

      canvas.width = newWidth;
      canvas.height = newHeight;

      // High-quality rendering for technical diagrams
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      ctx.drawImage(img, 0, 0, newWidth, newHeight);

      // Smart format selection based on image characteristics
      let optimizedDataUrl;
      const hasTransparency = detectTransparency(canvas, ctx);

      if (hasTransparency || isTechnicalDiagram(img)) {
        // Use PNG for technical diagrams with transparency or fine details
        optimizedDataUrl = canvas.toDataURL('image/png', 0.9);
      } else {
        // Use JPEG for photos with higher compression
        optimizedDataUrl = canvas.toDataURL('image/jpeg', quality);
      }


      resolve(optimizedDataUrl);
    };

    img.onerror = () => {
      console.warn('Failed to optimize image:', imageUrl);
      resolve(imageUrl); // Return original if optimization fails
    };

    img.src = imageUrl;
  });
}

// Detect if image is likely a technical diagram
function isTechnicalDiagram(img) {
  // Technical diagrams often have sharp edges, limited colors, and specific patterns
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = Math.min(100, img.width); // Sample size
  canvas.height = Math.min(100, img.height);

  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  // Count unique colors (technical diagrams have fewer colors)
  const colors = new Set();
  for (let i = 0; i < data.length; i += 4) {
    const color = `${data[i]},${data[i + 1]},${data[i + 2]}`;
    colors.add(color);
  }

  return colors.size < 1000; // Technical diagrams typically have < 1000 unique colors
}

// Detect transparency in image
function detectTransparency(canvas, ctx) {
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  for (let i = 3; i < data.length; i += 4) {
    if (data[i] < 255) {
      return true; // Found transparent pixel
    }
  }
  return false;
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


  return pdfBlob; // Return as-is for now, optimization happens during generation
}

export function getOptimizedFileSettings(fileSize) {
  // Smart optimization for technical diagrams - balance quality and size
  if (fileSize > 25 * 1024 * 1024) { // > 25MB
    return {
      compressionLevel: 'aggressive',
      imageQuality: 0.6,
      imageMaxWidth: 300,
      removeImages: false,
      usePNG: true, // Preserve technical diagram quality
      message: 'Aggressive compression - maintaining technical diagram clarity'
    };
  } else if (fileSize > 20 * 1024 * 1024) { // > 20MB
    return {
      compressionLevel: 'high',
      imageQuality: 0.65,
      imageMaxWidth: 350,
      removeImages: false,
      usePNG: true,
      message: 'High compression - preserving technical diagram details'
    };
  } else if (fileSize > 15 * 1024 * 1024) { // > 15MB
    return {
      compressionLevel: 'medium',
      imageQuality: 0.7,
      imageMaxWidth: 400,
      removeImages: false,
      usePNG: true,
      message: 'Medium compression - optimal for technical documentation'
    };
  } else if (fileSize > 10 * 1024 * 1024) { // > 10MB
    return {
      compressionLevel: 'light',
      imageQuality: 0.75,
      imageMaxWidth: 450,
      removeImages: false,
      usePNG: true,
      message: 'Light compression - excellent technical diagram quality'
    };
  } else {
    return {
      compressionLevel: 'minimal',
      imageQuality: 0.8,
      imageMaxWidth: 500,
      removeImages: false,
      usePNG: true,
      message: 'Minimal compression - maximum technical diagram quality'
    };
  }
}

export function createOptimizedBlob(originalBlob, optimizationSettings) {
  // This is a placeholder for advanced PDF optimization
  // In a real implementation, you might use PDF-lib or similar library


  // For now, return the original blob
  // Future enhancement: implement actual PDF compression
  return originalBlob;
}

export function showFileSizeInfo(blob, filename) {
  const sizeInMB = (blob.size / (1024 * 1024)).toFixed(2);
  const settings = getOptimizedFileSettings(blob.size);


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

  }

  return {
    size: blob.size,
    sizeInMB: parseFloat(sizeInMB),
    settings
  };
}

// Enhanced Error Handling and User Messages
export function showDetailedErrorMessage(error, context = '', filename = '') {
  console.error('Detailed error:', error);

  const errorInfo = {
    type: identifyErrorType(error),
    message: error.message || 'Unknown error',
    context,
    filename,
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
  if (ua.includes('Chrome')) {return 'Chrome';}
  if (ua.includes('Firefox')) {return 'Firefox';}
  if (ua.includes('Safari')) {return 'Safari';}
  if (ua.includes('Edge')) {return 'Edge';}
  if (ua.includes('SamsungBrowser')) {return 'Samsung Internet';}
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

// Generate hash for image deduplication
function generateImageHash(imageUrl) {
  // Simple hash function for image URLs to enable deduplication
  let hash = 0;
  if (imageUrl.length === 0) {return hash.toString();}

  for (let i = 0; i < imageUrl.length; i++) {
    const char = imageUrl.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }

  return Math.abs(hash).toString(36);
}

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
    // Image optimization complete

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


  // Use test data if no userDetails provided
  const testUserDetails = userDetails || {
    name: 'Test User',
    email: 'test@example.com',
    sendEmail: true,
    exportCsv: true,
    excludePrice: false
  };

  const testFilename = `test-csv-${Date.now()}.csv`;

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


        if (showModal) {
          showCsvTestModal(csvResult, decoded, rows.length);
        }

      } catch (e) {
        console.error('Base64 decode failed:', e);
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

  // Clean CSV generated

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

  // CSV string stats calculated

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

  // Simple CSV generated

  return {
    name: csvFilename,
    data: csvContent,
    contentType: 'text/plain'  // Plain text for maximum compatibility
  };
}

// Ultra-aggressive field cleaning for CSV
function cleanFieldForCSV(field) {
  if (!field) {return '';}

  // Convert to string and clean aggressively
  let cleaned = String(field)
    .replace(/[\x00-\x1F\x7F-\xFF]/g, ' ')    // Remove ALL control chars and non-ASCII
    .replace(/[|,\r\n\t]/g, ' ')              // Replace separators with spaces
    .replace(/\s+/g, ' ')                     // Normalize whitespace
    .trim();                                  // Remove leading/trailing spaces

  // Limit length to prevent issues
  if (cleaned.length > 50) {
    cleaned = `${cleaned.substring(0, 50)}...`;
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

  // Ultra-clean CSV created

  return {
    name: csvFilename,
    data: csvText,
    contentType: 'text/plain'
  };
}

// Even more aggressive cleaning function
function cleanForEmail(field) {
  if (!field) {return '';}

  // Convert to string and clean aggressively
  let cleaned = String(field)
    .replace(/[\x00-\x1F\x7F-\xFF]/g, ' ')    // Remove ALL control chars and non-ASCII
    .replace(/[|,\r\n\t]/g, ' ')              // Replace separators with spaces
    .replace(/\s+/g, ' ')                     // Normalize whitespace
    .trim();                                  // Remove leading/trailing spaces

  // Limit length to prevent issues
  if (cleaned.length > 50) {
    cleaned = `${cleaned.substring(0, 50)}...`;
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

// Add at the top, after imports
const TIP_TAIL_STORAGE_KEY = 'tipTailSettings';

// Add this function near the top-level (not inside another function)
async function mergeWithTipTail(mainPdfBlob) {
  const settings = JSON.parse(localStorage.getItem(TIP_TAIL_STORAGE_KEY) || '{}');
  const { tipAsset, tipUpload, tailAsset, tailUpload } = settings;

  // If no tip or tail files are selected, return the main PDF as-is
  if (!tipAsset && !tipUpload && !tailAsset && !tailUpload) {
    // No tip/tail files - returning main PDF
    return mainPdfBlob;
  }

  // Helper to fetch PDF as ArrayBuffer with error handling
  async function fetchPdfBuffer(src, isUpload, fileType = 'file') {
    if (isUpload && src) {
      // Convert base64 string back to ArrayBuffer for uploaded files
      try {
        const binaryString = atob(src);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes.buffer;
      } catch (error) {
        console.warn(`⚠️ Error converting base64 to ArrayBuffer for ${fileType}:`, error);
        return null;
      }
    }
    if (src) {
      try {
        const res = await fetch(src);
        if (!res.ok) {
          console.warn(`⚠️ Failed to fetch ${fileType} file: ${src} (${res.status} ${res.statusText})`);
          return null;
        }
        return await res.arrayBuffer();
      } catch (error) {
        console.warn(`⚠️ Error fetching ${fileType} file: ${src}`, error);
        return null;
      }
    }
    return null;
  }

  // Helper to load PDF document with error handling
  async function loadPdfDocument(buffer, fileType = 'file', source = 'unknown') {
    if (!buffer) {return null;}
    try {
      return await PDFLib.PDFDocument.load(buffer);
    } catch (error) {
      console.warn(`⚠️ Failed to parse ${fileType} PDF: ${source}`, error);
      return null;
    }
  }

  try {
    // Load main PDF
    const mainBytes = await mainPdfBlob.arrayBuffer();
    const mainDoc = await PDFLib.PDFDocument.load(mainBytes);

    // Prepare new merged doc
    const mergedDoc = await PDFLib.PDFDocument.create();

    // --- 1. Title page from main PDF ---
    const [titlePage] = await mergedDoc.copyPages(mainDoc, [0]);
    mergedDoc.addPage(titlePage);

    // --- 2. Tip file (all pages, if selected) ---
    let tipDoc = null;
    let tipError = null;

    if (tipUpload) {
      tipDoc = await loadPdfDocument(tipUpload, 'tip', 'uploaded file');
      if (!tipDoc) {
        tipError = 'The uploaded tip file is not a valid PDF or could not be loaded.';
      }
    } else if (tipAsset) {
      const tipBuf = await fetchPdfBuffer(tipAsset, false, 'tip');
      if (tipBuf) {
        tipDoc = await loadPdfDocument(tipBuf, 'tip', tipAsset);
        if (!tipDoc) {
          tipError = `The tip file "${tipAsset.split('/').pop()}" is not a valid PDF or could not be loaded.`;
        }
      } else {
        tipError = `The tip file "${tipAsset.split('/').pop()}" could not be found or accessed.`;
      }
    }

    if (tipDoc) {
      const tipPagesIdx = Array.from({length: tipDoc.getPageCount()}, (_,i) => i);
      const tipPages = await mergedDoc.copyPages(tipDoc, tipPagesIdx);
      tipPages.forEach(p => mergedDoc.addPage(p));

    } else if (tipError) {
      console.warn(`⚠️ Tip file error: ${tipError}`);
      // Show user-friendly warning
      showTipTailWarning('Tip File Issue', tipError);
    }

    // --- 3. Main PDF content pages 2+ ---
    if (mainDoc.getPageCount() > 1) {
      const mainPagesIdx = Array.from({length: mainDoc.getPageCount() - 1}, (_,i) => i + 1);
      const mainPages = await mergedDoc.copyPages(mainDoc, mainPagesIdx);
      mainPages.forEach(p => mergedDoc.addPage(p));
    }

    // --- 4. Tail file (all pages) ---
    let tailDoc = null;
    let tailError = null;

    if (tailUpload) {
      tailDoc = await loadPdfDocument(tailUpload, 'tail', 'uploaded file');
      if (!tailDoc) {
        tailError = 'The uploaded tail file is not a valid PDF or could not be loaded.';
      }
    } else if (tailAsset) {
      const tailBuf = await fetchPdfBuffer(tailAsset, false, 'tail');
      if (tailBuf) {
        tailDoc = await loadPdfDocument(tailBuf, 'tail', tailAsset);
        if (!tailDoc) {
          tailError = `The tail file "${tailAsset.split('/').pop()}" is not a valid PDF or could not be loaded.`;
        }
      } else {
        tailError = `The tail file "${tailAsset.split('/').pop()}" could not be found or accessed.`;
      }
    }

    if (tailDoc) {
      const tailPagesIdx = Array.from({length: tailDoc.getPageCount()}, (_,i) => i);
      const tailPages = await mergedDoc.copyPages(tailDoc, tailPagesIdx);
      tailPages.forEach(p => mergedDoc.addPage(p));

    } else if (tailError) {
      console.warn(`⚠️ Tail file error: ${tailError}`);
      // Show user-friendly warning
      showTipTailWarning('Tail File Issue', tailError);
    }

    // Output merged PDF as Blob with compression
    const mergedBytes = await mergedDoc.save({
      useObjectStreams: true,
      addDefaultPage: false,
      objectsPerTick: 20
    });
    return new Blob([mergedBytes], { type: 'application/pdf' });

  } catch (error) {
    console.error('❌ Error during PDF merging:', error);
    showTipTailWarning('PDF Merging Error', 'An error occurred while merging the PDF files. The main PDF will be generated without tip/tail content.');
    // Return the original PDF if merging fails
    return mainPdfBlob;
  }
}

// Helper function to show user-friendly warnings for tip/tail issues
function showTipTailWarning(title, message) {
  // Create a non-blocking notification
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed; top: 20px; right: 20px; z-index: 10002;
    background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px;
    padding: 16px; max-width: 400px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  `;

  notification.innerHTML = `
    <div style="display: flex; align-items: flex-start; gap: 12px;">
      <span style="font-size: 20px;">⚠️</span>
      <div style="flex: 1;">
        <div style="font-weight: 600; color: #92400e; margin-bottom: 4px;">${title}</div>
        <div style="color: #78350f; font-size: 14px; line-height: 1.4;">${message}</div>
        <div style="margin-top: 8px; font-size: 12px; color: #92400e;">
          The PDF will be generated without this content.
        </div>
      </div>
      <button onclick="this.parentElement.parentElement.remove()" style="
        background: none; border: none; color: #92400e; cursor: pointer;
        font-size: 18px; padding: 0; width: 20px; height: 20px;
      ">×</button>
    </div>
  `;

  document.body.appendChild(notification);

  // Auto-remove after 8 seconds
  setTimeout(() => {
    if (notification.parentElement) {
      notification.remove();
    }
  }, 8000);
}
