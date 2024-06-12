const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 8080 });

let clients = new Map();

wss.on('connection', (ws) => {
    // Assign a unique ID to each client
    const clientId = Date.now();
    clients.set(clientId, { ws, state: {} });

    ws.on('message', (message) => {
        const data = JSON.parse(message);
        clients.get(clientId).state = data;

        // Broadcast the state to all other clients
        clients.forEach((client, id) => {
            if (id !== clientId && client.ws.readyState === WebSocket.OPEN) {
                client.ws.send(JSON.stringify({ clientId, ...data }));
            }
        });
    });

    ws.on('close', () => {
        clients.delete(clientId);
        // Notify all clients that this client has disconnected
        clients.forEach((client) => {
            if (client.ws.readyState === WebSocket.OPEN) {
                client.ws.send(JSON.stringify({ clientId, disconnected: true }));
            }
        });
    });
});

console.log('WebSocket server is running on ws://localhost:8080');
