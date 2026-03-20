/* lg.spatOscBridge.v03.js ───────────────────────────────────────
 *  OSC ⇄ Three.js scene updater
 *  
 *  lg.spatOscBridge.v03.js is a WebSocket CLIENT that receives OSC 
 *  messages from a WebSocket SERVER, such as udp_ws_bridge.v03.js, 
 *  which is hosted in a MaxMSP <node.scrip> object. 
 *  
 *  this version: assigns global head model
 *  © 2025 Louis Goldford — Licensed under the Creative Commons
 *  Attribution-NoDerivatives 4.0 International Licence (CC BY-ND 4.0)
 *  https://creativecommons.org/licenses/by-nd/4.0/
 *──────────────────────────────────────────────────────────────*/

/**
 * @class SpatOscBridge
 * @classdesc Handles reception and routing of OSC messages from SPAT to Three.js
 *            scene objects (listener, sources, speakers). Messages are routed
 *            based on entity type and message path and values are applied to
 *            scene components accordingly.
 *
 * @param {Object} params - Configuration options
 * @param {Object} params.scene - The Three.js scene
 * @param {Array}  params.sources - Array of source objects
 * @param {Array}  params.speakers - Array of speaker objects
 * @param {Object} params.listener - Listener object
 * @param {GUI}    [params.gui] - dat.GUI instance for debug panel
 * @param {function(number):void=} params.onSpeakerAzimuthOffset
 * @param {function(number):void=} params.onSourceAzimuthOffset
 */

import { GUI } from 'https://cdn.jsdelivr.net/npm/dat.gui@0.7.9/build/dat.gui.module.js';
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { convertSpatToThree, convertAedToThree, convertThreeToSpat } from './lg.spat.io.v01.js';

let globalInstanceCount = 0;

export class SpatOscBridge {
  static instance = null;

  constructor(params){
    globalInstanceCount++;
    // console.log(`[SpatOscBridge] Constructor called (instance #${globalInstanceCount})`);
    
    if (SpatOscBridge.instance) {
      // console.log('[SpatOscBridge] Destroying existing instance');
      SpatOscBridge.instance.destroy();
    }
    // console.log(`[SpatOscBridge] Creating new instance #${globalInstanceCount}`);
    SpatOscBridge.instance = this;
    Object.assign(this, {
      wsUrl: "ws://127.0.0.1:8081", 
      maxLog : 120,
      ...params
    });

    // default listener ear height in meters
    this.earHeight = 1.3;
    
    // Use passed logBox and params from scene render
    this.logBox = params.logBox;
    this.params = params.params;

    // Explicitly declare these callback properties if not already present
    this.onSpeakerAzimuthOffset = params.onSpeakerAzimuthOffset ?? null;
    this.onSourceAzimuthOffset = params.onSourceAzimuthOffset ?? null;
    this.onRoomExcite = params.onRoomExcite ?? null;

    // Store internal azimuth offsets
    this.speakerAzimuthOffset = 0;
    this.sourceAzimuthOffset = 0;

    this.onSpeakerNumber = params.onSpeakerNumber ?? null;
    this.onSourceNumber = params.onSourceNumber ?? null;
    this.onListenerAED = params.onListenerAED ?? null;
    this.onListenerEarHeight = params.onListenerEarHeight ?? null;
    this.onSpeakersAzimuthList = params.onSpeakersAzimuthList ?? null;
    this.onSpeakersAEDList = params.onSpeakersAEDList ?? null;
    this.onSpeakersXYZList = params.onSpeakersXYZList ?? null;
    this.updateSpeakerLabelText = params.updateSpeakerLabelText ?? null;
    this.updateSourceLabelText = params.updateSourceLabelText ?? null;

    this.gui = params.gui ?? new GUI({ width: 260 });
    this.gui.domElement.style.zIndex = 10;

    // Message deduplication
    this.lastMessageHash = new Map();
    this.messageTimeout = 100; // ms

    // Position state tracking for incremental positioning
    this.sourcePositions = new Map(); // Map<sourceId, {x, y, z}>

    this.port = new osc.WebSocketPort({
      url      : this.wsUrl,
      metadata : true
    });

    // console.log(`[SpatOscBridge] WebSocket port created: ${this.wsUrl}`);

    this.port.on("bundle", ({ packets }) => {
      // console.log(`[SpatOscBridge] Bundle received with ${packets.length} packets`);
      packets.forEach(p => this._routeWithDedup(p.address, p.args));
    });

    this.port.on("message", ({ address, args }) => {
      this._routeWithDedup(address, args);
    });

    this.port.open();
  }

  /** Route message with deduplication */
  _routeWithDedup(address, args) {
    const msgHash = this._hashMessage(address, args);
    const now = Date.now();
    
    if (this.lastMessageHash.has(msgHash)) {
      const lastTime = this.lastMessageHash.get(msgHash);
      if (now - lastTime < this.messageTimeout) {
        // console.log(`[SpatOscBridge] Duplicate message ignored: ${address}`);
        return;
      }
    }
    
    this.lastMessageHash.set(msgHash, now);
    this._route(address, args);
  }

  /** Create hash of message for deduplication */
  _hashMessage(address, args) {
    const argsStr = args.map(a => `${a.type}:${a.value}`).join(',');
    return `${address}|${argsStr}`;
  }

  /** Check if a render update is required */
  needsRender(){ const f=this._dirty; this._dirty=false; return f; }

  /** Add message to the GUI log box */
  _addToLog(message) {
    if (!this.logBox || !this.params?.oscLogEnabled) return;
    
    const lines = this.logBox.value.split('\n');
    lines.push(message);
    
    // Keep only the last maxLog lines
    if (lines.length > this.maxLog) {
      lines.splice(0, lines.length - this.maxLog);
    }
    
    this.logBox.value = lines.join('\n');
    this.logBox.scrollTop = this.logBox.scrollHeight;
  }

  /** Send a message via OSC */
  send(addr,args){
    this.port.send({ address:addr, args });
  }

  /** Send multiple messages as an OSC bundle for atomic coordinate updates */
  sendBundle(messages){
    const bundle = {
      timeTag: 0, // Immediate execution
      packets: messages.map(msg => ({
        address: msg.address,
        args: msg.args
      }))
    };
    this.port.send(bundle);
  }

  /** Main routing function for OSC message dispatch */
  _route(address, args) {
    // Debug: Log raw address for speaker-related messages
    // if (address.includes('/speaker')) {
    //   console.log(`[OSC Raw Address Debug] Raw address received: "${address}"`);
    //   // Extra debug for name messages
    //   if (address.includes('/name')) {
    //     console.log(`[OSC Name Debug] Speaker name message detected: "${address}" with args:`, args);
    //   }
    // }
    
    // Format message for display - add quotes only for string arguments in label messages
    let displayMessage;
    if (address.includes('/label')) {
      displayMessage = `${address} ${args.map(a => {
        return a.type === 's' ? `"${a.value}"` : a.value;
      }).join(" ")}`;
    } else {
      displayMessage = `${address} ${args.map(a => a.value).join(" ")}`;
    }
    // console.log(`[OSC] Received ${displayMessage}`);
    
    // Add to GUI log box
    this._addToLog(displayMessage);
    
    const logNotImplemented = () => {
      console.warn(`[SpatOscBridge] Received ${address} — Not implemented.`);
    };

    // Handle ngrok URL updates
    if (address === "/ngrok/url" && args.length > 0) {
      const ngrokUrl = args[0].value;
      console.log(`[OSC] Received ngrok URL: ${ngrokUrl}`);
      // Update QR code parameters if they exist
      if (window.qrParams) {
        window.qrParams.ngrokUrl = ngrokUrl;
        // Trigger GUI refresh
        if (window.gQR && window.gQR.__controllers) {
          window.gQR.__controllers.forEach(controller => {
            if (controller.property === 'ngrokUrl') {
              controller.updateDisplay();
            }
          });
        }
        // Regenerate QR code if visible
        if (window.qrParams.showQR && window.generateQRCode) {
          window.generateQRCode();
        }
      }
      return;
    }

    const parts = address.split("/").filter(Boolean);
    if (parts.length < 2) return;

    const [entity, idStr, ...rest] = parts;
    
    // Debug logging for speaker-related messages
    // if (entity === "speakers" || entity === "speaker") {
    //   console.log(`[OSC Debug] entity: "${entity}", idStr: "${idStr}", rest: [${rest.join(', ')}], parts: [${parts.join(', ')}]`);
    // }

    let id, key;

    if (entity === "listener" && parts.length === 2) {
    id = null;
    key = idStr;
    } else if (entity === "listener" && parts.length === 3 && idStr === "ear") {
    // Handle /listener/ear/height
    id = null;
    key = "ear";
    // rest will be ["height"]
    } else if (entity === "room" && parts.length === 2) {
    // Handle /room/excite
    id = null;
    key = idStr;
    } else if ((entity === "speaker" || entity === "source") && idStr === "number") {
    id = null;
    key = "number";
    } else if ((entity === "speakers" || entity === "sources") && parts.length >= 3) {
    // Handle /speakers/azimuth/offset and /sources/azimuth/offset
    id = null;
    key = idStr; // "azimuth"
    // rest will be ["offset"]
    } else if ((entity === "speakers" || entity === "sources") && parts.length === 2) {
    // Handle /speakers/azim, /speakers/xyz, etc.
    id = null;
    key = idStr; // "azim", "xyz", etc.
    } else if (entity === "controller" && parts.length === 2) {
    // Handle /controller/announce, /controller/bind, etc.
    id = null;
    key = idStr; // "announce", "bind", etc.
    } else {
    id = parseInt(idStr);
    key = rest.join("/");
    }

  switch (entity) {

  case "listener": {
        switch (key) {
          case "xyz": {
            const [x, y, z] = args.map(a => a.value);
            // console.log(`[SpatOscBridge] onListenerXYZ(${x}, ${y}, ${z})`);
            if (this.onListenerXYZ) this.onListenerXYZ(x, y, z);
            break;
          }

          case "xyz/get": {
            this._requestListenerXYZ();
            break;
          }

          case "aed": {
            const [az, el, d] = args.map(a => a.value);
            this._updateListenerAED([az, el, d]);
            // console.log(`[SpatOscBridge] onListenerAED(${az}, ${el}, ${d})`);
            if (this.onListenerAED) this.onListenerAED(az, el, d);
            break;
          }

          case "ear": {
            if (rest[0] === "height") {
              const h = args[0].value;
              this.earHeight = h;
              console.log(`[SpatOscBridge] onListenerEarHeight(${h})`);
              if (this.onListenerEarHeight) this.onListenerEarHeight(h);
              return;
            }
            break;
          }

          default:
            logNotImplemented();
            break;
        }
        break;
      }

      case "speakers": {
        if (key === "azim") {
          // Handle /speakers/azim with list of azimuth values
          const azimuths = args.map(a => a.value);
          // console.log(`[SpatOscBridge] Setting speaker azimuths: [${azimuths.join(', ')}]`);
          // console.log(`[SpatOscBridge] onSpeakersAzimuthList callback available:`, !!this.onSpeakersAzimuthList);
          if (this.onSpeakersAzimuthList) {
            this.onSpeakersAzimuthList(azimuths);
          } else {
            console.warn(`[SpatOscBridge] onSpeakersAzimuthList callback not found!`);
          }
          return;
        }
        
        if (key === "aed") {
          // Handle /speakers/aed with flat list of AED triples (az1, el1, d1, az2, el2, d2, ...)
          const aedValues = args.map(a => a.value);
          // console.log(`[SpatOscBridge] Setting speaker AED positions: [${aedValues.join(', ')}]`);
          // console.log(`[SpatOscBridge] onSpeakersAEDList callback available:`, !!this.onSpeakersAEDList);
          if (this.onSpeakersAEDList) {
            this.onSpeakersAEDList(aedValues);
          } else {
            console.warn(`[SpatOscBridge] onSpeakersAEDList callback not found!`);
          }
          return;
        }
        
        if (key === "xyz") {
          // Handle /speakers/xyz with flat list of XYZ triples (x1, y1, z1, x2, y2, z2, ...)
          const xyzValues = args.map(a => a.value);
          // console.log(`[SpatOscBridge] Setting speaker XYZ positions: [${xyzValues.join(', ')}]`);
          // console.log(`[SpatOscBridge] onSpeakersXYZList callback available:`, !!this.onSpeakersXYZList);
          if (this.onSpeakersXYZList) {
            this.onSpeakersXYZList(xyzValues);
          } else {
            console.warn(`[SpatOscBridge] onSpeakersXYZList callback not found!`);
          }
          return;
        }
        
        // Keep old azimuth/offset for backward compatibility (deprecated)
        if (key === "azimuth" && rest[0] === "offset") {
          const offset = args[0].value;
          this.speakerAzimuthOffset = offset;
          console.log(`[SpatOscBridge] onSpeakerAzimuthOffset(${offset}) - DEPRECATED`);
          if (this.onSpeakerAzimuthOffset) this.onSpeakerAzimuthOffset(offset);
          return;
        }
        break;
      }

      case "sources": {
        if (key === "azimuth" && rest[0] === "offset") {
          const offset = args[0].value;
          this.sourceAzimuthOffset = offset;
          console.log(`[SpatOscBridge] onSourceAzimuthOffset(${offset})`);
          if (this.onSourceAzimuthOffset) this.onSourceAzimuthOffset(offset);
          return;
        }
        break;
      }

      case "source": {
        if (key === "number") {
          const count = args[0].value;
          this._setNumberOfSources(count);
          // console.log(`[SpatOscBridge] onSourceNumber(${count})`);
          if (this.onSourceNumber) this.onSourceNumber(count);
          break;
        }

        if (isNaN(id)) return;

        switch (key) {
          case "xyz": this._updateSourceXYZ(id, args); break;
          case "xyz/get": this._requestSourceXYZ(id); break;
          case "aed": this._updateSourceAED(id, args); break;
          case "color": this._updateSourceColor(id, args); break;
          case "proportion": this._updateSourceProportion(id, args); break;
          case "label": this._updateSourceLabel(id, args); break;
          case "label/color": this._updateSourceLabelColor(id, args); break;
          case "yaw": this._updateSourceYaw(id, args); break;
          case "pitch": this._updateSourcePitch(id, args); break;
          case "roll": this._updateSourceRoll(id, args); break;
          case "x++": this._updateSourceXIncremental(id, args); break;
          case "y++": this._updateSourceYIncremental(id, args); break;
          case "z++": this._updateSourceZIncremental(id, args); break;
          default: logNotImplemented(); break;
        }
        break;
      }

      case "speaker": {
        if (key === "number") {
          const count = args[0].value;
          // console.log(`[SpatOscBridge] SPEAKER NUMBER MESSAGE RECEIVED! Setting speaker count to ${count}`);
          this._setNumberOfSpeakers(count);
          // console.log(`[SpatOscBridge] onSpeakerNumber(${count})`);
          if (this.onSpeakerNumber) this.onSpeakerNumber(count);
          break;
        }

        if (isNaN(id)) return;

        switch (key) {
          case "xyz": this._updateSpeakerXYZ(id, args); break;
          case "aed": this._updateSpeakerAED(id, args); break;
          case "yaw": this._updateSpeakerYaw(id, args); break;
          case "pitch": this._updateSpeakerPitch(id, args); break;
          case "roll": this._updateSpeakerRoll(id, args); break;
          case "color": this._updateSpeakerColor(id, args); break;
          case "proportion": this._updateSpeakerProportion(id, args); break;
          case "name": this._updateSpeakerName(id, args); break;
          case "label": this._updateSpeakerLabel(id, args); break;
          case "label/color": this._updateSpeakerLabelColor(id, args); break;
          default: logNotImplemented(); break;
        }
        break;
      }

      case "controller": {
        if (parts.length === 3 && parts[2] === "label") {
          // Handle /controller/mobile_xxxxx/label
          const deviceId = idStr;
          const label = args[0].value;
          console.log(`[SpatOscBridge] Controller ${deviceId} label: ${label}`);
          this._addToLog(`🏷️ Controller ${deviceId} label: "${label}"`);
        } else {
          switch (key) {
            case "announce": {
              const deviceId = args[0].value;
              console.log(`[SpatOscBridge] Mobile controller announced: ${deviceId}`);
              this._addToLog(`📱 Mobile controller connected: ${deviceId}`);
              
              // Register controller in dynamic table if available
              if (typeof window !== 'undefined' && window.registerController) {
                window.registerController(deviceId);
              }
              break;
            }
            case "bind": {
              // Handle /controller/bind deviceId sourceId label
              const [deviceId, sourceId, label] = args.map(a => a.value);
              console.log(`[SpatOscBridge] Binding controller ${deviceId} to source ${sourceId} with label: ${label}`);
              this._addToLog(`🔗 Bound ${deviceId} to source ${sourceId}: ${label}`);
              
              // Update controller binding in dynamic table
              if (typeof window !== 'undefined' && window.bindControllerToSource) {
                const sourceLabel = window.bindControllerToSource(deviceId, sourceId, label);
                if (sourceLabel) {
                  // Send OSC message to update source label
                  this.send(`/source/${sourceId}/label`, [{type: 's', value: sourceLabel}]);
                }
              }
              break;
            }
            case "unbind": {
              // Handle /controller/unbind deviceId sourceId
              const [deviceId, sourceId] = args.map(a => a.value);
              console.log(`[SpatOscBridge] Unbinding controller ${deviceId} from source ${sourceId}`);
              this._addToLog(`🔓 Unbound ${deviceId} from source ${sourceId}`);
              
              // Update controller binding in dynamic table
              if (typeof window !== 'undefined' && window.unbindControllerFromSource) {
                const unboundSourceId = window.unbindControllerFromSource(deviceId);
                if (unboundSourceId) {
                  // Reset source label
                  this.send(`/source/${unboundSourceId}/label`, [{type: 's', value: `s${unboundSourceId}`}]);
                }
              }
              break;
            }
            case "origin/set": {
              // Handle /controller/origin/set deviceId sourceId x y z
              const [deviceId, sourceId, x, y, z] = args.map(a => a.value);
              console.log(`[SpatOscBridge] Setting origin for controller ${deviceId} at source ${sourceId} position: (${x}, ${y}, ${z})`);
              this._addToLog(`📍 Origin set for ${deviceId} at position (${x.toFixed(2)}, ${y.toFixed(2)}, ${z.toFixed(2)})`);
              
              // Update controller origin in dynamic table
              if (typeof window !== 'undefined' && window.activeControllers && window.activeControllers[deviceId]) {
                window.activeControllers[deviceId].originOffset = { x, y, z };
                window.activeControllers[deviceId].customOrigin = true;
                window.activeControllers[deviceId].lastSeen = Date.now();
              }
              break;
            }
            default:
              logNotImplemented();
              break;
          }
        }
        break;
      }

      case "room": {
        switch (key) {
          case "excite": {
            const frequency = args[0].value;
            console.log(`[SpatOscBridge] onRoomExcite(${frequency})`);
            if (this.onRoomExcite) this.onRoomExcite(frequency);
            break;
          }
          default:
            logNotImplemented();
            break;
        }
        break;
      }

      default: {
        console.warn(`[SpatOscBridge] Unknown entity: ${entity}`);
        break;
      }
    }
  }

  _setNumberOfSources(n) { this.sources.length = n; }
  _setNumberOfSpeakers(n) { this.speakers.length = n; }

  _updateListenerXYZ([x, y, z]) {
    if (this.listener) this.listener.position.set(x, y, z);
  }

  _updateListenerAED([az, el, d]) {
    if (this.listener) {
      const { x, y, z } = convertAedToThree(az, el, d);
      this.listener.position.set(x, y, z);
    }
  }

  _updateListenerColor([r, g, b, a]) {
    if (this.listener?.color) this.listener.color.setRGB(r, g, b);
  }

  _updateListenerProportion([p]) {
    if (this.listener?.scale) this.listener.scale.setScalar(p / 100);
  }

  _updateSourceXYZ(id, args) {
    const [x, y, z] = args.map(a => a.value);
    // console.log(`[OSC] _updateSourceXYZ: id=${id}, pos=(${x}, ${y}, ${z}), sources.length=${this.sources?.length || 'undefined'}`);
    
    // Update our internal position tracking (SPAT coordinates)
    this.sourcePositions.set(id, { x, y, z });
    
    // Check if sources array exists and has elements
    if (!this.sources || this.sources.length === 0) {
      // console.log(`[OSC] Sources array not initialized or empty, sources:`, this.sources);
      return; // Silently ignore if no sources are available
    }
    
    const S = this.sources[id - 1];
    // console.log(`[OSC] Found source object:`, S);
    if (S) {
      // console.log(`[OSC] Calling setPosition on source ${id}`);
      S.setPosition(x, y, z);
    } else {
      console.warn(`[OSC] No source found at index ${id - 1}, sources.length=${this.sources.length}`);
    }
  }

  _updateSourceAED(id, args) {
    const [az, el, d] = args.map(a => a.value);
    
    // Check if sources array exists and has elements
    if (!this.sources || this.sources.length === 0) {
      return; // Silently ignore if no sources are available
    }
    
    const S = this.sources[id - 1];
    if (S) {
      const { x, y, z } = convertAedToThree(az, el, d);
      S.setPosition(x, y, z);
    }
  }

  _updateSourceColor(id, [r, g, b, a]) {
    this.sources[id - 1]?.setColor(r, g, b, a);
  }

  _updateSourceProportion(id, [p]) {
    this.sources[id - 1]?.setProportion(p);
  }

  _updateSourceLabel(id, [label]) {
    this.sources[id - 1]?.setLabel(label);
    
    // Also update the dynamic position table for UI display
    if (typeof window !== 'undefined' && window.entityPositions && window.entityPositions.sources[id]) {
      window.entityPositions.sources[id].label = label;
      console.log(`[SpatOscBridge] Updated entity position label for source ${id}: "${label}"`);
    }
  }

  _updateSourceLabel(id, args) {
    // Extract string value from args - handle both string and object formats
    const label = typeof args[0] === 'string' ? args[0] : (args[0]?.value || String(args[0]));
    console.log(`[SpatOscBridge] Processing source ${id} label args:`, args, `extracted label: "${label}"`);
    
    // Update the source label in the entity positions table
    if (typeof window !== 'undefined' && window.entityPositions && window.entityPositions.sources[id]) {
      window.entityPositions.sources[id].label = label;
      console.log(`[SpatOscBridge] Updated entity position label for source ${id}: "${label}"`);
    }
    
    // Update the visual label in the 3D scene
    if (this.updateSourceLabelText) {
      this.updateSourceLabelText(id, label);
    } else {
      console.warn(`[SpatOscBridge] updateSourceLabelText callback not available for source ${id}`);
    }
    
    console.log(`[SpatOscBridge] Successfully set label "${label}" on source ${id}`);
  }

  _updateSourceLabelColor(id, [r, g, b, a]) {
    this.sources[id - 1]?.setLabelColor(r, g, b, a);
  }

  _updateSourceYaw(id, [v]) {
    this.sources[id - 1]?.setYaw(v);
  }

  _updateSourcePitch(id, [v]) {
    this.sources[id - 1]?.setPitch(v);
  }

  _updateSourceRoll(id, [v]) {
    this.sources[id - 1]?.setRoll(v);
  }

  _requestSourceXYZ(id) {
    // Request current source position from dynamic table
    if (typeof window !== 'undefined' && window.getEntityPosition) {
      const position = window.getEntityPosition('source', id);
      if (position) {
        console.log(`[SpatOscBridge] Source ${id} position request: (${position.x}, ${position.y}, ${position.z})`);
        this._addToLog(`📍 Source ${id} position: (${position.x.toFixed(2)}, ${position.y.toFixed(2)}, ${position.z.toFixed(2)})`);
        
        // Send response back to requesting client
        this.send(`/source/${id}/xyz/response`, [
          {type: 'f', value: position.x},
          {type: 'f', value: position.y}, 
          {type: 'f', value: position.z}
        ]);
      } else {
        console.warn(`[SpatOscBridge] Source ${id} position not found in dynamic table`);
        this._addToLog(`❌ Source ${id} position not available`);
      }
    } else {
      console.warn(`[SpatOscBridge] Dynamic position table not available for source ${id} request`);
    }
  }

  _requestListenerXYZ() {
    // Request current listener position from dynamic table
    if (typeof window !== 'undefined' && window.getEntityPosition) {
      const position = window.getEntityPosition('listener');
      if (position) {
        console.log(`[SpatOscBridge] Listener position request: (${position.x}, ${position.y}, ${position.z})`);
        this._addToLog(`📍 Listener position: (${position.x.toFixed(2)}, ${position.y.toFixed(2)}, ${position.z.toFixed(2)})`);
        
        // Send response back to requesting client
        this.send(`/listener/xyz/response`, [
          {type: 'f', value: position.x},
          {type: 'f', value: position.y}, 
          {type: 'f', value: position.z}
        ]);
      } else {
        console.warn(`[SpatOscBridge] Listener position not found in dynamic table`);
        this._addToLog(`❌ Listener position not available`);
      }
    } else {
      console.warn(`[SpatOscBridge] Dynamic position table not available for listener request`);
    }
  }

  _updateSpeakerXYZ(id, args) {
    const [x, y, z] = args.map(a => a.value);
    const K = this.speakers[id - 1];
    if (K) K.setPosition(x, y, z);
  }

  _updateSpeakerAED(id, args) {
    const [az, el, d] = args.map(a => a.value);
    const K = this.speakers[id - 1];
    if (K) {
      const { x, y, z } = convertAedToThree(az, el, d);
      K.setPosition(x, y, z);
    }
  }

  _updateSpeakerYaw(id, [v]) {
    this.speakers[id - 1]?.setYaw(v);
  }

  _updateSpeakerPitch(id, [v]) {
    this.speakers[id - 1]?.setPitch(v);
  }

  _updateSpeakerRoll(id, [v]) {
    this.speakers[id - 1]?.setRoll(v);
  }

  _updateSpeakerColor(id, [r, g, b, a]) {
    this.speakers[id - 1]?.setColor(r, g, b, a);
  }

  _updateSpeakerProportion(id, [p]) {
    this.speakers[id - 1]?.setProportion(p);
  }

  _updateSpeakerName(id, args) {
    // Handle SPAT5 speaker naming - maps to setLabel for compatibility
    const name = args[0].value; // Extract the actual string value from OSC arg
    // console.log(`[SpatOscBridge] Setting speaker ${id} name: "${name}"`);
    
    // Debug: Check if speaker exists and has setLabel method
    const speaker = this.speakers[id - 1];
    // console.log(`[SpatOscBridge] Speaker ${id} object:`, speaker);
    // console.log(`[SpatOscBridge] Speaker ${id} has setLabel method:`, typeof speaker?.setLabel === 'function');
    
    if (speaker) {
      // Directly set the label property since Speaker class doesn't have setLabel method
      speaker.label = name;
      // console.log(`[SpatOscBridge] Successfully set label property to "${name}" on speaker ${id}`);
      
      // Update the visual label text in the Three.js scene
      if (this.updateSpeakerLabelText) {
        this.updateSpeakerLabelText(id, name);
      } else {
        console.warn(`[SpatOscBridge] updateSpeakerLabelText callback not available for speaker ${id}`);
      }
      
      // Also update the dynamic position table for UI display
      if (typeof window !== 'undefined' && window.entityPositions && window.entityPositions.speakers[id]) {
        window.entityPositions.speakers[id].label = name;
        console.log(`[SpatOscBridge] Updated entity position label for speaker ${id}: "${name}"`);
      }
    } else {
      console.error(`[SpatOscBridge] Speaker ${id} not found in speakers array`);
    }
  }

  _updateSpeakerLabel(id, [label]) {
    this.speakers[id - 1]?.setLabel(label);
    
    // Also update the dynamic position table for UI display
    if (typeof window !== 'undefined' && window.entityPositions && window.entityPositions.speakers[id]) {
      window.entityPositions.speakers[id].label = label;
      console.log(`[SpatOscBridge] Updated entity position label for speaker ${id}: "${label}"`);
    }
  }

  _updateSpeakerLabelColor(id, [r, g, b, a]) {
    this.speakers[id - 1]?.setLabelColor(r, g, b, a);
  }

  _updateSourceXIncremental(id, args) {
    const xDelta = args[0].value;
    this._applyIncrementalPosition(id, xDelta, 0, 0);
  }

  _updateSourceYIncremental(id, args) {
    const yDelta = args[0].value;
    this._applyIncrementalPosition(id, 0, yDelta, 0);
  }

  _updateSourceZIncremental(id, args) {
    const zDelta = args[0].value;
    this._applyIncrementalPosition(id, 0, 0, zDelta);
  }

  _applyIncrementalPosition(id, xDelta, yDelta, zDelta) {
    // Get current position or initialize to (0,0,0)
    let currentPos = this.sourcePositions.get(id);
    if (!currentPos) {
      // Initialize with current Three.js scene position if source exists
      const source = this.sources[id - 1];
      if (source && source.position) {
        // Convert Three.js position back to SPAT coordinates for state tracking
        const spatPos = convertThreeToSpat(source.position.x, source.position.y, source.position.z);
        currentPos = { x: spatPos.x, y: spatPos.y, z: spatPos.z };
      } else {
        currentPos = { x: 0, y: 0, z: 0 };
      }
      this.sourcePositions.set(id, currentPos);
    }

    // Apply incremental delta in SPAT coordinate space
    currentPos.x += xDelta;
    currentPos.y += yDelta; 
    currentPos.z += zDelta;

    console.log(`[SpatOscBridge] Incremental position update for source ${id}: delta(${xDelta}, ${yDelta}, ${zDelta}) -> position(${currentPos.x.toFixed(3)}, ${currentPos.y.toFixed(3)}, ${currentPos.z.toFixed(3)})`);

    // Update Three.js scene using absolute position
    this._updateSourceXYZ(id, [
      { value: currentPos.x },
      { value: currentPos.y },
      { value: currentPos.z }
    ]);

    // Send absolute position to SPAT (if needed for SPAT's internal state)
    this.send(`/source/${id}/xyz`, [
      { type: 'f', value: currentPos.x },
      { type: 'f', value: currentPos.y },
      { type: 'f', value: currentPos.z }
    ]);
  }

  destroy() {
    if (this.port) {
      this.port.close();
      this.port = null;
    }
    if (this.gui) {
      this.gui.destroy();
      this.gui = null;
    }
  }
}

function onListenerXYZ(x, y, z) {
  const p = convertSpatToThree(x, y, z);
  // console.log('[DEBUG] /listener/xyz →', p);

  if (!listener) {
    listener = new THREE.Object3D();
    scene.add(listener);
    loadHeadModel(p); // This will assign global `window.leftEar`, etc.
  }

  listener.position.set(p.x, p.y, p.z);
}

