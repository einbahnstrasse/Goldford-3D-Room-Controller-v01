'use client';

// SSL/WSS support for HTTPS PWA deployment
import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HiSun, HiMoon, HiLightBulb } from 'react-icons/hi';
import { IoEyeOutline, IoEyeOffOutline } from 'react-icons/io5';
import { HiQrcode, HiX, HiChevronDown } from 'react-icons/hi';
import { IoShareOutline } from 'react-icons/io5';
import Hamburger from 'hamburger-react';
import Script from 'next/script';
// QR scanner will be loaded dynamically to avoid SSR issues

interface Source {
  id: number;
  name: string;
  position: { x: number; y: number; z: number };
  controller?: string;
  available: boolean;
}

interface GyroscopeData {
  alpha: number;
  beta: number;
  gamma: number;
}

export default function MobileController() {
  const [showSplash, setShowSplash] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authenticatedUser, setAuthenticatedUser] = useState('');
  const [selectedSource, setSelectedSource] = useState<Source | null>(null);
  const [sources] = useState<Source[]>([
    { id: 1, name: 'Violin', position: { x: 0, y: 0, z: 0 }, available: true },
    { id: 2, name: 'Cello', position: { x: 0, y: 0, z: 0 }, controller: 'Max Algorithm', available: false },
    { id: 3, name: 'Piano', position: { x: 0, y: 0, z: 0 }, available: true },
    { id: 4, name: 'Flute', position: { x: 0, y: 0, z: 0 }, available: true },
  ]);
  const [gyroscope, setGyroscope] = useState<GyroscopeData>({ alpha: 0, beta: 0, gamma: 0 });
  const [previousGyroscope, setPreviousGyroscope] = useState<GyroscopeData>({ alpha: 0, beta: 0, gamma: 0 });
  
  // Origin repositioning for coordinate offset calculations
  const [originOffset, setOriginOffset] = useState<{ x: number; y: number; z: number }>({ x: 0, y: 0, z: 0 });
  const [isOriginSet, setIsOriginSet] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [showWireframeModal, setShowWireframeModal] = useState(false);
  const [deviceId] = useState(() => {
    // Generate unique mobile device ID on each load
    const randomHex = Math.random().toString(16).substring(2, 10);
    return `mobile_${randomHex}`;
  });
  const [menuOpen, setMenuOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState('main');
  const [darkMode, setDarkMode] = useState(true);
  const [oscSettings, setOscSettings] = useState({
    host: '192.168.1.192',
    port: '8081',
    sslPort: '8443'
  });
  const [loginForm, setLoginForm] = useState({
    username: '',
    password: ''
  });
  const [loginError, setLoginError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [oscConnected, setOscConnected] = useState(false);
  const [oscSocket, setOscSocket] = useState<WebSocket | null>(null);
  const [oscLogEnabled, setOscLogEnabled] = useState(false);
  const [oscLogMessages, setOscLogMessages] = useState<string[]>([]);
  const [oscLibLoaded, setOscLibLoaded] = useState(false);
  const [deviceLabel, setDeviceLabel] = useState('');
  const [showMessageKey, setShowMessageKey] = useState(false);
  const [showColorKey, setShowColorKey] = useState(false);
  const [showQrScanner, setShowQrScanner] = useState(false);
  const [qrScanner, setQrScanner] = useState<any>(null);
  const [howToUseExpanded, setHowToUseExpanded] = useState(true);
  const [aboutModeBloomExpanded, setAboutModeBloomExpanded] = useState(false);
  const [creditsExpanded, setCreditsExpanded] = useState(true);
  const [termsOfServiceExpanded, setTermsOfServiceExpanded] = useState(false);
  const [attributionsExpanded, setAttributionsExpanded] = useState(false);
  
  // Typewriter effect for device label placeholder
  const placeholderTexts = useMemo(() => [
    "...but don't call me Shirley.",
    "Anything goes. Don't overthink it.", 
    "Not collecting data. Pinky swear.",
    "We swear we won't sell this."
  ], []);
  const [currentPlaceholderIndex, setCurrentPlaceholderIndex] = useState(0);
  const [currentPlaceholderText, setCurrentPlaceholderText] = useState('');
  const [isTyping, setIsTyping] = useState(true);
  const [deviceLabelFocused, setDeviceLabelFocused] = useState(false);
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);
  const [movementMode, setMovementMode] = useState<'delta' | 'continuous'>('delta');
  const [showTermsOfService, setShowTermsOfService] = useState(false);
  
  // PWA install prompt states
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  
  // Screen wake lock state
  const [wakeLock, setWakeLock] = useState<WakeLockSentinel | null>(null);
  const [wakeLockSupported, setWakeLockSupported] = useState(false);

  // Check for stored authentication on app load
  useEffect(() => {
    const storedAuth = localStorage.getItem('modebloom_auth');
    if (storedAuth) {
      try {
        const authData = JSON.parse(storedAuth);
        setIsAuthenticated(true);
        setAuthenticatedUser(authData.username);
        console.log(`[Auth] Restored session for user: ${authData.username}`);
      } catch (error) {
        console.error('[Auth] Failed to parse stored auth data:', error);
        localStorage.removeItem('modebloom_auth');
      }
    }
  }, []);

  // Check if app is running in standalone mode (PWA) vs browser
  useEffect(() => {
    const checkStandalone = () => {
      const standalone = window.matchMedia('(display-mode: standalone)').matches || 
                        (window.navigator as any).standalone === true;
      
      setIsStandalone(standalone);
    };

    // Check immediately
    checkStandalone();
    
    // Also listen for display mode changes
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    mediaQuery.addEventListener('change', checkStandalone);
    
    return () => mediaQuery.removeEventListener('change', checkStandalone);
  }, []);

  // Check wake lock support and manage screen wake lock
  useEffect(() => {
    // Check if Wake Lock API is supported
    if ('wakeLock' in navigator) {
      setWakeLockSupported(true);
    }
  }, []);

  // Release wake lock when disconnected (wake lock is now activated upon connection)
  useEffect(() => {
    const releaseWakeLock = async () => {
      if (wakeLock && !oscConnected) {
        try {
          await wakeLock.release();
          setWakeLock(null);
          console.log('[WakeLock] Screen wake lock released due to disconnection - screen can sleep normally');
        } catch (error) {
          console.warn('[WakeLock] Failed to release screen wake lock:', error);
        }
      }
    };
    
    if (!oscConnected) {
      releaseWakeLock();
    }
    
    // Cleanup on unmount
    return () => {
      if (wakeLock) {
        wakeLock.release().catch(console.warn);
      }
    };
  }, [oscConnected, wakeLock]);

  // Re-request wake lock when page becomes visible (handles page visibility changes)
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && oscConnected && wakeLockSupported && !wakeLock) {
        try {
          const newWakeLock = await navigator.wakeLock.request('screen');
          setWakeLock(newWakeLock);
          console.log('[WakeLock] Screen wake lock re-activated after page became visible');
          
          newWakeLock.addEventListener('release', () => {
            console.log('[WakeLock] Screen wake lock released');
            setWakeLock(null);
          });
        } catch (error) {
          console.warn('[WakeLock] Failed to re-request screen wake lock:', error);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [oscConnected, wakeLock, wakeLockSupported]);

  // Handle splash screen timeout
  useEffect(() => {
    if (!showSplash) return;
    
    const timer = setTimeout(() => {
      setShowSplash(false);
      
      // After splash ends, check if we should show install prompt
      const dismissedInstall = localStorage.getItem('modebloom_dismissed_install');
      if (!isStandalone && !dismissedInstall) {
        setTimeout(() => {
          setShowInstallPrompt(true);
        }, 1200);
      }
    }, 5000);
    return () => clearTimeout(timer);
  }, [showSplash, isStandalone]);

  // Real device motion access - requires permission on iOS 13+
  useEffect(() => {
    if (!oscConnected || !selectedSource) return;

    const handleDeviceMotion = (event: DeviceOrientationEvent) => {
      if (event.alpha !== null && event.beta !== null && event.gamma !== null) {
        setGyroscope({
          alpha: event.alpha,
          beta: event.beta,
          gamma: event.gamma,
        });
      }
    };

    const requestPermissionAndStart = async () => {
      if (window.DeviceOrientationEvent) {
        // iOS 13+ requires permission
        if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
          try {
            const permission = await (DeviceOrientationEvent as any).requestPermission();
            if (permission === 'granted') {
              window.addEventListener('deviceorientation', handleDeviceMotion);
            } else {
              console.warn('Device orientation permission denied');
            }
          } catch (error) {
            console.error('Error requesting device orientation permission:', error);
          }
        } else {
          // Non-iOS or older iOS - no permission needed
          window.addEventListener('deviceorientation', handleDeviceMotion);
        }
      }
    };

    requestPermissionAndStart();

    return () => {
      window.removeEventListener('deviceorientation', handleDeviceMotion);
    };
  }, [oscConnected, selectedSource]);

  // Typewriter effect for device label placeholder
  useEffect(() => {
    if (deviceLabelFocused || deviceLabel.length > 0) {
      // Stop animation if user is focused on the field or has typed something
      return;
    }

    const currentText = placeholderTexts[currentPlaceholderIndex];
    
    if (isTyping) {
      // Typing phase
      if (currentPlaceholderText.length < currentText.length) {
        const timer = setTimeout(() => {
          setCurrentPlaceholderText(currentText.substring(0, currentPlaceholderText.length + 1));
        }, 100); // Typing speed
        return () => clearTimeout(timer);
      } else {
        // Finished typing, pause then start erasing
        const timer = setTimeout(() => {
          setIsTyping(false);
        }, 2000); // Pause duration
        return () => clearTimeout(timer);
      }
    } else {
      // Erasing phase
      if (currentPlaceholderText.length > 0) {
        const timer = setTimeout(() => {
          setCurrentPlaceholderText(currentPlaceholderText.substring(0, currentPlaceholderText.length - 1));
        }, 50); // Erasing speed (faster than typing)
        return () => clearTimeout(timer);
      } else {
        // Finished erasing, move to next text
        const timer = setTimeout(() => {
          setCurrentPlaceholderIndex((prev) => (prev + 1) % placeholderTexts.length);
          setIsTyping(true);
        }, 500); // Brief pause before next text
        return () => clearTimeout(timer);
      }
    }
  }, [currentPlaceholderText, isTyping, currentPlaceholderIndex, deviceLabelFocused, deviceLabel, placeholderTexts]);

  // OSC Log Management
  const addToOscLog = (message: string) => {
    if (!oscLogEnabled) return; // Skip logging if disabled
    
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `[${timestamp}] ${message}`;
    setOscLogMessages(prev => {
      const newMessages = [...prev, logEntry];
      // Keep only last 50 messages
      return newMessages.slice(-50);
    });
  };

  // OSC Connection Management
  const connectToOSC = () => {
    // Detect if we're running on HTTPS and choose appropriate protocol and port
    const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
    const protocol = isHttps ? 'wss' : 'ws';
    const port = isHttps ? oscSettings.sslPort : oscSettings.port;
    const wsUrl = `${protocol}://${oscSettings.host}:${port}`;
    
    const connectionMessage = `Attempting connection to ${wsUrl}${isHttps ? ' (SSL mode for HTTPS)' : ''}`;
    console.log(`[OSC] ${connectionMessage}`);
    addToOscLog(connectionMessage);
    
    try {
      // Connect to OSC WebSocket bridge using configured port and protocol
      const ws = new WebSocket(wsUrl);
      
      console.log(`[OSC] WebSocket created, readyState: ${ws.readyState} (0=CONNECTING, 1=OPEN, 2=CLOSING, 3=CLOSED)`);
      addToOscLog(`WebSocket created (state: CONNECTING)`);
      
      // Set a timeout to catch hanging connections
      const connectionTimeout = setTimeout(() => {
        if (ws.readyState === WebSocket.CONNECTING) {
          const timeoutMessage = 'Connection timeout after 5 seconds';
          console.log(`[OSC] ⏰ ${timeoutMessage}`);
          addToOscLog(`⏰ ${timeoutMessage}`);
          ws.close();
        }
      }, 5000); // 5 second timeout
      
      ws.onopen = () => {
        const successMessage = `✅ Successfully connected to ${wsUrl}`;
        console.log(`[OSC] ${successMessage}`);
        addToOscLog(successMessage);
        clearTimeout(connectionTimeout);
        setOscConnected(true);
        setOscSocket(ws);
        
        // Request wake lock immediately upon connection to prevent screen sleep
        if (wakeLockSupported && !wakeLock) {
          navigator.wakeLock.request('screen').then((newWakeLock) => {
            setWakeLock(newWakeLock);
            console.log('[WakeLock] Screen wake lock activated upon OSC connection - screen will stay on');
            addToOscLog('🔒 Wake lock activated - screen stays on');
            
            // Listen for wake lock release
            newWakeLock.addEventListener('release', () => {
              console.log('[WakeLock] Screen wake lock released');
              setWakeLock(null);
            });
          }).catch((error) => {
            console.warn('[WakeLock] Failed to request screen wake lock upon connection:', error);
          });
        }
        
        // Send controller announcement directly using ws instance
        if (!oscLibLoaded) {
          console.warn('[OSC] OSC library not loaded yet for announcement');
          return;
        }

        try {
          // Send announcement
          const announceMessage = {
            address: '/controller/announce',
            args: [{ type: 's', value: deviceId }]
          };
          const announceBinaryData = (window as any).osc.writePacket(announceMessage);
          ws.send(announceBinaryData);
          const announceLogMessage = `📤 Sent (binary): /controller/announce "${deviceId}"`;
          console.log(`[OSC] ${announceLogMessage}`);
          addToOscLog(announceLogMessage);

          // Send default label (device ID)
          const defaultLabel = deviceLabel.trim() || deviceId;
          const labelMessage = {
            address: `/controller/${deviceId}/label`,
            args: [{ type: 's', value: defaultLabel }]
          };
          const labelBinaryData = (window as any).osc.writePacket(labelMessage);
          ws.send(labelBinaryData);
          const labelLogMessage = `📤 Sent (binary): /controller/${deviceId}/label "${defaultLabel}"`;
          console.log(`[OSC] ${labelLogMessage}`);
          addToOscLog(labelLogMessage);
        } catch (error) {
          const errorMessage = `❌ Failed to send announcement: ${error}`;
          console.error(`[OSC] ${errorMessage}`);
          addToOscLog(errorMessage);
        }
      };
      
      ws.onclose = (event) => {
        const closeMessage = `❌ Connection closed (Code: ${event.code})${event.reason ? `, Reason: ${event.reason}` : ''}`;
        console.log(`[OSC] ${closeMessage}`);
        addToOscLog(closeMessage);
        clearTimeout(connectionTimeout);
        setOscConnected(false);
        setOscSocket(null);
      };
      
      ws.onerror = (error) => {
        const errorMessage = '❌ Connection failed - OSC bridge not running or unreachable';
        console.error('[OSC] ❌ Connection error:', error);
        console.log(`[OSC] ${errorMessage}`);
        addToOscLog(errorMessage);
        clearTimeout(connectionTimeout);
        setOscConnected(false);
      };

      ws.onmessage = (event) => {
        try {
          if (!oscLibLoaded || !(window as any).osc) {
            console.warn('[OSC] OSC library not loaded yet for message parsing');
            return;
          }

          const message = (window as any).osc.readPacket(event.data);
          console.log('[OSC] Received message:', message);
          addToOscLog(`📥 Received: ${message.address} ${message.args?.map((a: any) => a.value).join(' ') || ''}`);

          // Handle position responses for origin setting or reset
          if (message.address === '/listener/xyz/response' && message.args?.length === 3) {
            console.log(`[OSC] DEBUG: Got listener response, isResetting:`, isResetting, `selectedSource:`, selectedSource);
            const [x, y, z] = message.args.map((a: any) => a.value);
            
            if (isResetting && selectedSource) {
              // Move source to listener position for reset
              console.log(`[Reset] DEBUG: Moving source ${selectedSource.id} to position (${x}, ${y}, ${z})`);
              sendOSCMessage(`/source/${selectedSource.id}/xyz`, [x, y, z]);
              addToOscLog(`↩️ Source ${selectedSource.id} moved to listener position: (${x.toFixed(3)}, ${y.toFixed(3)}, ${z.toFixed(3)})`);
              setIsResetting(false);
            } else {
              // Setting origin to listener position
              setOriginOffset({ x, y, z });
              setIsOriginSet(true);
              addToOscLog(`📍 Origin set to listener position: (${x.toFixed(3)}, ${y.toFixed(3)}, ${z.toFixed(3)})`);
            }
            
            // Reset gyroscope tracking to current values
            setPreviousGyroscope(gyroscope);
          }
          
          // Handle source position response for origin setting
          if (message.address.match(/^\/source\/\d+\/xyz\/response$/) && message.args?.length === 3) {
            console.log(`[OSC] DEBUG: Got source position response:`, message);
            const [x, y, z] = message.args.map((a: any) => a.value);
            const sourceId = message.address.match(/\/source\/(\d+)\/xyz\/response/)?.[1];
            console.log(`[Origin] DEBUG: Setting origin to (${x}, ${y}, ${z}) for source ${sourceId}`);
            setOriginOffset({ x, y, z });
            setIsOriginSet(true);
            addToOscLog(`📍 Origin set to source ${sourceId} position: (${x.toFixed(3)}, ${y.toFixed(3)}, ${z.toFixed(3)})`);
            
            // Reset gyroscope tracking to current values
            setPreviousGyroscope(gyroscope);
            
            // Send origin set notification to OSC bridge
            sendOSCMessage('/controller/origin/set', [deviceId, selectedSource?.id, x, y, z]);
            
            console.log(`[Origin] Set new origin at listener position: (${x.toFixed(2)}, ${y.toFixed(2)}, ${z.toFixed(2)})`);
            addToOscLog(`📍 Origin set to listener position: (${x.toFixed(2)}, ${y.toFixed(2)}, ${z.toFixed(2)})`);
          }
        } catch (error) {
          console.error('[OSC] Error parsing received message:', error);
          addToOscLog(`❌ Failed to parse received message: ${error}`);
        }
      };
      
    } catch (error) {
      const errorMessage = `Failed to create WebSocket: ${error}`;
      console.error(`[OSC] ${errorMessage}`);
      addToOscLog(`❌ ${errorMessage}`);
    }
  };

  const sendOSCMessage = useCallback((address: string, args: any[] = []) => {
    if (oscSocket && oscSocket.readyState === WebSocket.OPEN) {
      if (!oscLibLoaded) {
        const errorMessage = '⚠️ OSC library not loaded yet';
        console.warn(`[OSC] ${errorMessage}`);
        addToOscLog(errorMessage);
        return;
      }

      try {
        // Create OSC message in binary format using osc.js
        const message = {
          address: address,
          args: args.map(arg => ({
            type: typeof arg === 'number' ? 'f' : 's',
            value: arg
          }))
        };
        
        // Use osc.js to create binary OSC packet
        const binaryData = (window as any).osc.writePacket(message);
        
        // Send as binary data instead of JSON
        oscSocket.send(binaryData);
        const logMessage = `📤 Sent (binary): ${address} ${args.length > 0 ? args.join(' ') : ''}`;
        console.log(`[OSC] ${logMessage}`);
        addToOscLog(logMessage);
      } catch (error) {
        const errorMessage = `❌ Failed to create OSC message: ${error}`;
        console.error(`[OSC] ${errorMessage}`);
        addToOscLog(errorMessage);
      }
    } else {
      const errorMessage = '⚠️ Cannot send - not connected';
      console.warn(`[OSC] ${errorMessage}`);
      addToOscLog(errorMessage);
    }
  }, [oscSocket, oscLibLoaded, addToOscLog]);

  // Send device label update via OSC
  const sendDeviceLabelUpdate = (label: string) => {
    if (oscConnected) {
      const labelToSend = label.trim() || deviceId;
      sendOSCMessage(`/controller/${deviceId}/label`, [labelToSend]);
    }
  };

  // Send gyroscope data via OSC when connected and controlling a source
  useEffect(() => {
    if (oscConnected && selectedSource && oscSocket) {
      let spatXIncrement = 0;
      let spatZIncrement = 0; 
      let spatYIncrement = 0;

      if (movementMode === 'delta') {
        // DELTA MODE: Movement based on changes from previous values
        const alphaDelta = gyroscope.alpha - previousGyroscope.alpha;
        const betaDelta = gyroscope.beta - previousGyroscope.beta;
        const gammaDelta = gyroscope.gamma - previousGyroscope.gamma;
        
        // Handle 360-degree wraparound for alpha
        let normalizedAlphaDelta = alphaDelta;
        if (alphaDelta > 180) normalizedAlphaDelta = alphaDelta - 360;
        if (alphaDelta < -180) normalizedAlphaDelta = alphaDelta + 360;
        
        // Check for potential gimbal lock / coordinate singularity conditions
        const isBetaNearSingularity = Math.abs(gyroscope.beta) > 80;
        
        // Apply noise filtering for alpha when near singularities
        let filteredAlphaDelta = normalizedAlphaDelta;
        if (isBetaNearSingularity) {
          const alphaNoiseThreshold = 10.0;
          if (Math.abs(normalizedAlphaDelta) > alphaNoiseThreshold) {
            console.log(`[Gyroscope] Filtering alpha noise near singularity: ${normalizedAlphaDelta.toFixed(2)}° -> 0°`);
            filteredAlphaDelta = 0;
          }
        }
        
        // Map gyroscope deltas to SPAT coordinates
        spatXIncrement = (-filteredAlphaDelta / 360 * 2);
        spatZIncrement = (betaDelta / 180 * 1.5);
        spatYIncrement = (gammaDelta / 180 * 1.5);
        
      } else {
        // CONTINUOUS MODE: Movement based on current tilt relative to origin
        // Define the origin position (flat phone)
        const originAlpha = isOriginSet ? originOffset.x : 0;
        const originBeta = isOriginSet ? originOffset.y : 0;
        const originGamma = isOriginSet ? originOffset.z : 0;
        
        // Calculate current tilt relative to origin
        let alphaFromOrigin = gyroscope.alpha - originAlpha;
        let betaFromOrigin = gyroscope.beta - originBeta;
        let gammaFromOrigin = gyroscope.gamma - originGamma;
        
        // Handle 360-degree wraparound for alpha
        if (alphaFromOrigin > 180) alphaFromOrigin -= 360;
        if (alphaFromOrigin < -180) alphaFromOrigin += 360;
        
        // Apply deadzone to prevent jitter when phone is near flat
        const deadzone = 2.0; // degrees
        if (Math.abs(alphaFromOrigin) < deadzone) alphaFromOrigin = 0;
        if (Math.abs(betaFromOrigin) < deadzone) betaFromOrigin = 0;
        if (Math.abs(gammaFromOrigin) < deadzone) gammaFromOrigin = 0;
        
        // Convert tilt angles to continuous movement increments  
        // Stronger tilt = faster movement
        const sensitivity = 0.002; // Reduced sensitivity for gradual movement
        spatXIncrement = (-alphaFromOrigin * sensitivity);
        spatZIncrement = (betaFromOrigin * sensitivity);
        spatYIncrement = (gammaFromOrigin * sensitivity);
      }
      
      // Convert to fixed decimal for consistency
      spatXIncrement = parseFloat(spatXIncrement.toFixed(4));
      spatZIncrement = parseFloat(spatZIncrement.toFixed(4));
      spatYIncrement = parseFloat(spatYIncrement.toFixed(4));
      
      // Send incremental position updates for selected source (only if movement is significant)
      if (Math.abs(spatXIncrement) > 0.001) {
        sendOSCMessage(`/source/${selectedSource.id}/x++`, [spatXIncrement]);
      }
      if (Math.abs(spatZIncrement) > 0.001) {
        sendOSCMessage(`/source/${selectedSource.id}/z++`, [spatZIncrement]);
      }
      if (Math.abs(spatYIncrement) > 0.001) {
        sendOSCMessage(`/source/${selectedSource.id}/y++`, [spatYIncrement]);
      }
      
      // Update previous values for next calculation (used in delta mode)
      setPreviousGyroscope(gyroscope);
    }
  }, [gyroscope, oscConnected, selectedSource, oscSocket, deviceId, sendOSCMessage, previousGyroscope, isOriginSet, originOffset, movementMode, isResetting]);

  // Continuous mode timer for ongoing movement when phone is tilted
  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    
    if (movementMode === 'continuous' && oscConnected && selectedSource && oscSocket) {
      // Set up continuous sending for continuous mode
      intervalId = setInterval(() => {
        // This will trigger the main gyroscope useEffect
        // We just need to ensure it runs regularly even without gyroscope changes
      }, 100); // 10Hz update rate for smoother, more controlled movement
    }
    
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [movementMode, oscConnected, selectedSource, oscSocket]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    
    // Check fake credentials
    if (loginForm.username === 'bachthoven' && loginForm.password === 'nomorefugues') {
      setIsAuthenticated(true);
      setAuthenticatedUser(loginForm.username);
      
      // Store authentication in localStorage
      const authData = {
        username: loginForm.username,
        timestamp: Date.now()
      };
      localStorage.setItem('modebloom_auth', JSON.stringify(authData));
      console.log(`[Auth] Stored session for user: ${loginForm.username}`);
      
      // Clear form
      setLoginForm({ username: '', password: '' });
    } else {
      setLoginError('Invalid username or password');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setAuthenticatedUser('');
    localStorage.removeItem('modebloom_auth');
    console.log('[Auth] User logged out');
    
    // Also disconnect OSC and reset connection state
    if (oscSocket) {
      oscSocket.close();
    }
    setOscConnected(false);
    setSelectedSource(null);
    setMenuOpen(false);
  };

  const handleConnect = () => {
    console.log('[Connect] Button clicked, attempting OSC connection...');
    // Establish OSC connection
    connectToOSC();
  };

  const handleSourceSelect = (source: Source) => {
    if (source.available) {
      if (selectedSource?.id === source.id) {
        // Unbind from current source
        sendOSCMessage(`/source/${source.id}/label`, [`s${source.id}`]);
        sendOSCMessage('/controller/unbind', [deviceId, source.id]);
        setSelectedSource(null);
        console.log(`[Controller] Unbound from source ${source.id}`);
        addToOscLog(`🔓 Unbound from source ${source.id}`);
      } else {
        // Bind to new source
        const label = deviceLabel.trim() || deviceId;
        // Don't send separate source label - let the bind operation handle it
        sendOSCMessage('/controller/bind', [deviceId, source.id, label]);
        setSelectedSource(source);
        console.log(`[Controller] Bound to source ${source.id} with label: ${label}`);
        addToOscLog(`🔗 Bound to source ${source.id} with label: ${label}`);
      }
    }
  };


  const handlePageChange = (page: string) => {
    setCurrentPage(page);
    setMenuOpen(false);
  };

  // QR Scanner functions
  const startQrScanner = () => {
    setShowQrScanner(true);
    setTimeout(async () => {
      if (!qrScanner) {
        try {
          // Dynamically import the QR scanner to avoid SSR issues
          const { Html5QrcodeScanner } = await import('html5-qrcode');
          
          const scanner = new Html5QrcodeScanner(
            'qr-reader',
            { 
              fps: 10,
              qrbox: { width: 250, height: 250 },
              aspectRatio: 1.0
            },
            false
          );
          
          scanner.render(
            (decodedText: string) => {
              // QR Code successfully scanned
              console.log('[QR] Scanned:', decodedText);
              parseQrConfig(decodedText);
              scanner.clear();
              setQrScanner(null);
              setShowQrScanner(false);
            },
            () => {
              // QR scanning error (usually no QR code found)
              // Don't log every scan attempt
            }
          );
          
          setQrScanner(scanner);
        } catch (error) {
          console.error('[QR] Failed to load QR scanner:', error);
          alert('Failed to load QR scanner. Please try again.');
          setShowQrScanner(false);
        }
      }
    }, 100);
  };

  const parseQrConfig = (qrData: string) => {
    try {
      // Extract config from URL if it's a full URL
      let configData = '';
      if (qrData.includes('config=')) {
        const urlParams = new URLSearchParams(qrData.split('?')[1]);
        configData = urlParams.get('config') || '';
      } else {
        configData = qrData;
      }

      // Decode base64 config
      const decodedConfig = JSON.parse(atob(configData));
      console.log('[QR] Parsed config:', decodedConfig);

      // Update OSC settings
      if (decodedConfig.host && decodedConfig.port) {
        setOscSettings({
          host: decodedConfig.host,
          port: decodedConfig.port.toString(),
          sslPort: decodedConfig.sslPort?.toString() || '8443'
        });
        
        // Navigate to OSC settings page with pre-filled values
        setCurrentPage('osc');
        
        console.log('[QR] Settings updated and navigated to OSC page');
        
        // Auto-connect after 1.5 seconds
        setTimeout(() => {
          console.log('[QR] Auto-connecting after QR scan...');
          handleConnect();
        }, 1500);
      }
    } catch (error) {
      console.error('[QR] Failed to parse config:', error);
      alert('Invalid QR code format');
      setShowQrScanner(false);
    }
  };

  const stopQrScanner = () => {
    if (qrScanner) {
      qrScanner.clear();
      setQrScanner(null);
    }
    setShowQrScanner(false);
  };

  return (
    <>
      <Script 
        src="https://cdn.jsdelivr.net/npm/osc@2.4.5/dist/osc-browser.min.js"
        strategy="afterInteractive"
        onLoad={() => {
          console.log('[OSC] OSC library loaded successfully');
          setOscLibLoaded(true);
        }}
        onError={(e) => {
          console.error('[OSC] Failed to load OSC library:', e);
          addToOscLog('❌ Failed to load OSC library');
        }}
      />
      <AnimatePresence mode="wait">
      {showSplash ? (
        <div className="min-h-screen min-h-[100dvh] relative overflow-hidden">
          {/* Create 8 vertical slices, each containing the full splash screen */}
          {[...Array(8)].map((_, i) => (
            <motion.div
              key={`slice-${i}`}
              initial={{ x: 0 }}
              animate={{ x: 0 }}
              exit={{ 
                x: i % 2 === 0 ? "-100%" : "100%",
                opacity: 0
              }}
              transition={{ 
                duration: 0.8, 
                delay: i * 0.05,
                ease: "easeInOut"
              }}
              className="absolute overflow-hidden"
              style={{
                left: `${i * 12.5}%`,
                top: 0,
                width: "12.5%",
                height: "100%"
              }}
            >
              {/* Full splash screen background and content, positioned to show correct slice */}
              <div 
                className="bg-gradient-to-br from-gray-900 via-slate-900 to-purple-950 text-white flex items-center justify-center"
                style={{
                  width: "800%", // 8 × 100% to contain full screen
                  height: "100%",
                  transform: `translateX(${-i * 12.5}%)` // Position to show correct slice
                }}
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className="text-center"
                >
                  <motion.div 
                    className="h-32 w-32 mx-auto mb-6 rounded-full overflow-hidden"
                    initial={{ rotate: 0 }}
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, ease: "easeInOut" }}
                  >
                    <img 
                      src="/icon-192x192.png" 
                      alt="ModeBloom" 
                      className="w-full h-full object-cover"
                    />
                  </motion.div>
                  <motion.h1 
                    className="text-5xl mb-4 text-white"
                    style={{fontFamily: 'Florsn38, sans-serif'}}
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.3, duration: 0.6 }}
                  >
                    ModeBloom
                  </motion.h1>
                  <motion.p 
                    className="text-lg text-purple-200"
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.6, duration: 0.6 }}
                  >
                    spatial audio controller
                  </motion.p>
                </motion.div>
              </div>
            </motion.div>
          ))}
        </div>
      ) : !isAuthenticated ? (
        <motion.div
          key="login"
          initial={{ opacity: 0, x: 100 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -100 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className={`min-h-screen min-h-[100dvh] flex items-center justify-center p-4 transition-colors duration-300 ${
            darkMode ? 'bg-black text-gray-100' : 'bg-gray-50 text-gray-900'
          }`}
        >
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          className={`w-full max-w-md p-8 border ${
            darkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'
          }`}
        >
          <div className="text-center mb-8">
            <div className="h-20 w-20 mx-auto mb-4 rounded-full overflow-hidden">
              <img 
                src="/icon-192x192.png" 
                alt="ModeBloom" 
                className="w-full h-full object-cover"
              />
            </div>
            <h1 className={`text-3xl font-bold mb-2 ${darkMode ? 'text-gray-100' : 'text-gray-900'}`} style={{fontFamily: 'Florsn38, sans-serif'}}>
              ModeBloom
            </h1>
            <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Sign in to continue
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-8">
            <div className="relative">
              <input
                id="username"
                type="text"
                value={loginForm.username}
                onChange={(e) => setLoginForm({...loginForm, username: e.target.value})}
                className={`w-full px-4 py-4 border-2 rounded-lg focus:outline-none transition-all duration-300 peer ${
                  darkMode 
                    ? 'bg-gray-800/50 border-gray-600 text-white placeholder-transparent focus:border-purple-400 focus:shadow-lg focus:shadow-purple-400/25 hover:border-gray-500' 
                    : 'bg-white/50 border-gray-300 text-gray-900 placeholder-transparent focus:border-purple-500 focus:shadow-lg focus:shadow-purple-500/25 hover:border-gray-400'
                }`}
                placeholder="Username or Email"
                required
              />
              <label 
                htmlFor="username" 
                className={`absolute left-3 px-1 -top-1.5 text-xs font-medium transition-all duration-300 pointer-events-none ${
                  darkMode ? 'bg-gray-900 text-purple-300' : 'bg-white text-purple-500'
                } peer-focus:text-purple-400`}
              >
                username or email
              </label>
            </div>
            
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={loginForm.password}
                onChange={(e) => setLoginForm({...loginForm, password: e.target.value})}
                className={`w-full px-4 py-4 pr-12 border-2 rounded-lg focus:outline-none transition-all duration-300 peer ${
                  darkMode 
                    ? 'bg-gray-800/50 border-gray-600 text-white placeholder-transparent focus:border-purple-400 focus:shadow-lg focus:shadow-purple-400/25 hover:border-gray-500' 
                    : 'bg-white/50 border-gray-300 text-gray-900 placeholder-transparent focus:border-purple-500 focus:shadow-lg focus:shadow-purple-500/25 hover:border-gray-400'
                }`}
                placeholder="Password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className={`absolute right-3 top-1/2 transform -translate-y-1/2 transition-colors duration-200 ${
                  darkMode 
                    ? 'text-purple-300 hover:text-purple-400' 
                    : 'text-purple-500 hover:text-purple-600'
                }`}
              >
                {showPassword ? <IoEyeOffOutline size={20} /> : <IoEyeOutline size={20} />}
              </button>
              <label 
                htmlFor="password" 
                className={`absolute left-3 px-1 -top-1.5 text-xs font-medium transition-all duration-300 pointer-events-none ${
                  darkMode ? 'bg-gray-900 text-purple-300' : 'bg-white text-purple-500'
                } peer-focus:text-purple-400`}
              >
                password
              </label>
            </div>

            {loginError && (
              <div className="bg-red-600 text-white p-3 text-sm">
                {loginError}
              </div>
            )}

            <motion.button
              type="submit"
              className={`w-full font-black text-sm uppercase px-5 py-3 text-center transition-colors focus:ring-4 focus:outline-none border ${
                darkMode 
                  ? 'text-[#C4E538] border-[#C4E538] hover:text-black hover:bg-[#C4E538] focus:ring-[#C4E538]' 
                  : 'text-gray-700 border-gray-700 hover:text-black hover:bg-[#9ACD32] focus:ring-gray-300'
              }`}
              style={{fontFamily: 'Florsn13, sans-serif'}}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Sign In
            </motion.button>
          </form>
          
          {/* Privacy Policy & Terms of Service Links */}
          <div className="mt-6 text-center">
            <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              We honestly don&apos;t give a fuck about you or your data, and therefore we don&apos;t save or sell any of it.</p>
            <p className={`text-xs mt-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Still, by signing into this app, you agree to our{' '} 
              <button
                onClick={() => setShowPrivacyPolicy(true)}
                className={`underline transition-colors ${
                  darkMode 
                    ? 'text-purple-300 hover:text-purple-400' 
                    : 'text-purple-600 hover:text-purple-700'
                }`}
              >
                Privacy Policy
              </button>
              {' '}and to our{' '}
              <button
                onClick={() => setShowTermsOfService(true)}
                className={`underline transition-colors ${
                  darkMode 
                    ? 'text-purple-300 hover:text-purple-400' 
                    : 'text-purple-600 hover:text-purple-700'
                }`}
              >
                Terms of Service
              </button>
              .
            </p>
          </div>
          </motion.div>
        </motion.div>
      ) : (
        <motion.div
          key="main"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.6 }}
          className={`min-h-screen min-h-[100dvh] p-3 sm:p-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] transition-colors duration-300 ${
            darkMode 
              ? 'bg-black text-gray-100' 
              : 'bg-gray-50 text-gray-900'
          }`}
        >
      {/* Simplified Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3 flex-1">
          <div className="h-20 w-20 sm:h-12 sm:w-12 rounded-full overflow-hidden">
            <img 
              src="/icon-192x192.png" 
              alt="ModeBloom" 
              className="w-full h-full object-cover"
            />
          </div>
          <h1 className={`text-3xl sm:text-4xl font-bold ${darkMode ? 'text-gray-300' : 'text-gray-900'}`} style={{fontFamily: 'Florsn38, sans-serif'}}>
            ModeBloom
          </h1>
        </div>
        
        {/* Hamburger Menu */}
        <div className={`p-1 transition-colors ${
          darkMode 
            ? 'text-blue-400 hover:text-white' 
            : 'text-blue-700 hover:text-white'
        }`}>
          <Hamburger 
            toggled={menuOpen} 
            toggle={setMenuOpen}
            size={32}
            color={darkMode ? '#d1d5db' : '#374151'}
            direction="left"
          />
        </div>
      </div>

      {/* Animated Slide-out Menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ x: "100%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className={`fixed top-0 right-0 h-full w-80 max-w-[85vw] shadow-2xl z-50 p-4 sm:p-6 ${
              darkMode ? 'bg-gray-900' : 'bg-white border-l border-gray-200'
            }`}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold" style={{fontFamily: 'Florsn13, sans-serif'}}>Menu</h2>
              <div className={`p-1 transition-colors ${
                darkMode ? 'text-blue-400 hover:text-white' : 'text-blue-700 hover:text-white'
              }`}>
                <Hamburger 
                  toggled={menuOpen} 
                  toggle={setMenuOpen}
                  size={24}
                  color={darkMode ? '#d1d5db' : '#374151'}
                  direction="left"
                />
              </div>
            </div>
            
            
            <nav className="space-y-4">
              <motion.button
                onClick={() => handlePageChange('main')}
                className={`w-full text-left px-5 py-2.5 transition-colors border focus:ring-4 focus:outline-none font-black text-sm uppercase ${
                  currentPage === 'main' 
                    ? darkMode ? 'bg-[#C4E538] text-black border-[#C4E538]' : 'bg-gray-800 text-white border-gray-800'
                    : darkMode 
                      ? 'text-gray-300 border-gray-600 hover:text-black hover:bg-[#C4E538] focus:ring-[#C4E538]' 
                      : 'text-gray-700 border-gray-700 hover:text-black hover:bg-[#9ACD32] focus:ring-gray-300'
                }`}
                style={{fontFamily: 'Florsn13, sans-serif'}}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Controller
              </motion.button>
              
              <motion.button
                onClick={() => handlePageChange('about')}
                className={`w-full text-left px-5 py-2.5 transition-colors border focus:ring-4 focus:outline-none font-black text-sm uppercase ${
                  currentPage === 'about' 
                    ? darkMode ? 'bg-[#C4E538] text-black border-[#C4E538]' : 'bg-gray-800 text-white border-gray-800'
                    : darkMode 
                      ? 'text-gray-300 border-gray-600 hover:text-black hover:bg-[#C4E538] focus:ring-[#C4E538]' 
                      : 'text-gray-700 border-gray-700 hover:text-black hover:bg-[#9ACD32] focus:ring-gray-300'
                }`}
                style={{fontFamily: 'Florsn13, sans-serif'}}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                About
              </motion.button>
              
              <motion.button
                onClick={() => handlePageChange('osc')}
                className={`w-full text-left px-5 py-2.5 transition-colors border focus:ring-4 focus:outline-none font-black text-sm uppercase ${
                  currentPage === 'osc' 
                    ? darkMode ? 'bg-[#C4E538] text-black border-[#C4E538]' : 'bg-gray-800 text-white border-gray-800'
                    : darkMode 
                      ? 'text-gray-300 border-gray-600 hover:text-black hover:bg-[#C4E538] focus:ring-[#C4E538]' 
                      : 'text-gray-700 border-gray-700 hover:text-black hover:bg-[#9ACD32] focus:ring-gray-300'
                }`}
                style={{fontFamily: 'Florsn13, sans-serif'}}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                OSC Settings
              </motion.button>
              
              <motion.button
                onClick={() => handlePageChange('osclog')}
                className={`w-full text-left px-5 py-2.5 transition-colors border focus:ring-4 focus:outline-none font-black text-sm uppercase ${
                  currentPage === 'osclog' 
                    ? darkMode ? 'bg-[#C4E538] text-black border-[#C4E538]' : 'bg-gray-800 text-white border-gray-800'
                    : darkMode 
                      ? 'text-gray-300 border-gray-600 hover:text-black hover:bg-[#C4E538] focus:ring-[#C4E538]' 
                      : 'text-gray-700 border-gray-700 hover:text-black hover:bg-[#9ACD32] focus:ring-gray-300'
                }`}
                style={{fontFamily: 'Florsn13, sans-serif'}}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                OSC Activity
              </motion.button>
              
              <motion.button
                onClick={() => handlePageChange('credits')}
                className={`w-full text-left px-5 py-2.5 transition-colors border focus:ring-4 focus:outline-none font-black text-sm uppercase ${
                  currentPage === 'credits' 
                    ? darkMode ? 'bg-[#C4E538] text-black border-[#C4E538]' : 'bg-gray-800 text-white border-gray-800'
                    : darkMode 
                      ? 'text-gray-300 border-gray-600 hover:text-black hover:bg-[#C4E538] focus:ring-[#C4E538]' 
                      : 'text-gray-700 border-gray-700 hover:text-black hover:bg-[#9ACD32] focus:ring-gray-300'
                }`}
                style={{fontFamily: 'Florsn13, sans-serif'}}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Credits
              </motion.button>
            </nav>
            
            {/* User Info & Logout - Bottom of Menu */}
            <div className="space-y-3 mt-6 border-t pt-6 border-gray-600">
              <div className={`p-3 ${
                darkMode ? 'bg-gray-800' : 'bg-gray-200'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Logged in as</span>
                  <span className="text-xs text-purple-400 font-mono">
                    {authenticatedUser}
                  </span>
                </div>
                <motion.button
                  onClick={handleLogout}
                  className={`w-full px-3 py-2 text-xs transition-colors border focus:ring-2 focus:outline-none font-medium uppercase ${
                    darkMode 
                      ? 'text-gray-300 border-gray-600 hover:text-black hover:bg-[#C4E538] focus:ring-[#C4E538]' 
                      : 'text-gray-700 border-gray-700 hover:text-black hover:bg-[#9ACD32] focus:ring-gray-300'
                  }`}
                  style={{fontFamily: 'Florsn13, sans-serif'}}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Sign Out
                </motion.button>
              </div>
            </div>
            
            {/* Connection Status & Dark Mode Toggle */}
            <div className="space-y-3">
              <div className={`p-3 ${
                darkMode ? 'bg-gray-800' : 'bg-gray-200'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">OSC Connection</span>
                  <span className={`px-2 py-1 text-xs ${
                    oscConnected 
                      ? 'bg-green-600 text-white' 
                      : 'bg-red-600 text-white'
                  }`}>
                    {oscConnected ? '✓ Connected' : '✗ Disconnected'}
                  </span>
                </div>
                {oscConnected && (
                  <p className={`text-xs mt-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Ready to send gyroscope data as OSC messages
                  </p>
                )}
              </div>
              
              <motion.button
                onClick={() => setDarkMode(!darkMode)}
                className={`w-full flex items-center justify-between px-5 py-2.5 transition-colors border focus:ring-4 focus:outline-none font-black text-sm uppercase ${
                  darkMode ? 'text-gray-300 border-gray-600 hover:text-black hover:bg-[#C4E538] focus:ring-[#C4E538]' : 'text-gray-700 border-gray-700 hover:text-black hover:bg-[#9ACD32] focus:ring-gray-300'
                }`}
                style={{fontFamily: 'Florsn13, sans-serif'}}
                whileTap={{ scale: 0.98 }}
              >
                <span className="text-sm font-medium">Dark Mode</span>
                <motion.div
                  className={`p-2 transition-colors ${
                    darkMode 
                      ? 'bg-gray-600 text-white' 
                      : 'bg-gray-200 text-gray-900'
                  }`}
                >
                  {darkMode ? <HiSun size={16} /> : <HiMoon size={16} />}
                </motion.div>
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Overlay */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMenuOpen(false)}
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
          />
        )}
      </AnimatePresence>

      {/* Page Content */}
      {currentPage === 'main' && (
        <>
          {/* Connection Status */}
          {!oscConnected && (
        <div className={`p-4 mb-6 border ${
          darkMode 
            ? 'bg-gray-900 border-gray-700' 
            : 'bg-white border-gray-200'
        }`}>
          <div className="flex items-start space-x-2">
            <HiLightBulb className={`w-4 h-4 mt-0.5 flex-shrink-0 ${darkMode ? 'text-yellow-400' : 'text-yellow-600'}`} />
            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              <span className="font-bold">TIP :</span> Scan QR code from <strong>projector screen</strong> or go to <strong>OSC Settings</strong> to configure your connection.
            </p>
          </div>
        </div>
      )}

      {/* QR Scanner Button */}
      {!oscConnected && (
        <div className="mb-6">
          <button
            onClick={startQrScanner}
            className={`w-full font-black text-sm uppercase px-5 py-2.5 text-center transition-colors focus:ring-4 focus:outline-none border flex items-center justify-center space-x-2 ${
              darkMode 
                ? 'text-[#C4E538] border-[#C4E538] hover:text-black hover:bg-[#C4E538] focus:ring-[#C4E538]' 
                : 'text-gray-700 border-gray-700 hover:text-black hover:bg-[#9ACD32] focus:ring-gray-300'
            }`}
            style={{fontFamily: 'Florsn13, sans-serif'}}
          >
            <HiQrcode className="w-5 h-5" />
            <span>Scan QR Code</span>
          </button>
        </div>
      )}

      {/* Device Info */}
      <div className={`p-4 mb-6 border ${
        darkMode 
          ? 'bg-gray-900 border-gray-700' 
          : 'bg-white border-gray-200'
      }`}>
        <h2 className={`text-xl font-semibold mb-4 flex items-center ${darkMode ? 'text-gray-200' : 'text-gray-900'}`} style={{fontFamily: 'Florsn13, sans-serif'}}>
          ⚙️ Device Settings
        </h2>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Device <strong>ID</strong></label>
            <p className="text-gray-400 font-mono text-sm" style={{fontVariantNumeric: 'oldstyle'}}>{deviceId}</p>
          </div>
          <div>
            <label htmlFor="deviceLabel" className="block text-sm font-medium mb-1">
              Give me a <strong>NAME</strong> <em>(optional)</em>
            </label>
            <input
              id="deviceLabel"
              type="text"
              value={deviceLabel}
              onFocus={() => setDeviceLabelFocused(true)}
              onBlur={() => setDeviceLabelFocused(false)}
              onChange={(e) => {
                setDeviceLabel(e.target.value);
                // Send label update via OSC when user types (if connected)
                if (oscConnected) {
                  sendDeviceLabelUpdate(e.target.value);
                }
              }}
              placeholder={deviceLabelFocused || deviceLabel.length > 0 ? "" : currentPlaceholderText}
              className={`w-full px-3 py-2 border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                darkMode 
                  ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-400' 
                  : 'bg-gray-100 border-gray-300 text-gray-900 placeholder-gray-500'
              }`}
            />
            {deviceLabel.trim() && !oscConnected && (
              <p className={`text-xs mt-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                ✓ Will be sent as your name when you connect
              </p>
            )}
            {deviceLabel.trim() && oscConnected && (
              <p className={`text-xs mt-2 ${darkMode ? 'text-green-400' : 'text-green-600'}`}>
                ✓ Sent to system as: <span className="font-mono">&quot;{deviceLabel.trim()}&quot;</span>
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Go to OSC Settings Button */}
      {!oscConnected && (
        <button
          onClick={() => handlePageChange('osc')}
          className={`w-full font-black text-sm uppercase px-5 py-2.5 text-center mb-6 transition-colors focus:ring-4 focus:outline-none border ${
            darkMode 
              ? 'text-[#C4E538] border-[#C4E538] hover:text-black hover:bg-[#C4E538] focus:ring-[#C4E538]' 
              : 'text-gray-700 border-gray-700 hover:text-black hover:bg-[#9ACD32] focus:ring-gray-300'
          }`}
          style={{fontFamily: 'Florsn13, sans-serif'}}
        >
          &#8594; to OSC Settings 
        </button>
      )}

      {/* Instructions */}
      {oscConnected && !selectedSource && (
        <div className={`p-4 mb-4 border ${
          darkMode 
            ? 'bg-gray-900 border-gray-700' 
            : 'bg-white border-gray-200'
        }`}>
          <div className="flex items-start space-x-2">
            <HiLightBulb className={`w-4 h-4 mt-0.5 flex-shrink-0 ${darkMode ? 'text-yellow-400' : 'text-yellow-600'}`} />
            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              <span className="font-bold">TIP :</span> Select a source below to begin controlling its position with your device&apos;s gyroscope.
            </p>
          </div>
        </div>
      )}

      {/* Source Selection */}
      {oscConnected && (
        <div className={`p-4 mb-6 border ${
          darkMode 
            ? 'bg-gray-900 border-gray-700' 
            : 'bg-white border-gray-200'
        }`}>
          <h2 className={`text-xl font-semibold mb-4 ${darkMode ? 'text-gray-200' : 'text-gray-900'}`} style={{fontFamily: 'Florsn13, sans-serif'}}>Select Audio Source</h2>
          <div className="grid grid-cols-1 gap-3">
            {sources.map((source) => (
              <div
                key={source.id}
                className={`p-4 border-2 cursor-pointer transition-all ${
                  selectedSource?.id === source.id
                    ? 'border-[#C4E538] bg-[#C4E538]/10'
                    : source.available
                    ? darkMode 
                      ? 'border-gray-600 bg-gray-800 hover:border-gray-500'
                      : 'border-gray-300 bg-gray-100 hover:border-gray-400'
                    : darkMode
                      ? 'border-gray-700 bg-gray-800 opacity-50 cursor-not-allowed'
                      : 'border-gray-200 bg-gray-100 opacity-50 cursor-not-allowed'
                }`}
                onClick={() => handleSourceSelect(source)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold" style={{fontFamily: 'Florsn13, sans-serif'}}>{source.name}</h3>
                    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`} style={{fontVariantNumeric: 'oldstyle'}}>Source {source.id}</p>
                  </div>
                  <div className="text-right">
                    <span className={`px-2 py-1 text-xs ${
                      selectedSource?.id === source.id 
                        ? 'bg-[#C4E538] text-black' 
                        : source.available 
                        ? 'bg-gray-600 text-white' 
                        : 'bg-red-600 text-white'
                    }`}>
                      {selectedSource?.id === source.id 
                        ? 'Controlling' 
                        : source.available 
                        ? 'Available' 
                        : (source.controller || 'Unavailable')
                      }
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Gyroscope Control */}
      {oscConnected && selectedSource && (
        <div className={`p-4 mb-6 border ${
          darkMode 
            ? 'bg-gray-900 border-gray-700' 
            : 'bg-white border-gray-200'
        }`}>
          <h2 className="text-xl font-semibold mb-4" style={{fontFamily: 'Florsn13, sans-serif'}}>
            Controlling: {selectedSource.name}
          </h2>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2 sm:gap-4 text-center">
              <div className={`p-2 sm:p-3 ${
                darkMode ? 'bg-gray-800' : 'bg-gray-200'
              }`}>
                <div className="text-xl sm:text-2xl font-bold text-gray-300" style={{fontVariantNumeric: 'oldstyle'}}>
                  {gyroscope.alpha.toFixed(0)}°
                </div>
                <div className={`text-xs sm:text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Alpha</div>
              </div>
              <div className={`p-2 sm:p-3 ${
                darkMode ? 'bg-gray-800' : 'bg-gray-200'
              }`}>
                <div className="text-xl sm:text-2xl font-bold text-gray-400" style={{fontVariantNumeric: 'oldstyle'}}>
                  {gyroscope.beta.toFixed(0)}°
                </div>
                <div className={`text-xs sm:text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Beta</div>
              </div>
              <div className={`p-2 sm:p-3 ${
                darkMode ? 'bg-gray-800' : 'bg-gray-200'
              }`}>
                <div className="text-xl sm:text-2xl font-bold text-gray-500" style={{fontVariantNumeric: 'oldstyle'}}>
                  {gyroscope.gamma.toFixed(0)}°
                </div>
                <div className={`text-xs sm:text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Gamma</div>
              </div>
            </div>
            
            <div className={`p-4 ${
              darkMode ? 'bg-gray-800' : 'bg-gray-200'
            }`}>
              <div className="flex items-start space-x-2 mb-3">
                <HiLightBulb className={`w-4 h-4 mt-0.5 flex-shrink-0 ${darkMode ? 'text-yellow-400' : 'text-yellow-600'}`} />
                <div>
                  <h3 className="font-semibold mb-2" style={{fontFamily: 'Florsn13, sans-serif'}}>
                    <span className="font-bold">TIP :</span> Movement Mapping{' '}
                    <button
                      onClick={() => setShowWireframeModal(true)}
                      className={`text-xs underline hover:no-underline transition-colors ${
                        darkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-500'
                      }`}
                    >
                      (view diagram)
                    </button>
                  </h3>
                </div>
              </div>
              <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`} style={{fontVariantNumeric: 'oldstyle'}}>
                <div className="mb-1"><strong>Hold phone flat, screen up</strong></div>
                <div>Alpha (spin) → SPAT X (left/right)</div>
                <div>Beta (pitch) → SPAT Z (forward/back)</div>
                <div>Gamma (roll) → SPAT Y (up/down)</div>
              </div>
            </div>

            {/* Set Origin Button */}
            <div className={`p-4 ${
              darkMode ? 'bg-gray-800' : 'bg-gray-200'
            }`}>
              <h3 className="font-semibold mb-2" style={{fontFamily: 'Florsn13, sans-serif'}}>Coordinate Origin</h3>
              <div className="space-y-3">
                <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  {isOriginSet ? (
                    <span className="text-green-500">
                      ✓ Custom origin set at current position
                    </span>
                  ) : (
                    <span>
                      Origin: Listener position (0, 0, 0)
                    </span>
                  )}
                </div>
                <motion.button
                  onClick={() => {
                    if (selectedSource && oscSocket) {
                      // Request current source position to set as origin
                      console.log(`[Origin] DEBUG: selectedSource:`, selectedSource);
                      console.log(`[Origin] DEBUG: oscSocket state:`, oscSocket.readyState);
                      sendOSCMessage(`/source/${selectedSource.id}/xyz/get`, []);
                      console.log(`[Origin] Requesting source ${selectedSource.id} position for origin setting`);
                      addToOscLog(`📍 Setting origin at source ${selectedSource.id} current position...`);
                    } else {
                      console.log(`[Origin] DEBUG: Cannot send - selectedSource:`, selectedSource, `oscSocket:`, oscSocket);
                    }
                  }}
                  disabled={!selectedSource}
                  className={`w-full font-black text-sm uppercase px-5 py-2.5 text-center transition-colors focus:ring-4 focus:outline-none border ${
                    !selectedSource 
                      ? 'opacity-50 cursor-not-allowed text-gray-500 border-gray-500'
                      : darkMode 
                        ? 'text-[#C4E538] border-[#C4E538] hover:text-black hover:bg-[#C4E538] focus:ring-[#C4E538]' 
                        : 'text-gray-700 border-gray-700 hover:text-black hover:bg-[#9ACD32] focus:ring-gray-300'
                  }`}
                  style={{fontFamily: 'Florsn13, sans-serif'}}
                  whileHover={selectedSource ? { scale: 1.02 } : {}}
                  whileTap={selectedSource ? { scale: 0.98 } : {}}
                >
                  Set Origin
                </motion.button>
                
                <motion.button
                  onClick={() => {
                    if (selectedSource && oscSocket) {
                      // Get listener position and move source there
                      console.log(`[Reset] DEBUG: selectedSource:`, selectedSource);
                      console.log(`[Reset] DEBUG: oscSocket state:`, oscSocket.readyState);
                      sendOSCMessage('/listener/xyz/get', []);
                      console.log(`[Reset] Moving source ${selectedSource.id} to listener position`);
                      addToOscLog(`↩️ Moving source ${selectedSource.id} back to listener position...`);
                      
                      // Store that we're doing a reset operation
                      setIsResetting(true);
                    } else {
                      console.log(`[Reset] DEBUG: Cannot send - selectedSource:`, selectedSource, `oscSocket:`, oscSocket);
                    }
                  }}
                  className={`w-full font-black text-sm uppercase px-5 py-2.5 text-center transition-colors focus:ring-4 focus:outline-none border ${
                    darkMode 
                      ? 'text-[#C4E538] border-[#C4E538] hover:text-black hover:bg-[#C4E538] focus:ring-[#C4E538]' 
                      : 'text-gray-700 border-gray-700 hover:text-black hover:bg-[#9ACD32] focus:ring-gray-300'
                  }`}
                  style={{fontFamily: 'Florsn13, sans-serif'}}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Reset
                </motion.button>
              </div>

              {/* Movement Mode Toggle */}
              <div className="mt-4 pt-4 border-t border-gray-600">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-medium text-gray-300">
                    Movement Mode
                  </label>
                  <div className="flex items-center space-x-2">
                    <span className={`text-xs ${movementMode === 'delta' ? 'text-[#C4E538] font-medium' : 'text-gray-500'}`}>
                      Delta
                    </span>
                    <button
                      onClick={() => setMovementMode(movementMode === 'delta' ? 'continuous' : 'delta')}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#C4E538] focus:ring-offset-2 ${
                        movementMode === 'continuous' ? 'bg-[#C4E538]' : 'bg-gray-600'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                          movementMode === 'continuous' ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                    <span className={`text-xs ${movementMode === 'continuous' ? 'text-[#C4E538] font-medium' : 'text-gray-500'}`}>
                      Continuous
                    </span>
                  </div>
                </div>
                <p className="text-xs text-gray-400">
                  {movementMode === 'delta' 
                    ? 'Movement based on device tilt changes (default)'
                    : 'Continuous movement while device is tilted'
                  }
                </p>
              </div>
            </div>

          </div>
        </div>
      )}

        </>
      )}

      {/* About Page */}
      {currentPage === 'about' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="space-y-6"
        >
          <div className={`border ${
            darkMode 
              ? 'bg-gray-900 border-gray-700' 
              : 'bg-white border-gray-200'
          }`}>
            
            {/* How to Use Section */}
            <div className={`border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <button
                onClick={() => {
                  if (!howToUseExpanded) {
                    setHowToUseExpanded(true);
                    setAboutModeBloomExpanded(false);
                  } else {
                    setHowToUseExpanded(false);
                  }
                }}
                className={`w-full px-4 py-3 text-left flex items-center justify-between hover:bg-opacity-50 transition-colors ${
                  darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-100'
                }`}
              >
                <h2 className={`text-lg font-bold ${darkMode ? 'text-gray-200' : 'text-gray-900'}`} style={{fontFamily: 'Florsn13, sans-serif'}}>
                  How to Use
                </h2>
                <motion.div
                  animate={{ rotate: howToUseExpanded ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                  className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}
                >
                  <HiChevronDown className="w-6 h-6" />
                </motion.div>
              </button>
              <AnimatePresence>
                {howToUseExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <div className={`px-4 pb-4 space-y-3 ${darkMode ? 'text-gray-300' : 'text-gray-800'}`}>
                      <div>
                        <h3 className={`font-semibold mb-2 ${darkMode ? 'text-gray-200' : 'text-gray-900'}`} style={{fontFamily: 'Florsn13, sans-serif'}}>Getting Connected</h3>
                        <ol className="space-y-2 text-sm list-decimal list-inside ml-4">
                          <li>Look for a QR code on the <strong>projector screen</strong>. It appears when the system is ready.</li>
                          <li>Tap <strong>Scan QR Code</strong> on the main page.</li>
                          <li>Point your camera at the QR code to <strong>automatically configure</strong> connection settings.</li>
                          <li>Or, tap <strong>OSC Settings</strong> and manually type in the connection details.</li>
                          <li>Tap <strong>Connect</strong> to join the session.</li>
                          <li>At any time, <strong>verify your connection status</strong> in the <strong>Menu</strong>. It will either show &quot;Connected&quot; or &quot;Disconnected.&quot;</li>
                        </ol>
                      </div>
                      
                      <div>
                        <h3 className={`font-semibold mb-2 ${darkMode ? 'text-gray-200' : 'text-gray-900'}`} style={{fontFamily: 'Florsn13, sans-serif'}}>Controlling Audio Sources</h3>
                        <ol className="space-y-2 text-sm list-decimal list-inside ml-4">
                          <li>Once connected, select an available <strong>audio source</strong> from the list.</li>
                          <li><strong>Hold your device flat</strong> with the screen facing up, then tilt to create movements in 3D space.</li>
                          <li><strong>Rotate clockwise/counterclockwise</strong> (Alpha) moves the source left/right, <strong>pitch forward/back</strong> (Beta) moves depth, <strong>roll left/right</strong> (Gamma) moves vertically.</li>
                          <li>Choose between <strong>Delta mode</strong> (movement based on device tilt changes) or <strong>Continuous mode</strong> (ongoing movement while device is tilted).</li>
                          <li>Your movement intensity controls speed - gentle movements for fine positioning, stronger movements for faster control.</li>
                        </ol>
                      </div>

                      <div className={`p-4 ${darkMode ? 'bg-gray-800' : 'bg-gray-100'} rounded`}>
                        <h4 className={`font-semibold mb-2 ${darkMode ? 'text-gray-200' : 'text-gray-900'}`}>Movement Modes</h4>
                        <div className="space-y-3 text-sm">
                          <div>
                            <strong className={`${darkMode ? 'text-[#C4E538]' : 'text-green-600'}`}>Delta Mode (Default):</strong>
                            <ul className="ml-4 mt-1 space-y-1">
                              <li>• Movement based on <strong>changes</strong> in device tilt</li>
                              <li>• Tilt your device, then return to flat for precise positioning</li>
                              <li>• Best for fine control and detailed positioning work</li>
                              <li>• Uses gyroscope delta values for responsive control</li>
                            </ul>
                          </div>
                          <div>
                            <strong className={`${darkMode ? 'text-[#C4E538]' : 'text-green-600'}`}>Continuous Mode:</strong>
                            <ul className="ml-4 mt-1 space-y-1">
                              <li>• Ongoing movement while device remains tilted</li>
                              <li>• Tilt strength determines movement speed</li>
                              <li>• Source only stops moving when device returns to flat/origin</li>
                              <li>• Best for smooth, flowing movements and sweeping gestures</li>
                            </ul>
                          </div>
                          <p className={`text-xs mt-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            <em>Toggle between modes using the Movement Mode switch when controlling a source</em>
                          </p>
                        </div>
                      </div>

                      <div className={`p-4 ${darkMode ? 'bg-gray-800' : 'bg-gray-100'} rounded`}>
                        <h4 className={`font-semibold mb-2 ${darkMode ? 'text-gray-200' : 'text-gray-900'}`}>Gyroscope Motion Mapping</h4>
                        <div className="space-y-3 text-sm">
                          <div className={`mb-4 p-3 ${darkMode ? 'bg-gray-700' : 'bg-gray-200'} rounded`}>
                            <h5 className={`font-medium mb-2 ${darkMode ? 'text-gray-200' : 'text-gray-900'}`}>Phone Orientation</h5>
                            <p className="mb-2">Hold your phone <strong>flat/horizontal</strong> with the screen facing up toward the ceiling. The phone&apos;s coordinate system defines three rotation axes:</p>
                            <ul className="space-y-1 ml-2 text-xs">
                              <li>• <strong>X-axis:</strong> Runs horizontally across the screen (left to right)</li>
                              <li>• <strong>Y-axis:</strong> Runs vertically along the screen (bottom to top)</li>
                              <li>• <strong>Z-axis:</strong> Points up from the screen toward the ceiling</li>
                            </ul>
                            <div className="flex justify-center mt-4 mb-2">
                              <img 
                                src={darkMode ? "/wireframe.v01.dark.mode.svg" : "/wireframe.v02.light.mode.svg"} 
                                alt="Phone axes wireframe diagram showing X, Y, and Z axes orientation" 
                                className="max-w-full h-auto max-h-64 opacity-80"
                              />
                            </div>
                          </div>
                          <div>
                            <strong className={`${darkMode ? 'text-gray-200' : 'text-gray-900'}`}>Alpha (Z-axis rotation):</strong>
                            <p className="ml-2">• <strong>Clockwise/counterclockwise</strong> rotation <strong>while phone remains flat</strong> (0°-360°)</p>
                            <p className="ml-2">• Like turning a lazy Susan</p>
                            <p className="ml-2">• Maps to <strong>SPAT X-axis</strong> (left/right movement)</p>
                          </div>
                          <div>
                            <strong className={`${darkMode ? 'text-gray-200' : 'text-gray-900'}`}>Beta (X-axis rotation):</strong>
                            <p className="ml-2">• Pitch: <strong>tilting</strong> phone <strong>up/down</strong> (-180° to 180°)</p>
                            <p className="ml-2">• Like nodding your head</p>
                            <p className="ml-2">• Maps to <strong>SPAT Z-axis</strong> (forward/back movement)</p>
                          </div>
                          <div>
                            <strong className={`${darkMode ? 'text-gray-200' : 'text-gray-900'}`}>Gamma (Y-axis rotation):</strong>
                            <p className="ml-2">• Roll: <strong>tilting</strong> phone <strong>left/right</strong> (-90° to 90°)</p>
                            <p className="ml-2">• Lifting the left or right edge of your phone while keep the other flat; as if to pour</p>
                            <p className="ml-2">• Maps to <strong>SPAT Y-axis</strong> (up/down movement)</p>
                          </div>
                          <p className={`text-xs mt-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            <em>Incremental movement deltas are sent via <strong>/source/N/x++</strong>, <strong>/source/N/y++</strong>, <strong>/source/N/z++</strong> OSC messages for responsive spatial audio control</em>
                          </p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* About ModeBloom Section */}
            <div>
              <button
                onClick={() => {
                  if (!aboutModeBloomExpanded) {
                    setAboutModeBloomExpanded(true);
                    setHowToUseExpanded(false);
                  } else {
                    setAboutModeBloomExpanded(false);
                  }
                }}
                className={`w-full px-4 py-3 text-left flex items-center justify-between hover:bg-opacity-50 transition-colors ${
                  darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-100'
                }`}
              >
                <h2 className={`text-lg font-bold ${darkMode ? 'text-gray-200' : 'text-gray-900'}`} style={{fontFamily: 'Florsn13, sans-serif'}}>
                  About ModeBloom
                </h2>
                <motion.div
                  animate={{ rotate: aboutModeBloomExpanded ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                  className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}
                >
                  <HiChevronDown className="w-6 h-6" />
                </motion.div>
              </button>
              <AnimatePresence>
                {aboutModeBloomExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <div className={`px-4 pb-4 space-y-3 ${darkMode ? 'text-gray-300' : 'text-gray-800'}`}>
                      <p>
                        ModeBloom is a <strong>mobile spatial audio controller</strong> that transforms your smartphone into a powerful interface for controlling <strong>immersive sonic experiences</strong>.
                      </p>
                      <p>
                        Using your device&apos;s built-in gyroscope, ModeBloom <strong>translates your physical movements into real-time controls</strong>, allowing you to intuitively move audio sources and cameras in a virtual 3D space managed by a network of controllers like this one. Interact with others running this same app!
                      </p>
                      <div className={`p-4 mt-4 ${
                        darkMode ? 'bg-gray-700' : 'bg-gray-100'
                      }`}>
                        <h3 className={`font-semibold mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-800'}`} style={{fontFamily: 'Florsn13, sans-serif'}}>Key Features:</h3>
                        <ul className="space-y-1 text-sm">
                          <li>• Real-time gyroscope ➜ spatial control</li>
                          <li>• OSC (Open Sound Control) messaging</li>
                          <li>• Immersive audio management</li>
                          <li>• Progressive Web App (PWA) technology</li>
                          <li>• Responsive interface design</li>
                        </ul>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      )}

      {/* OSC Settings Page */}
      {currentPage === 'osc' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="space-y-6"
        >
          <div className={`p-6 border ${
            darkMode 
              ? 'bg-gray-900 border-gray-700' 
              : 'bg-white border-gray-200'
          }`}>
            <h2 className={`text-xl sm:text-2xl font-bold mb-4 ${darkMode ? 'text-gray-200' : 'text-gray-900'}`} style={{fontFamily: 'Florsn13, sans-serif'}}>
              OSC Settings
            </h2>
            
            {/* QR Scanner Button */}
            <div className="mb-6">
              <button
                onClick={startQrScanner}
                className={`w-full font-black text-sm uppercase px-5 py-2.5 text-center transition-colors focus:ring-4 focus:outline-none border flex items-center justify-center space-x-2 ${
                  darkMode 
                    ? 'text-[#C4E538] border-[#C4E538] hover:text-black hover:bg-[#C4E538] focus:ring-[#C4E538]' 
                    : 'text-gray-700 border-gray-700 hover:text-black hover:bg-[#9ACD32] focus:ring-gray-300'
                }`}
                style={{fontFamily: 'Florsn13, sans-serif'}}
              >
                <HiQrcode className="w-5 h-5" />
                <span>Scan QR to Auto-Fill</span>
              </button>
            </div>
            
            <div className="space-y-6">
              <div className="relative">
                <input
                  id="oscHost"
                  type="text"
                  value={oscSettings.host}
                  onChange={(e) => setOscSettings({...oscSettings, host: e.target.value})}
                  className={`w-full px-4 py-4 border-2 rounded-lg focus:outline-none transition-all duration-300 peer ${
                    darkMode 
                      ? 'bg-gray-800/50 border-gray-600 text-white placeholder-transparent focus:border-purple-400 focus:shadow-lg focus:shadow-purple-400/25 hover:border-gray-500' 
                      : 'bg-white/50 border-gray-300 text-gray-900 placeholder-transparent focus:border-purple-500 focus:shadow-lg focus:shadow-purple-500/25 hover:border-gray-400'
                  }`}
                  placeholder="192.168.1.192"
                  required
                />
                <label 
                  htmlFor="oscHost" 
                  className={`absolute left-3 px-1 -top-1.5 text-xs font-medium transition-all duration-300 pointer-events-none ${
                    darkMode ? 'bg-gray-900 text-purple-300' : 'bg-white text-purple-500'
                  } peer-focus:text-purple-400`}
                >
                  Host IP Address
                </label>
                <p className={`text-xs mt-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  for the computer running the Max patch 
                </p>
              </div>
              <div className="relative">
                <input
                  id="oscPort"
                  type="text"
                  value={oscSettings.port}
                  onChange={(e) => setOscSettings({...oscSettings, port: e.target.value})}
                  className={`w-full px-4 py-4 border-2 rounded-lg focus:outline-none transition-all duration-300 peer ${
                    darkMode 
                      ? 'bg-gray-800/50 border-gray-600 text-white placeholder-transparent focus:border-purple-400 focus:shadow-lg focus:shadow-purple-400/25 hover:border-gray-500' 
                      : 'bg-white/50 border-gray-300 text-gray-900 placeholder-transparent focus:border-purple-500 focus:shadow-lg focus:shadow-purple-500/25 hover:border-gray-400'
                  }`}
                  placeholder="8081"
                  required
                />
                <label 
                  htmlFor="oscPort" 
                  className={`absolute left-3 px-1 -top-1.5 text-xs font-medium transition-all duration-300 pointer-events-none ${
                    darkMode ? 'bg-gray-900 text-purple-300' : 'bg-white text-purple-500'
                  } peer-focus:text-purple-400`}
                >
                  WebSocket Port (WS)
                </label>
                <p className={`text-xs mt-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  for local connections (default: 8081)
                </p>
              </div>
              <div className="relative">
                <input
                  id="oscSslPort"
                  type="text"
                  value={oscSettings.sslPort}
                  onChange={(e) => setOscSettings({...oscSettings, sslPort: e.target.value})}
                  className={`w-full px-4 py-4 border-2 rounded-lg focus:outline-none transition-all duration-300 peer ${
                    darkMode 
                      ? 'bg-gray-800/50 border-gray-600 text-white placeholder-transparent focus:border-purple-400 focus:shadow-lg focus:shadow-purple-400/25 hover:border-gray-500' 
                      : 'bg-white/50 border-gray-300 text-gray-900 placeholder-transparent focus:border-purple-500 focus:shadow-lg focus:shadow-purple-500/25 hover:border-gray-400'
                  }`}
                  placeholder="8443"
                  required
                />
                <label 
                  htmlFor="oscSslPort" 
                  className={`absolute left-3 px-1 -top-1.5 text-xs font-medium transition-all duration-300 pointer-events-none ${
                    darkMode ? 'bg-gray-900 text-purple-300' : 'bg-white text-purple-500'
                  } peer-focus:text-purple-400`}
                >
                  WebSocket SSL Port (WSS)
                </label>
                <p className={`text-xs mt-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  for HTTPS PWA connections (default: 8443)
                </p>
              </div>

              {/* Connect Button */}
              {!oscConnected && (
                <div className="mt-6">
                  <button
                    onClick={() => {
                      handleConnect();
                      // After connecting, redirect to main page
                      setTimeout(() => {
                        handlePageChange('main');
                      }, 2000);
                    }}
                    className={`w-full font-black text-sm uppercase px-5 py-2.5 text-center transition-colors focus:ring-4 focus:outline-none border ${
                      darkMode 
                        ? 'text-[#C4E538] border-[#C4E538] hover:text-black hover:bg-[#C4E538] focus:ring-[#C4E538]' 
                        : 'text-gray-700 border-gray-700 hover:text-black hover:bg-[#9ACD32] focus:ring-gray-300'
                    }`}
                    style={{fontFamily: 'Florsn13, sans-serif'}}
                  >
                    Connect
                  </button>
                </div>
              )}

              <div className={`p-4 ${
                darkMode ? 'bg-gray-800' : 'bg-gray-200'
              }`}>
                <h3 className={`font-semibold mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-800'}`} style={{fontFamily: 'Florsn13, sans-serif'}}>Connection Info:</h3>
                <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-800'}`}>
                  WebSocket Connection: <span className={`font-mono ${darkMode ? 'text-gray-300' : 'text-gray-800'}`} style={{fontVariantNumeric: 'oldstyle'}}>
                    {typeof window !== 'undefined' && window.location.protocol === 'https:' 
                      ? `wss://${oscSettings.host}:${oscSettings.sslPort}` 
                      : `ws://${oscSettings.host}:${oscSettings.port}`}
                  </span>
                </p>
                <p className={`text-xs mt-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Device ID: <span className="font-mono">{deviceId}</span>
                </p>
                <p className={`text-xs mt-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  This controller uses <strong>one streamlined WebSocket connection</strong> that handles all OSC communication via a bridge script.
                </p>
                {/* <p className={`text-xs mt-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  • Announces as: <span className="font-mono">/controller/announce</span>
                </p>
                <p className={`text-xs mt-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  • Sends device label as: <span className="font-mono">/controller/{deviceId}/label</span>
                </p>
                <p className={`text-xs mt-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  • Sends gyroscope data as: <span className="font-mono">/source/N/xyz</span>
                </p> */}

              </div>
              
              {/* Connect Button */}
              {/* {!oscConnected && (
                <div className="mt-6">
                  <button
                    onClick={() => {
                      handleConnect();
                      // After connecting, redirect to main page
                      setTimeout(() => {
                        handlePageChange('main');
                      }, 2000);
                    }}
                    className={`w-full font-black text-sm uppercase px-5 py-2.5 text-center transition-colors focus:ring-4 focus:outline-none border ${
                      darkMode 
                        ? 'text-[#C4E538] border-[#C4E538] hover:text-black hover:bg-[#C4E538] focus:ring-[#C4E538]' 
                        : 'text-gray-700 border-gray-700 hover:text-black hover:bg-[#9ACD32] focus:ring-gray-300'
                    }`}
                    style={{fontFamily: 'Florsn13, sans-serif'}}
                  >
                    Connect
                  </button>
                </div>
              )} */}
            </div>
          </div>
        </motion.div>
      )}

      {/* OSC Activity Page */}
      {currentPage === 'osclog' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="space-y-6"
        >
          <div className={`p-4 border ${
            darkMode 
              ? 'bg-gray-900 border-gray-700' 
              : 'bg-white border-gray-200'
          }`}>
            <div className="flex items-center justify-between mb-4">
              <h2 className={`text-2xl font-bold ${darkMode ? 'text-gray-200' : 'text-gray-900'}`} style={{fontFamily: 'Florsn13, sans-serif'}}>
                OSC
              </h2>
              <div className="flex space-x-2">
                <button
                  onClick={() => setOscLogEnabled(!oscLogEnabled)}
                  className={`px-3 py-1 text-xs transition-colors border focus:ring-2 focus:outline-none font-medium uppercase ${
                    oscLogEnabled
                      ? darkMode ? 'bg-[#C4E538] text-black border-[#C4E538]' : 'bg-gray-800 text-white border-gray-800'
                      : darkMode 
                        ? 'text-gray-300 border-gray-600 hover:text-black hover:bg-[#C4E538] focus:ring-[#C4E538]' 
                        : 'text-gray-700 border-gray-700 hover:text-black hover:bg-[#9ACD32] focus:ring-gray-300'
                  }`}
                  style={{fontFamily: 'Florsn13, sans-serif'}}
                >
                  {oscLogEnabled ? 'Disable Log' : 'Enable Log'}
                </button>
                <button
                  onClick={() => setOscLogMessages([])}
                  className={`px-3 py-1 text-xs transition-colors border focus:ring-2 focus:outline-none font-medium uppercase ${
                    darkMode 
                      ? 'text-gray-300 border-gray-600 hover:text-black hover:bg-[#C4E538] focus:ring-[#C4E538]' 
                      : 'text-gray-700 border-gray-700 hover:text-black hover:bg-[#9ACD32] focus:ring-gray-300'
                  }`}
                  style={{fontFamily: 'Florsn13, sans-serif'}}
                >
                  Clear Log
                </button>
              </div>
            </div>
            
            <div className={`h-96 overflow-y-auto p-4 border font-mono text-sm ${
              darkMode 
                ? 'bg-black border-gray-600' 
                : 'bg-gray-50 border-gray-300'
            }`}>
              {oscLogMessages.length === 0 ? (
                <div className={`text-center py-8 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                  <p>No OSC activity yet...</p>
                  <p className="text-xs mt-2">Connect and start controlling to see messages</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {oscLogMessages.map((message, index) => {
                    // Color-code messages based on content
                    let colorClass = darkMode ? 'text-gray-300' : 'text-gray-800'; // default
                    
                    if (message.includes('✅') || message.includes('Successfully connected')) {
                      colorClass = darkMode ? 'text-green-400' : 'text-green-600';
                    } else if (message.includes('❌') || message.includes('Failed') || message.includes('Error')) {
                      colorClass = darkMode ? 'text-red-400' : 'text-red-600';
                    } else if (message.includes('⚠️') || message.includes('Warning') || message.includes('Cannot send')) {
                      colorClass = darkMode ? 'text-yellow-400' : 'text-yellow-600';
                    } else if (message.includes('📤') || message.includes('Sent (binary)')) {
                      colorClass = darkMode ? 'text-blue-400' : 'text-blue-600';
                    } else if (message.includes('📱') || message.includes('🏷️')) {
                      colorClass = darkMode ? 'text-purple-400' : 'text-purple-600';
                    }
                    
                    return (
                      <div key={index} className={`whitespace-pre-wrap ${colorClass}`}>
                        {message}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* OSC Message Key */}
          <div className={`border ${
            darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-200 border-gray-200'
          }`}>
            {/* Message Key Accordion */}
            <button
              onClick={() => setShowMessageKey(!showMessageKey)}
              className={`w-full px-4 py-2 text-left flex items-center justify-between hover:${
                darkMode ? 'bg-gray-700' : 'bg-gray-300'
              } transition-colors`}
            >
              <h3 className={`font-semibold text-sm ${darkMode ? 'text-gray-300' : 'text-gray-800'}`} style={{fontFamily: 'Florsn13, sans-serif'}}>
                OSC Message Key
              </h3>
              <span className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                <HiChevronDown className={`w-5 h-5 transition-transform duration-200 ${showMessageKey ? 'rotate-180' : ''}`} />
              </span>
            </button>
            {showMessageKey && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="px-4 pb-4"
              >
                <div className={`grid grid-cols-1 gap-3 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-800'}`}>
                  <div className="flex items-center space-x-2">
                    <span className="font-mono">📱</span>
                    <span><strong>Controller connected:</strong> Device announcement</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="font-mono">🏷️</span>
                    <span><strong>Controller label:</strong> Device naming updates</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="font-mono">📤</span>
                    <span><strong>Sent (binary):</strong> Outgoing OSC &#8594; Max, renderer</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="font-mono">✅</span>
                    <span><strong>Success:</strong> WebSocket connected !</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="font-mono">❌</span>
                    <span><strong>Error:</strong> Connection issues, failed operations</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="font-mono">⚠️</span>
                    <span><strong>Warning:</strong> Non-critical issues, notifications</span>
                  </div>
                </div>
              </motion.div>
            )}
            
            {/* Color Coding Accordion */}
            <button
              onClick={() => setShowColorKey(!showColorKey)}
              className={`w-full px-4 py-2 text-left flex items-center justify-between hover:${
                darkMode ? 'bg-gray-700' : 'bg-gray-300'
              } transition-colors border-t ${
                darkMode ? 'border-gray-600' : 'border-gray-300'
              }`}
            >
              <h4 className={`font-semibold text-sm ${darkMode ? 'text-gray-300' : 'text-gray-800'}`} style={{fontFamily: 'Florsn13, sans-serif'}}>
                Color Coding
              </h4>
              <span className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                <HiChevronDown className={`w-5 h-5 transition-transform duration-200 ${showColorKey ? 'rotate-180' : ''}`} />
              </span>
            </button>
            {showColorKey && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="px-4 pb-4"
              >
                <div className={`grid grid-cols-1 gap-2 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-800'}`}>
                  <div className="flex items-center space-x-2">
                    <span className="font-mono">🟢</span>
                    <span><strong>Green</strong>: Successs (✅ Connected)</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="font-mono">🔴</span>
                    <span><strong>Red</strong>: Failures, Errors (❌ Failed, Error)</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="font-mono">🟡</span>
                    <span><strong>Yellow</strong>: Warnings (⚠️ Warning, Cannot send)</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="font-mono">🔵</span>
                    <span><strong>Blue</strong>: Sent messages (📤 Sent (binary))</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="font-mono">🟣</span>
                    <span><strong>Purple</strong>: Device msgs. (📱 controller, 🏷️ label)</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="font-mono">⚪</span>
                    <span><strong>Gray</strong>: Default/neutral msgs.</span>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>
      )}

      {/* Credits Page */}
      {currentPage === 'credits' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="space-y-6"
        >
          <div className={`border ${
            darkMode 
              ? 'bg-gray-900 border-gray-700' 
              : 'bg-white border-gray-200'
          }`}>
            
            {/* Credits Section */}
            <div className={`border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <button
                onClick={() => {
                  if (!creditsExpanded) {
                    setCreditsExpanded(true);
                    setTermsOfServiceExpanded(false);
                    setAttributionsExpanded(false);
                  } else {
                    setCreditsExpanded(false);
                  }
                }}
                className={`w-full px-4 py-3 text-left flex items-center justify-between hover:bg-opacity-50 transition-colors ${
                  darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-100'
                }`}
              >
                <h2 className={`text-lg font-bold ${darkMode ? 'text-gray-200' : 'text-gray-900'}`} style={{fontFamily: 'Florsn13, sans-serif'}}>
                  Credits
                </h2>
                <motion.div
                  animate={{ rotate: creditsExpanded ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                  className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}
                >
                  <HiChevronDown className="w-6 h-6" />
                </motion.div>
              </button>
              <AnimatePresence>
                {creditsExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <div className={`px-4 pb-4 space-y-4 ${darkMode ? 'text-gray-300' : 'text-gray-800'}`}>
                      <div className={`p-4 ${
                        darkMode ? 'bg-gray-800' : 'bg-gray-200'
                      }`}>
                        <h3 className={`font-semibold mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-800'}`} style={{fontFamily: 'Florsn13, sans-serif'}}>Development</h3>
                        <p className={`${darkMode ? 'text-gray-300' : 'text-gray-800'}`}>
                          Built by <a 
                            href="https://louisgoldford.com" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className={`font-semibold transition-colors underline ${
                              darkMode ? 'text-[#C4E538] hover:text-[#C4E538]/80' : 'text-[#9ACD32] hover:text-[#7CB342]'
                            }`}
                          >
                            Louis Goldford
                          </a>
                        </p>
                        <p className={`text-sm mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          composer + creative technologist
                        </p>
                      </div>
                      <div className={`p-4 ${
                        darkMode ? 'bg-gray-800' : 'bg-gray-200'
                      }`}>
                        <h3 className={`font-semibold mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-800'}`} style={{fontFamily: 'Florsn13, sans-serif'}}>License</h3>
                        <div className={`text-sm space-y-2 ${darkMode ? 'text-gray-300' : 'text-gray-800'}`}>
                          <p style={{fontVariantNumeric: 'oldstyle'}}>© 2025 Louis Goldford. All rights reserved.</p>
                        </div>
                      </div>
                      <div className={`p-4 ${
                        darkMode ? 'bg-gray-800' : 'bg-gray-200'
                      }`}>
                        <h3 className={`font-semibold mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-800'}`} style={{fontFamily: 'Florsn13, sans-serif'}}>Version</h3>
                        <p className={`${darkMode ? 'text-gray-300' : 'text-gray-800'}`} style={{fontVariantNumeric: 'oldstyle'}}>ModeBloom v0.0.1</p>
                        <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          <em>Built with ❤️ for immersive sonic experiences.</em>
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Terms of Service Section */}
            <div className={`border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <button
                onClick={() => {
                  if (!termsOfServiceExpanded) {
                    setTermsOfServiceExpanded(true);
                    setCreditsExpanded(false);
                    setAttributionsExpanded(false);
                  } else {
                    setTermsOfServiceExpanded(false);
                  }
                }}
                className={`w-full px-4 py-3 text-left flex items-center justify-between hover:bg-opacity-50 transition-colors ${
                  darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-100'
                }`}
              >
                <h2 className={`text-lg font-bold ${darkMode ? 'text-gray-200' : 'text-gray-900'}`} style={{fontFamily: 'Florsn13, sans-serif'}}>
                  Terms of Service
                </h2>
                <motion.div
                  animate={{ rotate: termsOfServiceExpanded ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                  className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}
                >
                  <HiChevronDown className="w-6 h-6" />
                </motion.div>
              </button>
              <AnimatePresence>
                {termsOfServiceExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <div className={`px-4 pb-4 ${darkMode ? 'text-gray-300' : 'text-gray-800'}`}>
                      <div className="p-6 overflow-y-auto max-h-[calc(60vh-120px)]">
                        <div className={`prose ${darkMode ? 'prose-invert' : ''} max-w-none text-sm`}>
                          <div className={`space-y-4 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                            <div className="mb-4">
                              <p><strong>Effective Date:</strong> July 20, 2025</p>
                              <p><strong>Developer:</strong> Louis Goldford</p>
                              <p><strong>App Type:</strong> Progressive Web App (PWA) with OSC-over-SSL and WebSocket-based connectivity</p>
                              <p><strong>License:</strong> Non-commercial, All Rights Reserved</p>
                            </div>
                            
                            <h4 className={`font-semibold mt-6 mb-2 ${darkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                              1. Acceptance of Terms
                            </h4>
                            <p>
                              By using this application, you agree to these Terms of Service and the accompanying{' '}
                              <button
                                onClick={() => {
                                  setShowTermsOfService(false);
                                  setShowPrivacyPolicy(true);
                                }}
                                className={`underline transition-colors ${
                                  darkMode 
                                    ? 'text-purple-300 hover:text-purple-400' 
                                    : 'text-purple-600 hover:text-purple-700'
                                }`}
                              >
                                Privacy Policy
                              </button>
                              . If you do not agree, please do not use the app.
                            </p>
                            
                            <p className="text-xs mt-4 text-center opacity-60">
                              <button
                                onClick={() => setShowTermsOfService(true)}
                                className={`underline transition-colors ${
                                  darkMode 
                                    ? 'text-purple-300 hover:text-purple-400' 
                                    : 'text-purple-600 hover:text-purple-700'
                                }`}
                              >
                                View Full Terms of Service
                              </button>
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Attributions Section */}
            <div>
              <button
                onClick={() => {
                  if (!attributionsExpanded) {
                    setAttributionsExpanded(true);
                    setCreditsExpanded(false);
                    setTermsOfServiceExpanded(false);
                  } else {
                    setAttributionsExpanded(false);
                  }
                }}
                className={`w-full px-4 py-3 text-left flex items-center justify-between hover:bg-opacity-50 transition-colors ${
                  darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-100'
                }`}
              >
                <h2 className={`text-lg font-bold ${darkMode ? 'text-gray-200' : 'text-gray-900'}`} style={{fontFamily: 'Florsn13, sans-serif'}}>
                  Attributions
                </h2>
                <motion.div
                  animate={{ rotate: attributionsExpanded ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                  className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}
                >
                  <HiChevronDown className="w-6 h-6" />
                </motion.div>
              </button>
              <AnimatePresence>
                {attributionsExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <div className={`px-4 pb-4 space-y-4 ${darkMode ? 'text-gray-300' : 'text-gray-800'}`}>
                      <div className={`p-4 ${
                        darkMode ? 'bg-gray-800' : 'bg-gray-200'
                      }`}>
                        <h3 className={`font-semibold mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-800'}`} style={{fontFamily: 'Florsn13, sans-serif'}}>Third-Party Assets</h3>
                        <div className={`text-sm space-y-3 ${darkMode ? 'text-gray-300' : 'text-gray-800'}`}>
                          
                          <div className="space-y-3">
                            <h4 className={`font-medium ${darkMode ? 'text-gray-200' : 'text-gray-900'}`}>3D Models</h4>
                            <div className="ml-2 space-y-2">
                              <div>
                                <strong>&quot;Male Head&quot; Model</strong><br/>
                                <span className="text-xs">by Alexander Antipov | <a href="https://skfb.ly/6uKGM" className="underline">https://skfb.ly/6uKGM</a></span><br/>
                                <span className="text-xs opacity-80">License: Creative Commons Attribution (CC BY 4.0)</span><br/>
                                <span className="text-xs opacity-60">Used to visualize the listener&apos;s head with orientation indicators</span>
                              </div>
                              <div>
                                <strong>&quot;Yamaha HS5 Studio Monitor&quot; Model</strong><br/>
                                <span className="text-xs">by Ivan_WSK | <a href="https://skfb.ly/osqu7" className="underline">https://skfb.ly/osqu7</a></span><br/>
                                <span className="text-xs opacity-80">License: Creative Commons Attribution (CC BY 4.0)</span><br/>
                                <span className="text-xs opacity-60">Used as speaker models in the 3D scene</span>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-3">
                            <h4 className={`font-medium ${darkMode ? 'text-gray-200' : 'text-gray-900'}`}>Skybox Environments</h4>
                            <div className="ml-2">
                              <div>
                                <strong>Penguins Skybox Pack (45+ environments)</strong><br/>
                                <span className="text-xs">by Zachery &quot;skiingpenguins&quot; Slocum | freezurbern@gmail.com</span><br/>
                                <span className="text-xs">Website: <a href="http://www.freezurbern.com" className="underline">www.freezurbern.com</a></span><br/>
                                <span className="text-xs opacity-80">License: Creative Commons Attribution-ShareAlike 3.0 Unported</span><br/>
                                <span className="text-xs opacity-60">Originally created for Cube 2: Sauerbraten engine</span>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-3">
                            <h4 className={`font-medium ${darkMode ? 'text-gray-200' : 'text-gray-900'}`}>Mobile App Libraries</h4>
                            <div className="ml-2 space-y-2">
                              <div>
                                <strong>Font:</strong> Florsn13 Custom Typeface<br/>
                                <span className="text-xs opacity-60">Custom typography used throughout the interface</span>
                              </div>
                              <div>
                                <strong>Icons:</strong> Heroicons<br/>
                                <span className="text-xs opacity-80">License: MIT License</span><br/>
                                <span className="text-xs opacity-60">Beautiful hand-crafted SVG icons</span>
                              </div>
                              <div>
                                <strong>OSC Library:</strong> osc-js<br/>
                                <span className="text-xs opacity-60">Open Sound Control protocol implementation</span>
                              </div>
                              <div>
                                <strong>QR Scanner:</strong> qr-scanner<br/>
                                <span className="text-xs opacity-60">Client-side QR code scanning library</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      )}
        </motion.div>
      )}

      {/* QR Scanner Modal Overlay */}
      {showQrScanner && (
        <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className={`w-full max-w-md ${
              darkMode 
                ? 'bg-gray-900 border-gray-700' 
                : 'bg-white border-gray-200'
            } border p-6 max-h-[90vh] overflow-y-auto`}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className={`text-xl font-bold ${darkMode ? 'text-gray-200' : 'text-gray-900'}`} style={{fontFamily: 'Florsn13, sans-serif'}}>
                QR Code Scanner
              </h2>
              <button
                onClick={stopQrScanner}
                className={`p-2 transition-colors border focus:ring-2 focus:outline-none rounded ${
                  darkMode 
                    ? 'text-gray-300 border-gray-600 hover:text-black hover:bg-[#C4E538] focus:ring-[#C4E538]' 
                    : 'text-gray-700 border-gray-700 hover:text-black hover:bg-[#9ACD32] focus:ring-gray-300'
                }`}
              >
                <HiX className="w-5 h-5" />
              </button>
            </div>
            
            <div className={`text-sm mb-4 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Point your camera at the QR code displayed on the <strong>projector screen</strong> to automatically configure your connection settings.
            </div>
            
            {/* QR Scanner Container */}
            <div 
              id="qr-reader" 
              className={`w-full overflow-hidden ${darkMode ? 'bg-gray-800' : 'bg-gray-100'}`}
              style={{ minHeight: '300px' }}
            ></div>
            
            <div className={`text-xs mt-4 text-center ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
              Make sure to allow camera access when prompted
            </div>
          </motion.div>
        </div>
      )}

      {/* Privacy Policy Modal Overlay */}
      {showPrivacyPolicy && (
        <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4">
          <motion.div
            key="privacy-policy"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className={`w-full max-w-2xl ${
              darkMode 
                ? 'bg-gray-900 border-gray-700' 
                : 'bg-white border-gray-200'
            } border max-h-[90vh] overflow-hidden`}
          >
            <div className={`flex items-center justify-between p-6 border-b ${
              darkMode ? 'border-gray-700' : 'border-gray-200'
            }`}>
              <h2 className={`text-xl font-bold ${darkMode ? 'text-gray-200' : 'text-gray-900'}`} style={{fontFamily: 'Florsn13, sans-serif'}}>
                Privacy Policy
              </h2>
              <button
                onClick={() => setShowPrivacyPolicy(false)}
                className={`p-2 transition-colors border focus:ring-2 focus:outline-none rounded ${
                  darkMode 
                    ? 'text-gray-300 border-gray-600 hover:text-black hover:bg-[#C4E538] focus:ring-[#C4E538]' 
                    : 'text-gray-700 border-gray-700 hover:text-black hover:bg-[#9ACD32] focus:ring-gray-300'
                }`}
              >
                <HiX className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              <div className={`prose ${darkMode ? 'prose-invert' : ''} max-w-none text-sm`}>
                <h3 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                  ModeBloom Privacy Policy
                </h3>
                
                <div className={`space-y-4 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  <p><strong>Last updated:</strong> July 2025</p>
                  
                  <h4 className={`font-semibold mt-6 mb-2 ${darkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                    Information We Collect
                  </h4>
                  <p>
                    ModeBloom is designed with privacy in mind. We collect minimal information necessary for the application to function:
                  </p>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>Device orientation data (gyroscope) used locally for audio control</li>
                    <li>Optional device labels you provide for identification within the session</li>
                    <li>Local session data stored in your browser</li>
                  </ul>
                  
                  <h4 className={`font-semibold mt-6 mb-2 ${darkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                    How We Use Information
                  </h4>
                  <p>
                    All data processing occurs locally on your device or within your local network:
                  </p>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>Gyroscope data is transmitted in real-time to control spatial audio positioning</li>
                    <li>Device labels are sent to identify your controller in the audio system</li>
                    <li>No personal data is transmitted to external servers</li>
                  </ul>
                  
                  <h4 className={`font-semibold mt-6 mb-2 ${darkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                    Data Storage and Security
                  </h4>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>Authentication data is stored locally in your browser</li>
                    <li>No user data is permanently stored on external servers</li>
                    <li>All communications occur over your local network or secure WebSocket connections</li>
                    <li>Session data is cleared when you log out or close the application</li>
                  </ul>
                  
                  <h4 className={`font-semibold mt-6 mb-2 ${darkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                    Third-Party Services
                  </h4>
                  <p>
                    ModeBloom operates independently and does not integrate with third-party analytics, advertising, or data collection services.
                  </p>
                  
                  <h4 className={`font-semibold mt-6 mb-2 ${darkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                    Your Rights
                  </h4>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>You can clear all local data by logging out or clearing your browser data</li>
                    <li>You can stop gyroscope data transmission by disconnecting from the session</li>
                    <li>You have full control over what device label information you provide</li>
                  </ul>
                  
                  {/* <h4 className={`font-semibold mt-6 mb-2 ${darkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                    Contact
                  </h4> */}
                  {/* <p>
                    For questions about this privacy policy or ModeBloom, contact:{' '}
                    <a 
                      href="mailto:louis.goldford@gmail.com" 
                      className={`underline ${darkMode ? 'text-purple-300' : 'text-purple-600'}`}
                    >
                      louis.goldford@gmail.com
                    </a>
                  </p> */}
                  
                  <p className="text-xs mt-8 pt-4 border-t border-gray-300">
                    ModeBloom is developed by Louis Goldford and designed to respect your privacy while providing immersive spatial audio control.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Terms of Service Modal Overlay */}
      {showTermsOfService && (
        <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4">
          <motion.div
            key="terms-of-service"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className={`w-full max-w-2xl ${
              darkMode 
                ? 'bg-gray-900 border-gray-700' 
                : 'bg-white border-gray-200'
            } border max-h-[90vh] overflow-hidden`}
          >
            <div className={`flex items-center justify-between p-6 border-b ${
              darkMode ? 'border-gray-700' : 'border-gray-200'
            }`}>
              <h2 className={`text-xl font-bold ${darkMode ? 'text-gray-200' : 'text-gray-900'}`} style={{fontFamily: 'Florsn13, sans-serif'}}>
                Terms of Service
              </h2>
              <button
                onClick={() => setShowTermsOfService(false)}
                className={`p-2 transition-colors border focus:ring-2 focus:outline-none rounded ${
                  darkMode 
                    ? 'text-gray-300 border-gray-600 hover:text-black hover:bg-[#C4E538] focus:ring-[#C4E538]' 
                    : 'text-gray-700 border-gray-700 hover:text-black hover:bg-[#9ACD32] focus:ring-gray-300'
                }`}
              >
                <HiX className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              <div className={`prose ${darkMode ? 'prose-invert' : ''} max-w-none text-sm`}>
                <div className={`space-y-4 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  <div className="mb-4">
                    <h3 className={`text-xl font-bold mb-2 ${darkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                      Terms of Service
                    </h3>
                    <p><strong>Effective Date:</strong> July 20, 2025</p>
                    <p><strong>Developer:</strong> Louis Goldford</p>
                    <p><strong>App Type:</strong> Progressive Web App (PWA) with OSC-over-SSL and WebSocket-based connectivity</p>
                    <p><strong>License:</strong> Non-commercial, All Rights Reserved</p>
                  </div>
                  
                  <h4 className={`font-semibold mt-6 mb-2 ${darkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                    1. Acceptance of Terms
                  </h4>
                  <p>
                    By using this application, you agree to these Terms of Service and the accompanying{' '}
                    <button
                      onClick={() => {
                        setShowTermsOfService(false);
                        setShowPrivacyPolicy(true);
                      }}
                      className={`underline transition-colors ${
                        darkMode 
                          ? 'text-purple-300 hover:text-purple-400' 
                          : 'text-purple-600 hover:text-purple-700'
                      }`}
                    >
                      Privacy Policy
                    </button>
                    . If you do not agree, please do not use the app.
                  </p>
                  
                  <h4 className={`font-semibold mt-6 mb-2 ${darkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                    2. License and Usage Restrictions
                  </h4>
                  <p>
                    This app is licensed, not sold. You are granted a limited, non-transferable, revocable license to use the app for non-commercial, personal, or educational purposes only.
                  </p>
                  <p>You may not:</p>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>Copy, modify, reverse-engineer, or create derivative works of the app</li>
                    <li>Use this app in any commercial setting</li>
                    <li>Redistribute or sublicense the app or any of its components</li>
                    <li>Attempt to bypass, interfere with, or exploit the SSL or OSC communication layers</li>
                  </ul>
                  
                  <h4 className={`font-semibold mt-6 mb-2 ${darkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                    3. Ownership and Intellectual Property
                  </h4>
                  <p>
                    All code, UI/UX design, original content, and logic within the app are the intellectual property of Louis Goldford.
                    All rights are reserved unless otherwise explicitly stated.
                  </p>
                  <p>
                    Third-party assets (e.g., fonts, sounds, or images) are used in compliance with their licenses and are credited on the Credits Page.
                  </p>
                  
                  <h4 className={`font-semibold mt-6 mb-2 ${darkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                    4. Service Connectivity
                  </h4>
                  <p>
                    This application connects to external servers using secure protocols, including HTTPS, WebSocket (WSS), and SSL-tunneled Open Sound Control (OSC). These communication channels may transmit real-time control signals, interface data, or configuration parameters.
                  </p>
                  <p>You agree not to:</p>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>Interfere with, inspect, or reverse-engineer any part of these communication protocols</li>
                    <li>Overload or flood the system with automated or excessive requests</li>
                    <li>Attempt to bypass security layers or SSL tunnels</li>
                    <li>Use the app in a way that degrades service for others</li>
                  </ul>
                  <p>The developer reserves the right to:</p>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>Rate-limit or block access from abusive clients or IP addresses</li>
                    <li>Modify or discontinue service endpoints at any time</li>
                    <li>Terminate access to the app or backend services without notice in response to misuse</li>
                  </ul>
                  <p>
                    This real-time infrastructure is provided &quot;as is,&quot; without guarantees of uptime, latency, or performance. You use it at your own risk.
                  </p>
                  
                  <h4 className={`font-semibold mt-6 mb-2 ${darkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                    5. Termination
                  </h4>
                  <p>
                    The developer reserves the right to terminate or restrict access to the service at any time for any reason, including suspected abuse of the protocol or violation of these terms.
                  </p>
                  
                  <h4 className={`font-semibold mt-6 mb-2 ${darkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                    6. Limitation of Liability
                  </h4>
                  <p>
                    This app is provided &quot;as is&quot; without warranties of any kind.
                    The developer shall not be liable for any direct, indirect, incidental, or consequential damages arising out of the use of or inability to use the service.
                  </p>
                  
                  <h4 className={`font-semibold mt-6 mb-2 ${darkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                    7. Governing Law
                  </h4>
                  <p>
                    These Terms shall be governed by and construed in accordance with the laws of the State of Maine and the State of New York, without regard to conflict of law provisions.
                    If you are accessing this app from outside the United States, you do so at your own initiative and are responsible for compliance with local laws.
                    Any disputes arising from these terms or this app may be brought in the courts of either U.S. state and shall be subject to their jurisdiction, unless otherwise required by mandatory local law.
                  </p>
                  
                  <h4 className={`font-semibold mt-6 mb-2 ${darkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                    8. Contact
                  </h4>
                  <p>
                    For questions or concerns, please contact:
                    Louis Goldford
                  </p>
                  
                  <h4 className={`font-semibold mt-6 mb-2 ${darkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                    9. Updates
                  </h4>
                  <p>
                    These terms may be updated from time to time. Continued use of the app constitutes acceptance of the revised terms.
                  </p>
                  
                  <h4 className={`font-semibold mt-6 mb-2 ${darkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                    10. Third-Party Licenses
                  </h4>
                  <p>
                    This app uses third-party components under various licenses. See the Credits Page for full details.
                  </p>
                  
                  <h4 className={`font-semibold mt-6 mb-2 ${darkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                    11. Experimental / Academic Use Disclaimer
                  </h4>
                  <p>
                    This application is intended for exploratory, artistic, and academic purposes. It may contain experimental features or technologies that are in development, untested, or unstable.
                    No warranty is provided for correctness, availability, or fitness for any particular purpose. Use with discretion.
                  </p>
                  
                  <h4 className={`font-semibold mt-6 mb-2 ${darkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                    12. Prohibition on AI-Assisted Analysis and Derivative Modeling
                  </h4>
                  <p>
                    You may not submit, transmit, upload, describe, or expose any portion of this application — including its source code, compiled output, interface behavior, architecture, visual design, or real-time communication methods — to any artificial intelligence system, language model, or automated analysis tool, whether publicly accessible or privately hosted.
                  </p>
                  <p>This includes (but is not limited to):</p>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>OpenAI&apos;s GPT models</li>
                    <li>Anthropic&apos;s Claude</li>
                    <li>Google Gemini (formerly Bard)</li>
                    <li>DeepSeek</li>
                    <li>Meta&apos;s LLaMA</li>
                    <li>Perplexity</li>
                    <li>Any present or future LLM, code interpreter, or generative agent capable of producing derivatives, summaries, or mimicry</li>
                  </ul>
                  <p>You may not:</p>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>Use AI agents to reverse-engineer, clone, or re-implement this app</li>
                    <li>Prompt or instruct models to imitate its behavior or visual design</li>
                    <li>Feed scraped or decompiled code into AI tools, regardless of intent</li>
                  </ul>
                  <p>
                    Such use constitutes unauthorized reverse engineering and a material breach of this agreement.
                    The developer reserves the right to revoke access, pursue legal action, and take other appropriate remedies in response to violations of this clause.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>

    {/* PWA Install Prompt Overlay - Separate AnimatePresence */}
    <AnimatePresence>
      {showInstallPrompt && !isStandalone && (
        <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <motion.div
            key="install-prompt"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className={`w-full max-w-sm ${
              darkMode 
                ? 'bg-gray-900 border-gray-700' 
                : 'bg-white border-gray-200'
            } border shadow-2xl overflow-hidden my-4`}
          >
            {/* Header */}
            <div className={`px-4 py-3 border-b ${
              darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'
            }`}>
              <div className="flex items-center space-x-3 mb-1">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  darkMode ? 'bg-[#C4E538] text-black' : 'bg-[#9ACD32] text-white'
                }`}>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
                  </svg>
                </div>
                <h2 className={`text-lg font-bold ${darkMode ? 'text-gray-200' : 'text-gray-900'}`} style={{fontFamily: 'Florsn13, sans-serif'}}>
                  Install ModeBloom
                </h2>
              </div>
              {/* <p className={`text-xs text-center ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                For the best performance
              </p> */}
            </div>

            {/* Content */}
            <div className="p-4">
              <div className={`space-y-3 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                <div className="text-center">
                  <p className="text-xs mb-3">
                    <strong>Add ModeBloom to your home screen</strong> for a better app experience — faster loading, better performance.
                  </p>
                </div>

                {/* iOS Safari Instructions */}
                <div className={`p-3 ${
                  darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-100 border-gray-200'
                } border`}>
                  <div className="flex items-start space-x-3">
                    <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      darkMode ? 'bg-[#C4E538] text-black' : 'bg-[#9ACD32] text-white'
                    }`}>
                      1
                    </div>
                    <div className="text-sm">
                      <p className="font-medium mb-1">Tap the <strong>Share</strong> button</p>
                      <p className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        Look for<span className="inline-flex items-center mx-1">
                          <IoShareOutline className="w-3 h-3" />
                        </span>at the bottom of Safari
                      </p>
                    </div>
                  </div>
                </div>

                <div className={`p-3 ${
                  darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-100 border-gray-200'
                } border`}>
                  <div className="flex items-center space-x-3">
                    <div className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                      darkMode ? 'bg-[#C4E538] text-black' : 'bg-[#9ACD32] text-white'
                    }`}>
                      2
                    </div>
                    <div className="text-sm">
                      <p className="font-medium">Select <strong>Add to Home Screen</strong><span className="inline-flex items-center mx-1">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                            <rect x="3" y="3" width="18" height="18" rx="3" ry="3" fill="none" stroke="currentColor" strokeWidth="2"/>
                            <path d="M12 8v8M8 12h8" stroke="currentColor" strokeWidth="2"/>
                          </svg>
                        </span></p>
                    </div>
                  </div>
                </div>

                <div className={`p-3 ${
                  darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-100 border-gray-200'
                } border`}>
                  <div className="flex items-center space-x-3">
                    <div className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                      darkMode ? 'bg-[#C4E538] text-black' : 'bg-[#9ACD32] text-white'
                    }`}>
                      3
                    </div>
                    <div className="text-sm">
                      <p className="font-medium">Tap <strong>Add</strong> to install</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Animated Arrow Pointing to Share Button */}
              <div className="text-center mt-6">
                <p className={`text-sm font-medium mb-4 ${darkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                  Ready? Look for the <strong>Share</strong> button below. 👇
                </p>
                <div className="flex justify-center">
                  <motion.div
                    animate={{ 
                      y: [0, 12, 0],
                      scale: [1.2, 1.4, 1.2],
                      opacity: [0.8, 1, 0.8]
                    }}
                    transition={{ 
                      duration: 1.8, 
                      repeat: Infinity, 
                      ease: "easeInOut",
                      times: [0, 0.5, 1]
                    }}
                    className="drop-shadow-lg"
                  >
                    <motion.svg 
                      className="w-12 h-12" 
                      fill="currentColor" 
                      viewBox="0 0 24 24"
                      animate={{ 
                        rotate: [0, 2, -2, 0],
                        color: darkMode 
                          ? ['#C4E538', '#E5FF40', '#C4E538'] 
                          : ['#9ACD32', '#ADFF2F', '#9ACD32']
                      }}
                      transition={{ 
                        duration: 2.5, 
                        repeat: Infinity, 
                        ease: "easeInOut" 
                      }}
                      style={{
                        color: darkMode ? '#C4E538' : '#9ACD32'
                      }}
                    >
                      <path d="M12 16l-6-6h4V4h4v6h4l-6 6z"/>
                    </motion.svg>
                  </motion.div>
                </div>
                <p className={`text-xs mt-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Tap the <strong>share</strong> icon at the bottom of Safari.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col space-y-3 mt-6">
                <button
                  onClick={() => {
                    setShowInstallPrompt(false);
                  }}
                  className={`w-full font-black text-sm uppercase px-5 py-2.5 text-center transition-colors focus:ring-4 focus:outline-none border ${
                    darkMode
                      ? 'text-gray-400 border-gray-600 hover:text-gray-300 hover:bg-gray-700 focus:ring-gray-500'
                      : 'text-gray-600 border-gray-400 hover:text-gray-700 hover:bg-gray-200 focus:ring-gray-300'
                  }`}
                  style={{fontFamily: 'Florsn13, sans-serif'}}
                >
                  Maybe Later
                </button>
                
                <button
                  onClick={() => {
                    localStorage.setItem('modebloom_dismissed_install', 'true');
                    setShowInstallPrompt(false);
                  }}
                  className={`w-full font-black text-sm uppercase px-5 py-2.5 text-center transition-colors focus:ring-4 focus:outline-none border ${
                    darkMode
                      ? 'text-[#C4E538] border-[#C4E538] hover:text-black hover:bg-[#C4E538] focus:ring-[#C4E538]'
                      : 'text-gray-700 border-gray-700 hover:text-black hover:bg-[#9ACD32] focus:ring-gray-300'
                  }`}
                  style={{fontFamily: 'Florsn13, sans-serif'}}
                >
                  Got It, Close This
                </button>
              </div>
              
              <p className={`text-xs text-center mt-4 ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                You can still use ModeBloom in your browser, but the app experience is optimized for home screen installation.
              </p>
            </div>
          </motion.div>
        </div>
      )}

      {/* Wireframe Modal */}
      {showWireframeModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
          onClick={() => setShowWireframeModal(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className={`relative max-w-lg w-full max-h-[90vh] rounded-lg overflow-hidden ${
              darkMode ? 'bg-gray-900 border border-gray-700' : 'bg-white border border-gray-200'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`p-4 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <div className="flex items-center justify-between">
                <h3 className={`text-lg font-semibold ${darkMode ? 'text-gray-200' : 'text-gray-900'}`} style={{fontFamily: 'Florsn13, sans-serif'}}>
                  Phone Axes & Orientation
                </h3>
                <button
                  onClick={() => setShowWireframeModal(false)}
                  className={`p-2 rounded-full transition-colors ${
                    darkMode 
                      ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-800' 
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <HiX className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-6 flex justify-center">
              <img 
                src={darkMode ? "/wireframe.v01.dark.mode.svg" : "/wireframe.v02.light.mode.svg"} 
                alt="Phone axes wireframe diagram showing X, Y, and Z axes orientation" 
                className="max-w-full h-auto max-h-96"
              />
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
    </>
  );
}