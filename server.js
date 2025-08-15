#!/usr/bin/env node
/**
 * Seima Scanner - Node.js Development Server
 * Simple HTTP server with proper MIME types for ES6 modules
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 8080;
const HOST = 'localhost';

// MIME types for different file extensions
const mimeTypes = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.csv': 'text/csv',
  '.txt': 'text/plain'
};

function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return mimeTypes[ext] || 'application/octet-stream';
}

function serveFile(res, filePath) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('File not found');
      } else {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Server error');
      }
      return;
    }

    const mimeType = getMimeType(filePath);
    res.writeHead(200, {
      'Content-Type': mimeType,
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Cache-Control': 'no-cache'
    });
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  let filePath = path.join(__dirname, req.url === '/' ? 'index.html' : req.url);
  
  // Security: prevent directory traversal
  if (!filePath.startsWith(__dirname)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Forbidden');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      // Try adding .html extension
      if (!path.extname(filePath)) {
        filePath += '.html';
        fs.stat(filePath, (err, stats) => {
          if (err || !stats.isFile()) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('File not found');
          } else {
            serveFile(res, filePath);
          }
        });
      } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('File not found');
      }
      return;
    }

    serveFile(res, filePath);
  });
});

server.listen(PORT, HOST, () => {
  const serverUrl = `http://${HOST}:${PORT}`;
  
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║                    Seima Scanner Server                      ║');
  console.log('║                                                              ║');
  console.log(`║  Server running at: ${serverUrl.padEnd(32)} ║`);
  console.log('║  Press Ctrl+C to stop the server                            ║');
  console.log('║                                                              ║');
  console.log('║  Features:                                                   ║');
  console.log('║  • ES6 Modules support                                       ║');
  console.log('║  • CORS headers for development                              ║');
  console.log('║  • Proper MIME types                                         ║');
  console.log('║  • Auto-opening browser                                      ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('');
  console.log(`Serving files from: ${__dirname}`);
  console.log('Starting server...');
  
  // Auto-open browser
  try {
    let command, args;
    if (process.platform === 'darwin') {
      command = 'open';
      args = [serverUrl];
    } else if (process.platform === 'win32') {
      command = 'cmd';
      args = ['/c', 'start', serverUrl];
    } else {
      command = 'xdg-open';
      args = [serverUrl];
    }
    
    spawn(command, args, { detached: true, stdio: 'ignore' });
    console.log(`✓ Browser opened to ${serverUrl}`);
  } catch (err) {
    console.log(`⚠ Could not auto-open browser: ${err.message}`);
    console.log(`Please open ${serverUrl} manually`);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('Server is running! Press Ctrl+C to stop...');
  console.log('='.repeat(60) + '\n');
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use. Please try a different port.`);
  } else {
    console.error(`❌ Server error: ${err.message}`);
  }
  process.exit(1);
});

process.on('SIGINT', () => {
  console.log('\n\n🛑 Server stopped by user');
  console.log('Thank you for using Seima Scanner!');
  process.exit(0);
}); 