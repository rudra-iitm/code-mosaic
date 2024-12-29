class WebSocketSingleton {
    private static instance: WebSocketSingleton;
    private socket: WebSocket | null = null;
    private listeners: Set<(event: MessageEvent) => void> = new Set();
    private messageQueue: string[] = [];
    public isConnecting: boolean = false;
  
    private constructor() {}

    public static getInstance(): WebSocketSingleton {
      if (!WebSocketSingleton.instance) {
        WebSocketSingleton.instance = new WebSocketSingleton();
      }
      return WebSocketSingleton.instance;
    }

    public connect(url: string): Promise<void> {
      return new Promise((resolve, reject) => {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
          resolve();
          return;
        }
  
        if (this.isConnecting) {
          const checkConnection = setInterval(() => {
            if (this.socket && this.socket.readyState === WebSocket.OPEN) {
              clearInterval(checkConnection);
              resolve();
            }
          }, 100);
          return;
        }
  
        this.isConnecting = true;
        this.socket = new WebSocket(url);
  
        this.socket.onopen = () => {
          console.log('WebSocket connection established');
          this.isConnecting = false;
          this.flushQueue();
          resolve();
        };
  
        this.socket.onerror = (error) => {
          console.error('WebSocket error:', error);
          this.isConnecting = false;
          reject(error);
        };
  
        this.socket.onmessage = (event) => this.notifyListeners(event);
  
        this.socket.onclose = () => {
          console.log('WebSocket connection closed');
          this.isConnecting = false;
        };
      });
    }
  
    public disconnect(): void {
      if (this.socket) {
        this.socket.close();
        this.socket = null;
      }
      this.messageQueue = [];
    }
  
    public send(data: string): void {
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        this.socket.send(data);
      } else {
        this.messageQueue.push(data);
        if (!this.isConnecting) {
          console.warn('WebSocket is not connected. Message queued.');
        }
      }
    }
  
    private flushQueue(): void {
      while (this.messageQueue.length > 0) {
        const message = this.messageQueue.shift();
        if (message) this.send(message);
      }
    }
  
    public addListener(listener: (event: MessageEvent) => void): void {
      this.listeners.add(listener);
    }
  
    public removeListener(listener: (event: MessageEvent) => void): void {
      this.listeners.delete(listener);
    }
  
    private notifyListeners(event: MessageEvent): void {
      this.listeners.forEach(listener => listener(event));
    }
  }
  
export default WebSocketSingleton.getInstance();
