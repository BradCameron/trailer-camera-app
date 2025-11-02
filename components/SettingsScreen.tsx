import React, { useState } from 'react';

interface SettingsScreenProps {
  onSave: (sensorIp: string, cameraIp: string, isSimulation: boolean) => void;
  initialSensorIp?: string;
  initialCameraIp?: string;
  initialIsSimulation?: boolean;
}

const SettingsScreen: React.FC<SettingsScreenProps> = ({ 
    onSave,
    initialSensorIp = '192.168.5.40',
    initialCameraIp = '192.168.5.41',
    initialIsSimulation = false,
}) => {
  const [sensorIp, setSensorIp] = useState<string>(initialSensorIp);
  const [cameraIp, setCameraIp] = useState<string>(initialCameraIp);
  const [isSimulation, setIsSimulation] = useState<boolean>(initialIsSimulation);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSimulation || (sensorIp && cameraIp)) {
      onSave(sensorIp, cameraIp, isSimulation);
    }
  };

  const buttonText = isSimulation ? 'Start Simulation' : 'Save and Connect';

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 p-4">
      <div className="w-full max-w-md p-8 space-y-8 bg-gray-800 rounded-lg shadow-xl">
        <div className="text-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          <h1 className="text-2xl font-bold text-white mt-4">Trailer Backup Camera Setup</h1>
          <p className="mt-2 text-sm text-gray-400">
            Enter the IP addresses of your ESP32 devices or use Simulation Mode.
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="sensor-ip" className="sr-only">
                Sensor/Server IP Address
              </label>
              <input
                id="sensor-ip"
                name="sensor-ip"
                type="text"
                required={!isSimulation}
                disabled={isSimulation}
                className={`appearance-none rounded-none relative block w-full px-3 py-3 border border-gray-700 text-white placeholder-gray-500 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm ${isSimulation ? 'bg-gray-700 opacity-50 cursor-not-allowed' : 'bg-gray-900'}`}
                placeholder="Sensor/Server IP (e.g., 192.168.5.40)"
                value={sensorIp}
                onChange={(e) => setSensorIp(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="camera-ip" className="sr-only">
                Camera IP Address
              </label>
              <input
                id="camera-ip"
                name="camera-ip"
                type="text"
                required={!isSimulation}
                disabled={isSimulation}
                className={`appearance-none rounded-none relative block w-full px-3 py-3 border border-gray-700 text-white placeholder-gray-500 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm ${isSimulation ? 'bg-gray-700 opacity-50 cursor-not-allowed' : 'bg-gray-900'}`}
                placeholder="Camera IP (e.g., 192.168.5.41)"
                value={cameraIp}
                onChange={(e) => setCameraIp(e.target.value)}
              />
            </div>
          </div>

          <div className="pt-2">
            <label htmlFor="simulation-mode" className="flex items-center justify-between cursor-pointer p-2 rounded-lg hover:bg-gray-700/50 transition-colors">
                <span className="flex flex-col">
                    <span className="font-medium text-white">Simulation Mode</span>
                    <span className="text-sm text-gray-400">Test app without physical devices</span>
                </span>
                <div className="relative">
                    <input 
                        id="simulation-mode" 
                        type="checkbox" 
                        className="sr-only peer" 
                        checked={isSimulation} 
                        onChange={() => setIsSimulation(s => !s)} 
                    />
                    <div className="w-11 h-6 bg-gray-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </div>
            </label>
          </div>


          <div>
            <button
              type="submit"
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-blue-500"
            >
              {buttonText}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SettingsScreen;
