const https = require('https');
const fs = require('fs');
const path = require('path');

// Global error handlers to prevent process crashes
process.on('uncaughtException', (err) => {
  if (err.code === 'EPIPE' || err.code === 'ECONNRESET') {
    // Silently ignore EPIPE errors to prevent crashes
    console.log('⚠️  Ignored EPIPE error:', err.message);
    return;
  } else {
    console.error('Uncaught exception:', err.message);
    // Don't exit process, just log the error
    return;
  }
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled promise rejection:', reason);
});

const options = {
  key: fs.readFileSync('key.pem'),
  cert: fs.readFileSync('cert.pem')
};

const server = https.createServer(options, (req, res) => {
  try {
    let filePath = '../mobile-test.html'; // Always serve the test file
    
    // Handle socket errors to prevent EPIPE crashes
    req.on('error', (err) => {
      if (err.code === 'EPIPE' || err.code === 'ECONNRESET') {
        console.log('Client disconnected abruptly');
      } else {
        console.error('Request error:', err.message);
      }
    });
    
    res.on('error', (err) => {
      if (err.code === 'EPIPE' || err.code === 'ECONNRESET') {
        console.log('Client disconnected before response could be sent');
      } else {
        console.error('Response error:', err.message);
      }
    });
    
    // Add error handling for the underlying socket
    req.socket.on('error', (err) => {
      if (err.code === 'EPIPE' || err.code === 'ECONNRESET') {
        console.log('Socket disconnected during request');
      } else {
        console.error('Socket error during request:', err.message);
      }
    });
  
  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (!res.headersSent && !res.destroyed) {
        try {
          res.writeHead(404);
          res.end('File not found: ' + err.message);
        } catch (writeErr) {
          if (writeErr.code === 'EPIPE' || writeErr.code === 'ECONNRESET') {
            console.log('Client disconnected during error response');
          } else {
            console.log('Failed to send error response:', writeErr.message);
          }
        }
      }
    } else {
      if (!res.headersSent && !res.destroyed) {
        try {
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(content, 'utf-8');
        } catch (writeErr) {
          if (writeErr.code === 'EPIPE' || writeErr.code === 'ECONNRESET') {
            console.log('Client disconnected during response');
          } else {
            console.log('Failed to send response:', writeErr.message);
          }
        }
      }
    }
  });
  
  } catch (outerErr) {
    if (outerErr.code === 'EPIPE' || outerErr.code === 'ECONNRESET') {
      console.log('Client disconnected during request handling');
    } else {
      console.error('Outer request handler error:', outerErr.message);
    }
  }
});

// Handle server-level errors
server.on('error', (err) => {
  console.error('Server error:', err.message);
});

// Handle connection errors
server.on('connection', (socket) => {
  // Set socket to not emit errors on write failures
  socket.on('error', (err) => {
    if (err.code === 'EPIPE' || err.code === 'ECONNRESET') {
      console.log('Socket disconnected abruptly');
    } else {
      console.error('Socket error:', err.message);
    }
  });
  
  // Prevent socket from emitting unhandled error events
  socket.removeAllListeners('error');
  socket.on('error', () => {
    // Silently ignore all socket errors
  });
  
  // Override the write method to handle EPIPE gracefully
  const originalWrite = socket.write;
  socket.write = function(data, encoding, callback) {
    try {
      return originalWrite.call(this, data, encoding, (err) => {
        if (err && (err.code === 'EPIPE' || err.code === 'ECONNRESET')) {
          console.log('Write failed: client disconnected');
          if (callback) callback();
          return;
        }
        if (callback) callback(err);
      });
    } catch (err) {
      if (err.code === 'EPIPE' || err.code === 'ECONNRESET') {
        console.log('Write failed: client disconnected');
        if (callback) callback();
        return false;
      }
      throw err;
    }
  };
});

server.listen(8443, '0.0.0.0', () => {
  console.log('HTTPS Server running on https://0.0.0.0:8443');
  console.log('Access from iPhone: https://192.168.1.192:8443');
});

// Handle SIGINT (Ctrl+C / ESC) gracefully
process.on('SIGINT', () => {
  console.log('🛑 Shutting down HTTPS server gracefully...');
  
  server.close(() => {
    console.log('✅ HTTPS server closed');
    process.exit(0);
  });
  
  // Force close after 5 seconds if graceful shutdown fails
  setTimeout(() => {
    console.log('⚠️  Forcing shutdown');
    process.exit(1);
  }, 5000);
});

// bang bang 
// bang bang again!
// third time's the charm!
// testing root directory fix
// testing output directory fix
// force new deployment with correct out directory 
// again: force new deployment with correct out directory 
// force deploy of new changes to bridge, renderer, spat converstions, etc. 
// force deploy after updated SVG xml font content AGAIN and...