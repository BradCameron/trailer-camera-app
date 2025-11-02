import { useState, useEffect, useRef } from 'react';
import { WEBSOCKET_PORT, MAX_SENSOR_DISTANCE_IN } from '../constants';

type ConnectionStatus = 'Connecting' | 'Connected' | 'Disconnected' | 'Error';

export const useBackupSensor = (ipAddress: string | null, isSimulation: boolean = false) => {
  const [distance, setDistance] = useState<number | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('Disconnected');
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Teardown logic for any active connection or simulation
    const cleanup = () => {
        if (socketRef.current) {
            socketRef.current.close(1000, "Component unmounting");
            socketRef.current = null;
        }
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
        }
        setConnectionStatus('Disconnected');
        setDistance(null);
    };

    if (!ipAddress) {
      cleanup();
      return;
    }
    
    if (isSimulation) {
      setConnectionStatus('Connected');
      const simulationInterval = setInterval(() => {
          setDistance(prev => {
              if (prev === null) return MAX_SENSOR_DISTANCE_IN;
              // Cycle from max distance down to 0, then reset.
              const nextDist = prev - 2;
              return nextDist >= 0 ? nextDist : MAX_SENSOR_DISTANCE_IN;
          });
      }, 100);

      return () => {
          clearInterval(simulationInterval);
          cleanup();
      };
    }
    
    const connect = () => {
        if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
            return;
        }

        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
        }

        setConnectionStatus('Connecting');
        const socket = new WebSocket(`ws://${ipAddress}:${WEBSOCKET_PORT}/`);

        socket.onopen = () => {
            console.log('WebSocket connection opened.');
            setConnectionStatus('Connected');
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
            }
        };

        socket.onmessage = (event) => {
            const newDistance = parseFloat(event.data);
            if (!isNaN(newDistance)) {
                setDistance(newDistance > 0 ? newDistance : null);
            }
        };

        socket.onclose = (event) => {
            console.log('WebSocket connection closed:', event.code, event.reason);
            setConnectionStatus('Disconnected');
            setDistance(null);
            
            if (event.code !== 1000) {
                 reconnectTimeoutRef.current = setTimeout(connect, 3000);
            }
        };

        socket.onerror = (error) => {
            console.error('WebSocket Error:', error);
            setConnectionStatus('Error');
            socket.close();
        };

        socketRef.current = socket;
    }

    connect();

    return () => {
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
        }
      if (socketRef.current) {
        socketRef.current.close(1000, "Component unmounting");
        socketRef.current = null;
      }
    };
  }, [ipAddress, isSimulation]);

  return { distance, connectionStatus };
};
