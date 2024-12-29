import WebSocketHandler from './WebSocketHandler';

const PORT = 8000;
new WebSocketHandler(PORT);

console.log(`Server started on port ${PORT}`);
