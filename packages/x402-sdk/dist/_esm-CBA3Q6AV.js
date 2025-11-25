import {
  import_websocket,
  init_wrapper,
  wrapper_exports
} from "./chunk-UO6AZWI5.js";
import "./chunk-2ESYSVXG.js";

// ../../node_modules/isows/_esm/index.js
init_wrapper();

// ../../node_modules/isows/_esm/utils.js
function getNativeWebSocket() {
  if (typeof WebSocket !== "undefined")
    return WebSocket;
  if (typeof global.WebSocket !== "undefined")
    return global.WebSocket;
  if (typeof window.WebSocket !== "undefined")
    return window.WebSocket;
  if (typeof self.WebSocket !== "undefined")
    return self.WebSocket;
  throw new Error("`WebSocket` is not supported in this environment");
}

// ../../node_modules/isows/_esm/index.js
var WebSocket3 = (() => {
  try {
    return getNativeWebSocket();
  } catch {
    if (import_websocket.default)
      return import_websocket.default;
    return wrapper_exports;
  }
})();
export {
  WebSocket3 as WebSocket
};
