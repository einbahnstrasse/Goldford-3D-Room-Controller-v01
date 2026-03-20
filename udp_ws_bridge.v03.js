/* udp_ws_bridge.v03.js ──────────────────────────────────────────────
 *  Pure OSC relay: MaxSPAT (UDP 9001) ⇆ browsers (WS 8081) 
 *  JSON-free, typetags preserved.
 * 
 *  udp_ws_bridge.v03.js is a WebSocket SERVER that sends/receives OSC 
 *  messages and forwards them to all connected devices.  
 * 
 *  this version: no updates   
 *  © 2025 Louis Goldford — Licensed under the Creative Commons
 *  Attribution-NoDerivatives 4.0 International Licence (CC BY-ND 4.0)
 *  https://creativecommons.org/licenses/by-nd/4.0/
 * 
 *  This script should be loaded into a <node.script> object,
 *  in a MaxMSP patch, such as this one:
 *       <node.script udp_ws_bridge.v03.js @watch 1>
 *  as patched in udp_ws_bridge.v01.maxpat, which should be contained
 *  in the same folder that includes this JS file. 
 *──────────────────────────────────────────────────────────────*/

const maxAPI    = require("max-api");
const osc       = require("osc");
const WebSocket = require("ws");
const http      = require("http");
const https     = require("https");
const fs        = require("fs");
const path      = require("path");
const { spawn } = require("child_process");

// Global error handlers to prevent process crashes
process.on('uncaughtException', (err) => {
  if (err.code === 'EPIPE' || err.code === 'ECONNRESET') {
    // Silently ignore EPIPE errors to prevent crashes
    maxAPI.post(`⚠️  Ignored EPIPE error: ${err.message}`);
    return;
  } else {
    maxAPI.post(`❌ Uncaught exception: ${err.message}`);
    process.exit(1);
  }
});

process.on('unhandledRejection', (reason, promise) => {
  maxAPI.post(`❌ Unhandled promise rejection: ${reason}`);
});

// Handle SIGINT (Ctrl+C / ESC) gracefully
process.on('SIGINT', () => {
  maxAPI.post('🛑 Shutting down gracefully...');
  
  // Close ngrok tunnel
  if (ngrokProcess) {
    try {
      ngrokProcess.kill();
      maxAPI.post('🔴 Stopped ngrok tunnel');
    } catch (err) {
      // Ignore errors during shutdown
    }
  }
  
  // Close all WebSocket connections
  clients.forEach((socket) => {
    try {
      socket.close();
    } catch (err) {
      // Ignore errors during shutdown
    }
  });
  
  // Close WebSocket server
  try {
    wss.close();
  } catch (err) {
    // Ignore errors during shutdown
  }
  
  // Close UDP port
  try {
    udpIn.close();
  } catch (err) {
    // Ignore errors during shutdown
  }
  
  // Close HTTP server
  try {
    httpServer.close();
  } catch (err) {
    // Ignore errors during shutdown
  }
  
  maxAPI.post('✅ Shutdown complete');
  process.exit(0);
});

/* 0 ── Automatic ngrok tunnel startup ─────────────────────────*/
let ngrokProcess = null;
let ngrokUrl = null;

function startNgrok() {
  try {
    maxAPI.post('🚀 Starting ngrok tunnel...');
    
    // Try common ngrok paths
    const ngrokPaths = [
      '/opt/homebrew/bin/ngrok',
      '/usr/local/bin/ngrok',
      'ngrok'
    ];
    
    let ngrokPath = ngrokPaths[0]; // Default to homebrew path
    
    ngrokProcess = spawn(ngrokPath, ['http', '8081'], {
      stdio: ['ignore', 'pipe', 'pipe']
    });
    
    ngrokProcess.stdout.on('data', (data) => {
      // maxAPI.post(`[ngrok] ${data.toString().trim()}`);
    });
    
    ngrokProcess.stderr.on('data', (data) => {
      const errorMsg = data.toString().trim();
      // Suppress expected "simultaneous sessions" error - ngrok tunnel is still working
      if (errorMsg.includes('authentication failed') && errorMsg.includes('simultaneous ngrok agent sessions')) {
        maxAPI.post(`[ngrok] ⚠️ Multiple session warning (tunnel still working)`);
      } else {
        maxAPI.post(`[ngrok] Error: ${errorMsg}`);
      }
    });
    
    ngrokProcess.on('close', (code) => {
      maxAPI.post(`🔴 ngrok tunnel closed (code: ${code})`);
      ngrokProcess = null;
      ngrokUrl = null;
    });
    
    // Wait a moment then try to get the tunnel URL
    setTimeout(async () => {
      try {
        const response = await fetch('http://127.0.0.1:4040/api/tunnels');
        const data = await response.json();
        if (data.tunnels && data.tunnels.length > 0) {
          ngrokUrl = data.tunnels[0].public_url;
          maxAPI.post(`✅ ngrok tunnel ready: ${ngrokUrl}`);
          maxAPI.post(`📱 QR code URL: ${ngrokUrl.replace('https://', '')}`);
          
          // Store ngrok URL and send to all connected browsers via OSC
          storedNgrokUrl = ngrokUrl.replace('https://', '');
          const urlMessage = {
            address: "/ngrok/url",
            args: [
              { type: "s", value: storedNgrokUrl }
            ]
          };
          broadcastToWebSockets(urlMessage);
        }
      } catch (err) {
        maxAPI.post(`⚠️ Could not fetch ngrok URL: ${err.message}`);
      }
    }, 3000);
    
  } catch (err) {
    maxAPI.post(`❌ Failed to start ngrok: ${err.message}`);
    maxAPI.post(`📝 Make sure ngrok is installed and configured with auth token`);
  }
}

// Start ngrok automatically
startNgrok();

/* 1 ── UDP listener (Max → Node) ───────────────────────────────*/
const udpIn = new osc.UDPPort({
  localAddress : "127.0.0.1",
  localPort    : 9001,          // <- SPAT5.osc.udpsend sends here
  metadata     : true
});
udpIn.open();
maxAPI.post("✅ UDP listening on 127.0.0.1:9001");

/* 2 ── WebSocket servers (Node → Browser) ─────────────────────*/

// Regular WebSocket server (for local development)
const wss = new WebSocket.Server({ port: 8081, host: '0.0.0.0' });
maxAPI.post("✅ WS server on ws://0.0.0.0:8081 (accessible from network)");

// SSL WebSocket server (for HTTPS PWA connections)
let wssSecure = null;
try {
  const sslPath = path.join(__dirname, 'ssl');
  const serverOptions = {
    cert: fs.readFileSync(path.join(sslPath, 'cert.pem')),
    key: fs.readFileSync(path.join(sslPath, 'key.pem'))
  };
  
  const httpsServer = https.createServer(serverOptions, (req, res) => {
    // Simple HTTPS response for certificate acceptance
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`
      <html>
        <head><title>SSL Certificate Test</title></head>
        <body>
          <h1>SSL WebSocket Server Running</h1>
          <p>This server is ready to accept secure WebSocket connections on wss://192.168.1.192:8443</p>
          <p>Certificate has been accepted. You can now use the PWA.</p>
        </body>
      </html>
    `);
  });
  wssSecure = new WebSocket.Server({ server: httpsServer });
  httpsServer.listen(8443, '0.0.0.0', () => {
    maxAPI.post("✅ WSS server on wss://0.0.0.0:8443 (SSL enabled for HTTPS PWA)");
  });
} catch (err) {
  maxAPI.post(`⚠️ SSL WebSocket server failed to start: ${err.message}`);
  maxAPI.post("📝 Regular WebSocket (port 8081) will still work for local connections");
}

/* Keep track of connected browsers from both servers */
const clients = new Set();
let storedNgrokUrl = null;

/* Broadcast OSC message to all connected browsers */
function broadcastToWebSockets(oscMessage) {
  if (clients.size === 0) {
    maxAPI.post(`📡 No clients connected to broadcast message`);
    return;
  }
  
  try {
    const buffer = osc.writePacket(oscMessage);
    clients.forEach(socket => {
      try {
        if (socket.readyState === 1) { // WebSocket.OPEN
          socket.send(buffer);
        }
      } catch (err) {
        if (err.code === 'EPIPE' || err.code === 'ECONNRESET') {
          clients.delete(socket);
        } else {
          maxAPI.post(`❌ Error broadcasting to client: ${err.message}`);
        }
      }
    });
    maxAPI.post(`📡 Broadcasted ${oscMessage.address} to ${clients.size} clients`);
  } catch (err) {
    maxAPI.post(`❌ Error creating OSC packet for broadcast: ${err.message}`);
  }
}

wss.on("connection", (socket) => {
  clients.add(socket);
  maxAPI.post(`🔌 Browser connected — total: ${clients.size}`);
  
  // Send stored ngrok URL to new client if available
  if (storedNgrokUrl) {
    const urlMessage = {
      address: "/ngrok/url",
      args: [
        { type: "s", value: storedNgrokUrl }
      ]
    };
    try {
      const buffer = osc.writePacket(urlMessage);
      socket.send(buffer);
      maxAPI.post(`📡 Sent ngrok URL to new client: ${storedNgrokUrl}`);
    } catch (err) {
      maxAPI.post(`❌ Error sending ngrok URL to new client: ${err.message}`);
    }
  }

  /* a) Browser → Max */
  socket.on("message", (data) => {
    maxAPI.post(`📨 Received ${data.length} bytes from browser`);
    try {
      const pkt = osc.readPacket(new Uint8Array(data), { metadata: true });
      
      // Check if it's a bundle or individual message
      if (pkt.packets) {
        // It's a bundle - preserve it
        maxAPI.post(`📋 OSC bundle with ${pkt.packets.length} messages`);
        udpIn.send(pkt, "127.0.0.1", 9002);
        maxAPI.post(`✅ Forwarded bundle to Max on port 9002`);
      } else {
        // It's an individual message
        maxAPI.post(`📋 OSC message: ${pkt.address} with ${pkt.args ? pkt.args.length : 0} args`);
        udpIn.send(pkt, "127.0.0.1", 9002);
        maxAPI.post(`✅ Forwarded message to Max on port 9002`);
      }

      // ALSO relay to other connected browsers (excluding sender)
      clients.forEach((otherSocket) => {
        if (otherSocket !== socket && otherSocket.readyState === WebSocket.OPEN) {
          try {
            otherSocket.send(Buffer.from(data));
            maxAPI.post(`🔄 Relayed message to other browser`);
          } catch (err) {
            if (err.code === 'EPIPE' || err.code === 'ECONNRESET') {
              maxAPI.post(`⚠️ Client disconnected during relay`);
              clients.delete(otherSocket);
            } else {
              maxAPI.post(`❌ Error relaying to browser: ${err.message}`);
            }
          }
        }
      });
    } catch (err) {
      maxAPI.post(`❌ Error parsing OSC packet: ${err.message}`);
    }
  });

  socket.on("close", () => {
    clients.delete(socket);
    maxAPI.post(`❌ Browser disconnected — total: ${clients.size}`);
  });

  socket.on("error", (err) => {
    if (err.code === 'EPIPE' || err.code === 'ECONNRESET') {
      maxAPI.post(`⚠️  Client connection error (${err.code}), removing from clients list`);
      clients.delete(socket);
    } else {
      maxAPI.post(`❌ WebSocket error: ${err.message}`);
    }
  });
});

// SSL WebSocket connection handler (same logic as regular WebSocket)
if (wssSecure) {
  wssSecure.on("connection", (socket) => {
    clients.add(socket);
    maxAPI.post(`🔒 SSL browser connected — total: ${clients.size}`);
    
    // Send stored ngrok URL to new SSL client if available
    if (storedNgrokUrl) {
      const urlMessage = {
        address: "/ngrok/url",
        args: [
          { type: "s", value: storedNgrokUrl }
        ]
      };
      try {
        const buffer = osc.writePacket(urlMessage);
        socket.send(buffer);
        maxAPI.post(`📡 Sent ngrok URL to new SSL client: ${storedNgrokUrl}`);
      } catch (err) {
        maxAPI.post(`❌ Error sending ngrok URL to new SSL client: ${err.message}`);
      }
    }

    /* a) Browser → Max */
    socket.on("message", (data) => {
      maxAPI.post(`📨 Received ${data.length} bytes from SSL browser`);
      try {
        const pkt = osc.readPacket(new Uint8Array(data), { metadata: true });
        
        // Check if it's a bundle or individual message
        if (pkt.packets) {
          // It's a bundle - preserve it
          maxAPI.post(`📋 OSC bundle with ${pkt.packets.length} messages`);
          udpIn.send(pkt, "127.0.0.1", 9002);
          maxAPI.post(`✅ Forwarded bundle to Max on port 9002`);
        } else {
          // It's an individual message
          maxAPI.post(`📋 OSC message: ${pkt.address} with ${pkt.args ? pkt.args.length : 0} args`);
          udpIn.send(pkt, "127.0.0.1", 9002);
          maxAPI.post(`✅ Forwarded message to Max on port 9002`);
        }

        // ALSO relay to other connected browsers (excluding sender)
        clients.forEach((otherSocket) => {
          if (otherSocket !== socket && otherSocket.readyState === WebSocket.OPEN) {
            try {
              otherSocket.send(Buffer.from(data));
              maxAPI.post(`🔄 Relayed message to other browser`);
            } catch (err) {
              if (err.code === 'EPIPE' || err.code === 'ECONNRESET') {
                maxAPI.post(`⚠️ Client disconnected during relay`);
                clients.delete(otherSocket);
              } else {
                maxAPI.post(`❌ Error relaying to browser: ${err.message}`);
              }
            }
          }
        });
      } catch (err) {
        maxAPI.post(`❌ Error parsing OSC packet: ${err.message}`);
      }
    });

    socket.on("close", () => {
      clients.delete(socket);
      maxAPI.post(`❌ SSL browser disconnected — total: ${clients.size}`);
    });

    socket.on("error", (err) => {
      if (err.code === 'EPIPE' || err.code === 'ECONNRESET') {
        maxAPI.post(`⚠️  SSL client connection error (${err.code}), removing from clients list`);
        clients.delete(socket);
      } else {
        maxAPI.post(`❌ SSL WebSocket error: ${err.message}`);
      }
    });
  });
}

/* 3 ── Max/SPAT → every connected browser ─────────────────────*/
udpIn.on("raw", (data /** Uint8Array */) => {
  // maxAPI.post(`BRIDGE got ${data.length} bytes from Max`);
  clients.forEach((s) => {
    if (s.readyState === WebSocket.OPEN) {
      try {
        s.send(Buffer.from(data));
      } catch (err) {
        if (err.code === 'EPIPE' || err.code === 'ECONNRESET') {
          maxAPI.post(`⚠️  Client disconnected abruptly, removing from clients list`);
          clients.delete(s);
        } else {
          maxAPI.post(`❌ Error sending data to client: ${err.message}`);
        }
      }
    }
  });
});

/* 4 ── HTTP server for JSON scene data (Browser → Max) ───────*/
const httpPort = 2112;

const requestHandler = (request, response) => {
  // Add CORS headers to allow requests from other origins (like 127.0.0.1)
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle OPTIONS preflight request
  if (request.method === 'OPTIONS') {
    response.writeHead(200);
    response.end();
    return;
  }

  // Handle POST request
  if (request.method === "POST") {
    let body = [];
    request.on("data", (chunk) => {
      body.push(chunk);
    }).on("end", () => {
      body = Buffer.concat(body).toString();
      try {
        let data = JSON.parse(body);
        maxAPI.post(`📨 HTTP received scene data: ${JSON.stringify(data).length} characters`);
        // Send the received JSON message to Max via the first outlet
        maxAPI.outlet(data.message);
      } catch (err) {
        maxAPI.post(`❌ HTTP JSON parse error: ${err.message}`);
        response.statusCode = 500;
        response.end(`Error: ${err}.`);
        return;
      }
    });
    response.end("success");
  }
};

const httpServer = http.createServer(requestHandler);

httpServer.listen(httpPort, (err) => {
  if (err) {
    maxAPI.post(`❌ HTTP server error: ${err}`);
  } else {
    maxAPI.post(`✅ HTTP server listening on port ${httpPort}`);
  }
});
