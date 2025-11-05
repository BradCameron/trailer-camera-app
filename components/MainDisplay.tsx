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
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-1.007 1.113-1.113l.448-.113a9.002 9.002 0 011.713 0l.448.113c.552.106 1.023.571 1.113 1.113l.063.376a9.003 9.003 0 012.573 2.572l.376.063c.542.09 1.007.56 1.113 1.113l.113.448c.098.572.098 1.141 0 1.713l-.113.448c-.106.552-.571 1.023-1.113 1.113l-.376.063a9.003 9.003 0 01-2.572 2.573l-.063.376c-.09.542-.56 1.007-1.113 1.113l-.448-.113a9.002 9.002 0 01-1.713 0l-.448-.113c-.552-.106-1.023-.571-1.113-1.113l-.063-.376a9.003 9.003 0 01-2.573-2.572l-.376-.063c-.542-.09-1.007-.56-1.113-1.113l-.113-.448a9.002 9.002 0 010-1.713l.113.448c.106-.552.571-1.023-1.113-1.113l.376-.063a9.003 9.003 0 012.572-2.573l.063-.376z" />
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
  const [isCamLoading, setIsCamLoading] = useState(false);

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
    // The lockOrientation() call can fail if the document is not fullscreen.
    // This was likely causing a crash on start. It's better to let the user
    // rely on device auto-rotation or lock orientation after entering fullscreen.
    // lockOrientation(); 
    setIsStarted(true);
  };

  const videoUrl = useMemo(() => {
    if (!isStarted) return '';
    if (isSimulationMode) {
      return 'https://placehold.co/1280x720/2d3748/ffffff?text=Simulated+Camera+Feed';
    }
    return `http://${cameraIp}/stream`;
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
        setIsCamLoading(false);
      }
  }, [isSimulationMode, clearCamLoadTimeout]);

  const handleCamLoadSuccess = useCallback(() => {
    clearCamLoadTimeout();
    setCamError(false);
    setIsCamLoading(false);
  }, [clearCamLoadTimeout]);

  useEffect(() => {
    if (isStarted && videoUrl && !isSimulationMode) {
        clearCamLoadTimeout();
        setCamError(false);
        setIsCamLoading(true);
        camLoadTimeoutRef.current = setTimeout(() => {
            const img = document.getElementById('camera-stream') as HTMLImageElement;
            if (img && img.naturalWidth === 0) {
                console.error("Camera stream timed out.");
                handleCamError();
            }
        }, 8000);
    }
    return () => {
        clearCamLoadTimeout();
    };
  }, [isStarted, videoUrl, isSimulationMode, handleCamError, clearCamLoadTimeout]);

  return (
    <div className="relative w-full h-full overflow-hidden bg-black">
      {isStarted && videoUrl && !camError && (
        <img
            id="camera-stream"
            key={videoUrl}
            src={videoUrl}
            onLoad={handleCamLoadSuccess}
            onError={handleCamError}
            className={`absolute top-0 left-0 w-full h-full object-cover transition-transform duration-200 ease-in-out ${isCamLoading ? 'opacity-0' : 'opacity-100'}`}
            style={{ transform: `${isMirrored ? 'scaleX(-1)' : ''} ${isFlipped ? 'scaleY(-1)' : ''}` }}
            alt="Camera Feed"
        />
      )}
      
      {isStarted && (
        <>
            <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
                <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
                    <defs>
                        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                            <feGaussianBlur stdDeviation="0.5" result="coloredBlur"/>
                            <feMerge>
                                <feMergeNode in="coloredBlur"/>
                                <feMergeNode in="SourceGraphic"/>
                            </feMerge>
                        </filter>
                    </defs>
                    
                    {/* Center Line */}
                    <line x1="50" y1="40" x2="50" y2="100" stroke="rgba(255, 255, 255, 0.4)" strokeWidth="0.3" strokeDasharray="2 2" />

                    {/* Green (Farthest) */}
                    <path d="M 35 100 Q 45 70 47 40" stroke={GUIDELINE_COLORS.green} strokeWidth="0.75" fill="none" filter="url(#glow)" />
                    <path d="M 65 100 Q 55 70 53 40" stroke={GUIDELINE_COLORS.green} strokeWidth="0.75" fill="none" filter="url(#glow)" />

                    {/* Yellow (Middle) */}
                    <path d="M 38 100 Q 46 80 48 60" stroke={GUIDELINE_COLORS.yellow} strokeWidth="0.75" fill="none" filter="url(#glow)" />
                    <path d="M 62 100 Q 54 80 52 60" stroke={GUIDELINE_COLORS.yellow} strokeWidth="0.75" fill="none" filter="url(#glow)" />

                    {/* Red (Closest) */}
                    <path d="M 41 100 Q 48 90 49 80" stroke={GUIDELINE_COLORS.red} strokeWidth="1" fill="none" filter="url(#glow)" />
                    <path d="M 59 100 Q 52 90 51 80" stroke={GUIDELINE_COLORS.red} strokeWidth="1" fill="none" filter="url(#glow)" />
                </svg>
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
                        <span className="text-3xl sm:text-4xl font-mono font-bold" style={{ color: barHexColor, textShadow: '1px 1px 3px rgba(0,0,0,0.7)' }}>
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
        </>
      )}

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
        <div className="absolute inset-0 bg-gray-900 flex flex-col justify-center items-center z-10 p-4 text-center">
          <div className="mb-6 text-blue-400">
             <svg xmlns="http://www.w3.org/2000/svg" className="h-20 w-20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.776 48.776 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Z" />
            </svg>
          </div>
          <h2 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">Trailer Backup System</h2>
          <p className="text-gray-400 mt-4 text-lg">Tap Start to activate camera and sensors.</p>
          <button onClick={handleStart} className="mt-10 flex items-center justify-center gap-3 bg-green-600 hover:bg-green-700 text-white font-bold py-4 px-10 rounded-full text-xl transition-transform hover:scale-105 shadow-lg shadow-green-600/30">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" />
            </svg>
            <span>START</span>
          </button>
        </div>
      )}
      
      {isCamLoading && !camError && isStarted && (
        <div className="absolute inset-0 bg-black/60 flex flex-col justify-center items-center z-20 backdrop-blur-sm text-center p-4">
          <svg className="animate-spin h-10 w-10 text-white mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <h2 className="text-2xl font-bold text-white">Connecting to Camera...</h2>
          <p className="text-gray-300 mt-2">Attempting to load stream from {cameraIp}</p>
        </div>
      )}

      {camError && isStarted && (
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