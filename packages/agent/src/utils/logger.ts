type LogLevel = 'debug' | 'info' | 'warn' | 'error';

class Logger {
  private debugMode: boolean;
  
  constructor(debug = false) {
    this.debugMode = debug;
  }
  
  private log(level: LogLevel, message: string, ...args: unknown[]) {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
    
    if (level === 'debug' && !this.debugMode) {
      return;
    }
    
    if (args.length > 0) {
      console.log(prefix, message, ...args);
    } else {
      console.log(prefix, message);
    }
  }
  
  debug(message: string, ...args: unknown[]) {
    this.log('debug', message, ...args);
  }
  
  info(message: string, ...args: unknown[]) {
    this.log('info', message, ...args);
  }
  
  warn(message: string, ...args: unknown[]) {
    this.log('warn', message, ...args);
  }
  
  error(message: string, ...args: unknown[]) {
    this.log('error', message, ...args);
  }
  
  setDebugMode(debug: boolean) {
    this.debugMode = debug;
  }
}

export const logger = new Logger(process.env.DEBUG === 'true');
