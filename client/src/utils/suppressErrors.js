// src/utils/suppressErrors.js
export const suppressDevelopmentErrors = () => {
  if (process.env.NODE_ENV === 'development') {
    // Store original console methods
    const originalError = console.error;
    const originalWarn = console.warn;
    
    // Override console.error
    console.error = (...args) => {
      const shouldSuppress = args.some(arg => 
        typeof arg === 'string' && (
          arg.includes('WebSocket connection to') ||
          arg.includes('favicon.ico') ||
          arg.includes('ERR_CONNECTION_REFUSED') ||
          arg.includes('net::ERR_CONNECTION_REFUSED')
        )
      );
      
      if (!shouldSuppress) {
        originalError.apply(console, args);
      }
    };
    
    // Override console.warn
    console.warn = (...args) => {
      const shouldSuppress = args.some(arg => 
        typeof arg === 'string' && (
          arg.includes('webpackHotDevClient') ||
          arg.includes('WebSocket')
        )
      );
      
      if (!shouldSuppress) {
        originalWarn.apply(console, args);
      }
    };
  }
};