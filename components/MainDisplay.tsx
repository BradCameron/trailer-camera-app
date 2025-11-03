import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useBackupSensor } from '../hooks/useBackupSensor';
import { useAudioBeeper } from '../hooks/useAudioBeeper';
import { useScreenControls } from '../hooks/useScreenControls';
import { GUIDELINE_DISTANCES, GUIDELINE_COLORS, MAX_SENSOR_DISTANCE_IN } from '../constants';
import VoiceAssistant from './VoiceAssistant';


interface MainDisplayProps {
  sensorIp: string;
  cameraIp: string;
  onShowSettings: () => void;
  isSimulationMode: boolean;
}

// --- Control Icons ---

const SettingsIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-1.007 1.113-1.113l.448-.113a9.002 9.002 0 011.713 0l.448.113c.552.106 1.023.571 1.113 1.113l.063.376a9.003 9.003 0 012.573 2.572l.376.063c.542.09 1.007.56 1.113 1.113l.113.448c.098.572.098 1.141 0 1.713l-.113.448c-.106.552-.571 1.023-1.113 1.113l-.376.063a9.003 9.003 0 01-2.572 2.573l-.063.376c-.09.542-.56 1.007-1.113 1.113l-.448.113a9.002 9.002 0 01-1.713 0l-.448-.113c-.552-.106-1.023-.571-1.113-1.113l-.063-.376a9.003 9.003 0 01-2.573-2.572l-.376-.063c-.542-.09-1.007-.56-1.113-1.113l-.113-.448a9.002 9.002 0 010-1.713l.113-.448c.106-.552.571-1.023-1.113-1.113l.376-.063a9.003 9.003 0 012.572-2.573l.063-.376z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
);
const SpeakerWaveIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => ( <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}> <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 0 1 0 12.728M16.463 8.288a5.25 5.25 0 0 1 0 7.424M6.75 8.25l4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.009 9.009 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z" /> </svg> );
const SpeakerXMarkIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => ( <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}> <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 9.75 19.5 12m0 0 2.25 2.25M19.5 12l2.25-2.25M19.5 12l-2.25 2.25m-10.5-6 4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.009 9.009 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z" /> </svg> );
const MicrophoneIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => ( <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}> <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 016 0v8.25a3 3 0 01-3 3z" /> </svg> );
const ExpandIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => ( <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}> <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m-4.5 11.25l-4.5 4.5m0 0v-4.5m4.5 4.5h-4.5M15 15l4.5 4.5m0-4.5v4.5m0-4.5h-4.5" /> </svg> );
const CompressIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => ( <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}> <path strokeLinecap="round" strokeLinejoin="round" d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5M15 15l5.25 5.25" /> </svg> );
const WakeLockIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => ( <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}> <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0z" /> </svg> );
const FlipVerticalIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => ( <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}> <path strokeLinecap="round" strokeLinejoin="round" d="M3 12h18M9 4.5l3 3m0 0l3-3m-3 3v10.5m-3 3l3-3m0 0l3 3m-3-3V8.5" /> </svg>);
const MirrorHorizontalIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => ( <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}> <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v18M4.5 9l3 3m0 0l-3 3m3-3h10.5m3 3l-3-3m0 0l3-3m-3 3H8.5" /> </svg>);

const MainDisplay: React.FC<MainDisplayProps> = ({ sensorIp, cameraIp, onShowSettings, isSimulationMode }) => {
  const [isStarted, setIsStarted] = useState(false);
  const [isMuted, setIsMuted] = useState<boolean>(() => localStorage.getItem('isMuted') === 'true');
  const [isVoiceAssistantOpen, setIsVoiceAssistantOpen] = useState(false);
  
  const { distance, connectionStatus } = useBackupSensor(
    isStarted ? (isSimulationMode ? 'simulation' : sensorIp) : null,
    isSimulationMode
  );
  const { initializeAudio } = useAudioBeeper(distance, isMuted);
  
  const [isMirrored, setIsMirrored] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);
  const [camError, setCamError] = useState(false);
  
  const { 
    isFullscreen, 
    toggleFullscreen, 
    isWakeLockActive, 
    requestWakeLock, 
    releaseWakeLock, 
    lockOrientation, 
    unlockOrientation 
  } = useScreenControls();

  const camLoadTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleToggleMute = useCallback(() => setIsMuted(m => !m), []);
  const handleToggleMirror = useCallback(() => setIsMirrored(m => !m), []);
  const handleToggleFlip = useCallback(() => setIsFlipped(f => !f), []);

  useEffect(() => {
    localStorage.setItem('isMuted', String(isMuted));
  }, [isMuted]);

  useEffect(() => {
    return () => {
        releaseWakeLock();
        unlockOrientation();
    };
  }, [releaseWakeLock, unlockOrientation]);

  const handleStart = () => {
    initializeAudio();
    requestWakeLock();
    lockOrientation();
    setIsStarted(true);
  };

  const videoUrl = useMemo(() => {
    if (!isStarted) return '';
    if (isSimulationMode) {
      return 'https://placehold.co/1280x720/2d3748/ffffff?text=Simulated+Camera+Feed';
    }
    return `http://${cameraIp}/stream?timestamp=${new Date().getTime()}`;
  }, [isStarted, cameraIp, isSimulationMode]);
  
  const barHexColor = useMemo(() => {
    if (distance === null) return GUIDELINE_COLORS.green;
    if (distance <= GUIDELINE_DISTANCES.red) return GUIDELINE_COLORS.red;
    if (distance <= GUIDELINE_DISTANCES.yellow) return GUIDELINE_COLORS.yellow;
    return GUIDELINE_COLORS.green;
  }, [distance]);

  const connectionStatusColor = useMemo(() => {
    if (isSimulationMode) return 'bg-purple-500';
    switch (connectionStatus) {
        case 'Connected': return 'bg-green-500';
        case 'Connecting': return 'bg-yellow-500 animate-pulse';
        case 'Error': return 'bg-red-500';
        case 'Disconnected':
        default: return 'bg-gray-500';
    }
  }, [connectionStatus, isSimulationMode]);
  
  const sortedGuidelines = useMemo(() => 
    Object.entries(GUIDELINE_DISTANCES).sort(([, distA], [, distB]) => distA - distB), 
  []);

  const clearCamLoadTimeout = useCallback(() => {
    if (camLoadTimeoutRef.current) {
        clearTimeout(camLoadTimeoutRef.current);
        camLoadTimeoutRef.current = null;
    }
  }, []);

  const handleCamError = useCallback(() => {
      if (!isSimulationMode) {
        clearCamLoadTimeout();
        setCamError(true);
      }
  }, [isSimulationMode, clearCamLoadTimeout]);

  const handleCamLoadSuccess = useCallback(() => {
    clearCamLoadTimeout();
    setCamError(false);
  }, [clearCamLoadTimeout]);

  useEffect(() => {
    if (isStarted && videoUrl && !isSimulationMode) {
        clearCamLoadTimeout();
        camLoadTimeoutRef.current = setTimeout(() => {
            const img = document.getElementById('camera-stream') as HTMLImageElement;
            if (img && img.naturalWidth === 0) {
                console.error("Camera stream timed out.");
                setCamError(true);
            }
        }, 5000); // 5 second timeout
    }
    return () => {
        clearCamLoadTimeout();
    };
  }, [isStarted, videoUrl, isSimulationMode, setCamError, clearCamLoadTimeout]);

  return (
    <div className="relative w-full h-full overflow-hidden bg-black">
      <img
        id="camera-stream"
        src={videoUrl}
        onLoad={handleCamLoadSuccess}
        onError={handleCamError}
        className={`absolute top-0 left-0 w-full h-full object-cover transition-transform duration-200 ease-in-out ${isStarted ? 'opacity-100' : 'opacity-0'}`}
        style={{ transform: `${isMirrored ? 'scaleX(-1)' : ''} ${isFlipped ? 'scaleY(-1)' : ''}` }}
        alt="Camera Feed"
      />
      
      <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 h-full w-0.5 bg-white/50 shadow-lg"></div>
          {sortedGuidelines.map(([colorKey, guideDist]) => {
              const bottomPercent = 15 + ((MAX_SENSOR_DISTANCE_IN - guideDist) / MAX_SENSOR_DISTANCE_IN) * 70;
              const widthPercent = 40 + (guideDist / MAX_SENSOR_DISTANCE_IN) * 40;
              return (
                  <React.Fragment key={colorKey}>
                      <div className="absolute left-1/2 -translate-x-1/2 h-0.5 shadow-lg" style={{ bottom: `${bottomPercent}%`, width: `${widthPercent}%`, backgroundColor: GUIDELINE_COLORS[colorKey], boxShadow: `0 0 8px ${GUIDELINE_COLORS[colorKey]}` }}/>
                      <div className="absolute left-1/2 -translate-x-1/2 text-sm font-bold" style={{ bottom: `calc(${bottomPercent}% + 8px)`, color: GUIDELINE_COLORS[colorKey], textShadow: '1px 1px 3px rgba(0,0,0,0.8)' }}> {guideDist} in </div>
                  </React.Fragment>
              )
          })}
      </div>

      <div className="absolute top-0 inset-x-0 p-3 sm:p-4 bg-black/60 backdrop-blur-sm pointer-events-auto shadow-lg">
        <div className="flex items-center gap-4">
            <div className="flex-1">
                <div className="w-full bg-gray-700 rounded-full h-6 overflow-hidden border-2 border-gray-500">
                    <div
                      className="h-full rounded-full transition-all duration-300 ease-out"
                      style={{
                        width: `${distance !== null ? Math.max(0, 100 - (distance / MAX_SENSOR_DISTANCE_IN) * 100) : 0}%`,
                        backgroundColor: barHexColor
                      }}
                    />
                </div>
            </div>
            <div className="text-right w-28">
                <span className="text-3xl sm:text-4xl font-mono font-bold" style={{ color: barHexColor }}>
                    {distance !== null && distance >= 0 ? distance.toFixed(1) : '--.-'}
                </span>
                <span className="text-lg text-gray-300 ml-1">in</span>
            </div>
        </div>
        <div className="flex items-center justify-end gap-3 text-xs text-gray-300 mt-2">
            <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${connectionStatusColor}`}></span>
                <span>{isSimulationMode ? 'Simulation Mode' : connectionStatus}</span>
            </div>
            {isWakeLockActive && <div className="flex items-center gap-1"><WakeLockIcon className="w-3 h-3 text-amber-400" /><span>Screen Active</span></div>}
        </div>
      </div>
        
      <div className="absolute bottom-0 inset-x-0 flex justify-center p-2 sm:p-4 pointer-events-none">
        <div className="flex items-center gap-2 sm:gap-3 p-2 bg-black/50 backdrop-blur-md rounded-full pointer-events-auto">
            <button onClick={toggleFullscreen} className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center bg-gray-600/80 hover:bg-gray-500/80 rounded-full transition-colors" aria-label={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}> {isFullscreen ? <CompressIcon className="w-6 h-6 sm:w-7 sm:h-7 text-white" /> : <ExpandIcon className="w-6 h-6 sm:w-7 sm:h-7 text-white" />} </button>
            <button onClick={onShowSettings} className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center bg-gray-600/80 hover:bg-gray-500/80 rounded-full transition-colors" aria-label="Settings"> <SettingsIcon className="w-6 h-6 sm:w-7 sm:h-7 text-white" /> </button>
            <button onClick={() => setIsVoiceAssistantOpen(true)} className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center bg-purple-600/80 hover:bg-purple-500/80 rounded-full transition-colors" aria-label="Co-Pilot Assistant"> <MicrophoneIcon className="w-6 h-6 sm:w-7 sm:h-7 text-white" /> </button>
            <button onClick={handleToggleMute} className={`w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-full transition-colors ${isMuted ? 'bg-gray-600/80 hover:bg-gray-500/80' : 'bg-green-600/80 hover:bg-green-500/80'}`} aria-label={isMuted ? "Unmute" : "Mute"}> {isMuted ? <SpeakerXMarkIcon className="w-6 h-6 sm:w-7 sm:h-7 text-white" /> : <SpeakerWaveIcon className="w-6 h-6 sm:w-7 sm:h-7 text-white" />} </button>
            <button onClick={handleToggleFlip} className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center bg-blue-600/80 hover:bg-blue-500/80 rounded-full transition-colors" aria-label="Flip Vertically"> <FlipVerticalIcon className="w-6 h-6 sm:w-7 sm:h-7 text-white" /> </button>
            <button onClick={handleToggleMirror} className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center bg-blue-600/80 hover:bg-blue-500/80 rounded-full transition-colors" aria-label="Mirror Horizontally"> <MirrorHorizontalIcon className="w-6 h-6 sm:w-7 sm:h-7 text-white" /> </button>
        </div>
      </div>

      <VoiceAssistant 
        isOpen={isVoiceAssistantOpen} 
        onClose={() => setIsVoiceAssistantOpen(false)} 
        distance={distance}
        actions={{
            toggleMute: handleToggleMute,
            toggleMirror: handleToggleMirror,
            toggleFlip: handleToggleFlip,
            toggleFullscreen: toggleFullscreen,
        }}
        />

      {!isStarted && (
        <div className="absolute inset-0 bg-black/80 flex flex-col justify-center items-center z-10 backdrop-blur-sm">
          <h2 className="text-3xl font-bold">Trailer Backup System</h2>
          <p className="text-gray-400 mt-2">Tap to enable sound and start camera feed</p>
          <button onClick={handleStart} className="mt-8 bg-green-600 hover:bg-green-700 text-white font-bold py-4 px-8 rounded-lg text-xl transition-transform hover:scale-105"> START </button>
        </div>
      )}
      {camError && (
        <div className="absolute inset-0 bg-red-900/90 flex flex-col justify-center items-center z-20 backdrop-blur-sm text-center p-4">
          <h2 className="text-3xl font-bold text-white">Camera Error</h2>
          <p className="text-red-200 mt-2">Could not load video stream. The connection may have timed out.</p>
          <p className="text-red-300 mt-1">Please check the camera IP address and your network connection.</p>
           <button onClick={onShowSettings} className="mt-8 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-transform hover:scale-105"> Go to Settings </button>
        </div>
      )}
    </div>
  );
};

export default MainDisplay;