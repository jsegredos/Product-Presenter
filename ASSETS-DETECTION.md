# Automatic PDF Assets Detection

This application automatically detects PDF files in the `assets/` folder and makes them available in the tip/tail dropdowns.

## How It Works

### 1. Development Environment (Local Server)
- Uses the Python server (`server.py`) which provides a `/assets-list` endpoint
- Automatically scans the `assets/` folder and returns all PDF files
- **Real-time detection**: Add/remove files and refresh the page

### 2. Production Environment (GitHub Pages)
- Uses `assets-list.json` file generated during deployment
- GitHub Actions workflow automatically updates this file when assets change
- **Build-time detection**: Files are detected during deployment

### 3. Fallback
- If neither server endpoint nor JSON file is available, uses a hardcoded list
- Ensures the app always works regardless of environment

## File Structure

```
assets/
├── tip-AandD.pdf
├── tip-Builder.pdf
├── tip-Merchant.pdf
├── tip-Volume Merchant.pdf
├── tail.pdf
├── tail-generic.pdf
└── my-sample-tip-file.pdf

assets-list.json          # Generated file with PDF list
generate-assets-list.py   # Script to generate assets-list.json
.github/workflows/        # GitHub Actions for auto-generation
```

## Adding/Removing PDF Files

### For Development (Local):
1. Add/remove PDF files in the `assets/` folder
2. Refresh the browser page
3. Files are automatically detected

### For Production (GitHub Pages):
1. Add/remove PDF files in the `assets/` folder
2. Commit and push to GitHub
3. GitHub Actions automatically generates updated `assets-list.json`
4. Files are available on the live site

### Manual Update (if needed):
```bash
# Run the generation script manually
python generate-assets-list.py

# Or on Windows
update-assets-list.bat
```

## Detection Priority

1. **Server endpoint** (`/assets-list`) - Most reliable, real-time
2. **JSON file** (`/assets-list.json`) - Works on GitHub Pages
3. **Fallback list** - Hardcoded list for maximum compatibility

## Troubleshooting

### Files not appearing:
- Check that files have `.pdf` extension
- Ensure files are in the `assets/` folder
- Verify `assets-list.json` is up to date
- Check browser console for error messages

### GitHub Actions not running:
- Ensure workflow file is in `.github/workflows/`
- Check that files are committed to main/master branch
- Verify Python script has correct permissions 