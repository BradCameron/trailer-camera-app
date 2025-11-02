
export const GUIDELINE_DISTANCES = {
    red: 18,
    yellow: 60,
    green: 84,
};

export const GUIDELINE_COLORS: { [key: string]: string } = {
    red: '#ef4444',     // red-500
    yellow: '#f59e0b',  // amber-500
    green: '#22c55e',   // green-500
};

export const MAX_SENSOR_DISTANCE_IN = 120; // Max distance to map to the progress bar
export const MIN_SENSOR_RELIABLE_IN = 1.0;
export const MIN_BEEP_DISTANCE_IN = 4.0;
export const MAX_BEEP_DISTANCE_IN = GUIDELINE_DISTANCES.green + 20;

export const WEBSOCKET_PORT = 81;
