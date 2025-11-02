import React, { useState, useEffect, useCallback } from 'react';
import MainDisplay from './components/MainDisplay';
import SettingsScreen from './components/SettingsScreen';

const App: React.FC = () => {
  const [isConfigured, setIsConfigured] = useState<boolean>(false);
  const [sensorIp, setSensorIp] = useState<string>('');
  const [cameraIp, setCameraIp] = useState<string>('');
  const [isSimulationMode, setIsSimulationMode] = useState<boolean>(false);

  useEffect(() => {
    const storedSensorIp = localStorage.getItem('sensorIp');
    const storedCameraIp = localStorage.getItem('cameraIp');
    const storedIsSimulation = localStorage.getItem('isSimulationMode') === 'true';

    if ((storedSensorIp && storedCameraIp) || storedIsSimulation) {
      setSensorIp(storedSensorIp || '');
      setCameraIp(storedCameraIp || '');
      setIsSimulationMode(storedIsSimulation);
      setIsConfigured(true);
    }
  }, []);

  const handleSaveSettings = useCallback((newSensorIp: string, newCameraIp: string, isSimulation: boolean) => {
    localStorage.setItem('sensorIp', newSensorIp);
    localStorage.setItem('cameraIp', newCameraIp);
    localStorage.setItem('isSimulationMode', String(isSimulation));
    setSensorIp(newSensorIp);
    setCameraIp(newCameraIp);
    setIsSimulationMode(isSimulation);
    setIsConfigured(true);
  }, []);
  
  const handleShowSettings = useCallback(() => {
      setIsConfigured(false);
  }, []);

  return (
    <div className="w-screen h-screen bg-black text-white antialiased">
      {isConfigured ? (
        <MainDisplay 
          sensorIp={sensorIp} 
          cameraIp={cameraIp} 
          onShowSettings={handleShowSettings}
          isSimulationMode={isSimulationMode}
        />
      ) : (
        <SettingsScreen 
            onSave={handleSaveSettings} 
            initialSensorIp={sensorIp}
            initialCameraIp={cameraIp}
            initialIsSimulation={isSimulationMode}
        />
      )}
    </div>
  );
};

export default App;
