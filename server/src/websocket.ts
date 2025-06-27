import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { Application } from 'express';
import { updateWebSocketConfig, getWebSocketConfig } from './config/websocketConfig.js';

export let wss: WebSocketServer;

export function initWebSocketServer(server: ReturnType<typeof createServer>) {
  wss = new WebSocketServer({ server });

  wss.on('connection', (ws) => {
    console.log('WebSocket client connected');
    
    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        console.log('WebSocket message received:', data);
        
        if (data.type === 'subscribe' && data.taskId) {
          ws.send(JSON.stringify({
            type: 'subscribed',
            taskId: data.taskId,
            message: 'Subscribed to task updates',
            version: getWebSocketConfig().payloadVersion
          }));
        }
        
        // Handle client capability negotiation
        if (data.type === 'client_capabilities') {
          const { supportedVersions, features } = data;
          
          // Configure WebSocket based on client capabilities
          if (features && !features.includes('requiredFields')) {
            // Client doesn't support requiredFields, disable them for this session
            console.log('Client does not support requiredFields, enabling legacy mode');
            updateWebSocketConfig({ enableRequiredFields: false });
          }
          
          ws.send(JSON.stringify({
            type: 'capabilities_acknowledged',
            serverVersion: getWebSocketConfig().payloadVersion,
            features: getWebSocketConfig().enableRequiredFields ? ['requiredFields'] : []
          }));
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
      }
    });
    
    ws.on('close', () => {
      console.log('WebSocket client disconnected');
    });
    
    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  });
}

export function broadcast(message: any) {
  if (!wss) {
    console.error('WebSocket server not initialized');
    return;
  }
  wss.clients.forEach((client) => {
    if (client.readyState === client.OPEN) {
      client.send(JSON.stringify(message));
    }
  });
} 