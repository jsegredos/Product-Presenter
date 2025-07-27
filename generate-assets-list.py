#!/usr/bin/env python3
"""
Build-time script to generate assets-list.json for GitHub Pages
This scans the assets folder and creates a JSON file with all PDF files
"""

import os
import json
from pathlib import Path

def generate_assets_list():
    print('🔍 Scanning assets folder for PDF files...')
    
    # Get the script directory
    script_dir = Path(__file__).parent
    assets_dir = script_dir / 'assets'
    output_file = script_dir / 'assets-list.json'
    
    try:
        # Check if assets directory exists
        if not assets_dir.exists():
            print('❌ Assets directory not found')
            return
        
        # Get all PDF files
        pdf_files = []
        for file_path in assets_dir.glob('*.pdf'):
            if file_path.is_file():
                pdf_files.append(file_path.name)
        
        # Sort files alphabetically
        pdf_files.sort()
        
        print(f'✅ Found {len(pdf_files)} PDF files:')
        for file in pdf_files:
            print(f'   📄 {file}')
        
        # Write JSON file
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(pdf_files, f, indent=2)
        
        print(f'✅ Generated assets-list.json with {len(pdf_files)} files')
        print(f'📁 Output: {output_file}')
        
    except Exception as error:
        print(f'❌ Error generating assets list: {error}')
        exit(1)

if __name__ == '__main__':
    generate_assets_list() 