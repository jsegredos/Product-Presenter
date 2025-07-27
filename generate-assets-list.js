#!/usr/bin/env node
/**
 * Build-time script to generate assets-list.json for GitHub Pages
 * This scans the assets folder and creates a JSON file with all PDF files
 */

const fs = require('fs');
const path = require('path');

function generateAssetsList() {
  console.log('🔍 Scanning assets folder for PDF files...');
  
  const assetsDir = path.join(__dirname, 'assets');
  const outputFile = path.join(__dirname, 'assets-list.json');
  
  try {
    // Check if assets directory exists
    if (!fs.existsSync(assetsDir)) {
      console.log('❌ Assets directory not found');
      return;
    }
    
    // Read all files in assets directory
    const files = fs.readdirSync(assetsDir);
    
    // Filter for PDF files
    const pdfFiles = files.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return ext === '.pdf';
    });
    
    // Sort files alphabetically
    pdfFiles.sort();
    
    console.log(`✅ Found ${pdfFiles.length} PDF files:`);
    pdfFiles.forEach(file => console.log(`   📄 ${file}`));
    
    // Write JSON file
    fs.writeFileSync(outputFile, JSON.stringify(pdfFiles, null, 2));
    
    console.log(`✅ Generated assets-list.json with ${pdfFiles.length} files`);
    console.log(`📁 Output: ${outputFile}`);
    
  } catch (error) {
    console.error('❌ Error generating assets list:', error.message);
    process.exit(1);
  }
}

// Run the script
generateAssetsList(); 