import React, { useState, useMemo, useCallback, useEffect, FormEvent, useRef } from 'react';
import { GoogleGenAI, Chat } from '@google/genai';
import { useBackupSensor } from '../hooks/useBackupSensor';
import { useAudioBeeper } from '../hooks/useAudioBeeper';
import { useScreenControls } from '../hooks/useScreenControls';
import { GUIDELINE_DISTANCES, GUIDELINE_COLORS, MAX_SENSOR_DISTANCE_IN } from '../constants';

// --- Start of AI Chat Panel Component ---

interface Message {
  role: 'user' | 'model';
  text: string;
}

interface ChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const API_KEY = process.env.API_KEY;

// SVG Icons for Chat
const CloseIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
);

const SendIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
    </svg>
);

const ChatPanel: React.FC<ChatPanelProps> = ({ isOpen, onClose }) => {
    const [input, setInput] = useState('');
    const [history, setHistory] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    const chatRef = useRef<Chat | null>(null);
    const messagesEndRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const storedHistory = localStorage.getItem('chatHistory');
        if (storedHistory) {
            setHistory(JSON.parse(storedHistory));
        }

        if (!API_KEY) {
            setError("AI assistant is not configured.");
            console.warn("API_KEY environment variable not set. Chat feature disabled.");
            return;
        }
        try {
            const ai = new GoogleGenAI({ apiKey: API_KEY });
            const chat = ai.chats.create({
                model: 'gemini-2.5-flash',
                config: {
                    systemInstruction: "You are a helpful assistant for drivers backing up trailers. Your name is 'Co-Pilot'. Provide clear, concise, and safe advice. You can answer questions about trailer safety, maneuvering techniques, and general driving tips. Keep your answers brief and to the point.",
                },
            });
            chatRef.current = chat;
        } catch (e: any) {
            console.error("Failed to initialize Gemini:", e);
            setError("Failed to initialize AI assistant.");
        }
    }, []);

    useEffect(() => {
        if (history.length > 0) {
            localStorage.setItem('chatHistory', JSON.stringify(history));
        }
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [history]);

    const handleSendMessage = async (e: FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading || !chatRef.current) return;

        const userMessage: Message = { role: 'user', text: input };
        setHistory(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);
        setError(null);

        try {
            const response = await chatRef.current.sendMessage({ message: userMessage.text });
            const modelMessage: Message = { role: 'model', text: response.text };
            setHistory(prev => [...prev, modelMessage]);
        } catch (e: any) {
            console.error("Gemini API error:", e);
            const friendlyError = "Sorry, I couldn't get a response. Please check your connection and try again.";
            setError(friendlyError);
            setHistory(prev => [...prev, {role: 'model', text: friendlyError}]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className={`fixed top-0 right-0 h-full w-full max-w-md bg-gray-800/80 backdrop-blur-md shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
            <div className="flex flex-col h-full">
                <header className="flex items-center justify-between p-4 border-b border-gray-700 flex-shrink-0">
                    <h2 className="text-xl font-bold text-white">Co-Pilot Assistant</h2>
                    <button onClick={onClose} className="p-1 rounded-full text-gray-400 hover:bg-gray-700 hover:text-white transition-colors" aria-label="Close chat">
                        <CloseIcon className="w-6 h-6" />
                    </button>
                </header>

                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {history.map((msg, index) => (
                        <div key={index} className={`flex items-end gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            {msg.role === 'model' && <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">CP</div>}
                            <div className={`max-w-xs md:max-w-sm px-4 py-2 rounded-2xl ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-gray-700 text-gray-200 rounded-bl-none'}`}>
                                <p className="text-sm" style={{ whiteSpace: 'pre-wrap' }}>{msg.text}</p>
                            </div>
                        </div>
                    ))}
                    {isLoading && (
                        <div className="flex items-end gap-2 justify-start">
                             <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">CP</div>
                             <div className="px-4 py-2 rounded-2xl bg-gray-700 rounded-bl-none">
                                <div className="flex items-center space-x-1 h-5">
                                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse [animation-delay:-0.3s]"></div>
                                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse [animation-delay:-0.15s]"></div>
                                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
                                </div>
                             </div>
                        </div>
                    )}
                     <div ref={messagesEndRef} />
                </div>
                
                {error && !isLoading && <div className="p-4 text-center text-red-400 text-sm flex-shrink-0">{error}</div>}

                <footer className="p-4 border-t border-gray-700 flex-shrink-0">
                    <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder={error ? "AI unavailable" : "Ask for trailer advice..."}
                            className="flex-1 w-full px-4 py-2 bg-gray-900 border border-gray-600 rounded-full text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                            disabled={isLoading || error !== null}
                        />
                        <button type="submit" className="flex-shrink-0 w-10 h-10 flex items-center justify-center bg-blue-600 rounded-full text-white hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors" disabled={!input.trim() || isLoading || error !== null}>
                            <SendIcon className="w-5 h-5" />
                        </button>
                    </form>
                </footer>
            </div>
        </div>
    );
};

// --- End of AI Chat Panel Component ---


interface MainDisplayProps {
  sensorIp: string;
  cameraIp: string;
  onShowSettings: () => void;
  isSimulationMode: boolean;
}

const SettingsIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-1.007 1.113-1.113l.448-.113a9.002 9.002 0 011.713 0l.448.113c.552.106 1.023.571 1.113 1.113l.063.376a9.003 9.003 0 012.573 2.572l.376.063c.542.09 1.007.56 1.113 1.113l.113.448c.098.572.098 1.141 0 1.713l-.113.448c-.106.552-.571 1.023-1.113 1.113l-.376.063a9.003 9.003 0 01-2.572 2.573l-.063.376c-.09.542-.56 1.007-1.113 1.113l-.448.113a9.002 9.002 0 01-1.713 0l-.448-.113c-.552-.106-1.023-.571-1.113-1.113l-.063-.376a9.003 9.003 0 01-2.573-2.572l-.376-.063c-.542-.09-1.007-.56-1.113-1.113l-.113-.448a9.002 9.002 0 010-1.713l.113-.448c.106-.552.571-1.023-1.113-1.113l.376-.063a9.003 9.003 0 012.572-2.573l.063-.376z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
);

const SpeakerWaveIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 0 1 0 12.728M16.463 8.288a5.25 5.25 0 0 1 0 7.424M6.75 8.25l4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.009 9.009 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z" />
    </svg>
);

const SpeakerXMarkIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 9.75 19.5 12m0 0 2.25 2.25M19.5 12l2.25-2.25M19.5 12l-2.25 2.25m-10.5-6 4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.009 9.009 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z" />
    </svg>
);

const ChatIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.76 9.76 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.455.09-.934.09-1.425v-2.134c0-2.639 3.03-4.75 6.75-4.75 3.72 0 6.75 2.111 6.75 4.75z" />
    </svg>
);

const ExpandIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m-4.5 11.25l-4.5 4.5m0 0v-4.5m4.5 4.5h-4.5M15 15l4.5 4.5m0-4.5v4.5m0-4.5h-4.5" />
    </svg>
);

const CompressIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5M15 15l5.25 5.25" />
    </svg>
);

const WakeLockIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0z" />
    </svg>
);


const MainDisplay: React.FC<MainDisplayProps> = ({ sensorIp, cameraIp, onShowSettings, isSimulationMode }) => {
  const [isStarted, setIsStarted] = useState(false);
  const [isMuted, setIsMuted] = useState<boolean>(() => localStorage.getItem('isMuted') === 'true');
  const [isChatOpen, setIsChatOpen] = useState(false);
  
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

  useEffect(() => {
    localStorage.setItem('isMuted', String(isMuted));
  }, [isMuted]);

  useEffect(() => {
    // Cleanup on unmount
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

  const barWidth = useMemo(() => {
    if (distance === null || distance <= 0) return 0;
    return Math.max(0, Math.min(100, (1 - (distance / MAX_SENSOR_DISTANCE_IN)) * 100));
  }, [distance]);

  const barColor = useMemo(() => {
    if (distance === null) return 'bg-green-500';
    if (distance <= GUIDELINE_DISTANCES.red) return 'bg-red-500';
    if (distance <= GUIDELINE_DISTANCES.yellow) return 'bg-amber-500';
    return 'bg-green-500';
  }, [distance]);
  
  const sortedGuidelines = useMemo(() => 
    Object.entries(GUIDELINE_DISTANCES).sort(([, distA], [, distB]) => distA - distB), 
  []);

  const handleCamError = useCallback(() => {
      if (!isSimulationMode) {
        setCamError(true);
      }
  }, [isSimulationMode]);

  return (
    <div className="relative w-full h-full overflow-hidden bg-black">
      {/* Video Stream */}
      <img
        id="camera-stream"
        src={videoUrl}
        onError={handleCamError}
        className={`absolute top-0 left-0 w-full h-full object-cover transition-transform duration-200 ease-in-out ${isStarted ? 'opacity-100' : 'opacity-0'}`}
        style={{ transform: `${isMirrored ? 'scaleX(-1)' : ''} ${isFlipped ? 'scaleY(-1)' : ''}` }}
        alt="Camera Feed"
      />
      
      {/* Guidelines Overlay */}
      <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 h-full w-0.5 bg-white/50 shadow-lg"></div>
          {sortedGuidelines.map(([colorKey, guideDist]) => {
              const bottomPercent = 15 + ((MAX_SENSOR_DISTANCE_IN - guideDist) / MAX_SENSOR_DISTANCE_IN) * 70;
              const widthPercent = 40 + (guideDist / MAX_SENSOR_DISTANCE_IN) * 40;
              return (
                  <React.Fragment key={colorKey}>
                      <div
                          className="absolute left-1/2 -translate-x-1/2 h-0.5 shadow-lg"
                          style={{
                              bottom: `${bottomPercent}%`,
                              width: `${widthPercent}%`,
                              backgroundColor: GUIDELINE_COLORS[colorKey],
                              boxShadow: `0 0 8px ${GUIDELINE_COLORS[colorKey]}`
                          }}
                      />
                      <div 
                          className="absolute left-1/2 -translate-x-1/2 text-sm font-bold"
                          style={{
                              bottom: `calc(${bottomPercent}% + 8px)`,
                              color: GUIDELINE_COLORS[colorKey],
                              textShadow: '1px 1px 3px rgba(0,0,0,0.8)'
                          }}
                      >
                         {guideDist} in
                      </div>
                  </React.Fragment>
              )
          })}
      </div>

      {/* Info & Controls Overlay */}
      <div className="absolute inset-0 flex flex-col justify-between items-center p-2 sm:p-4 pointer-events-none">
        <div className="bg-black/60 rounded-lg p-2 sm:p-4 text-center pointer-events-auto mt-2">
            <div className="text-3xl sm:text-5xl font-mono font-bold" style={{ color: barColor.replace('bg-','text-') }}>
              {distance !== null && distance >= 0 ? `${distance.toFixed(1)} in` : '--.- in'}
            </div>
            <div className="w-48 sm:w-64 h-5 bg-gray-700/80 rounded-full overflow-hidden mt-2 border-2 border-gray-600">
                <div 
                    className={`h-full ${barColor} transition-all duration-300 ease-out`}
                    style={{width: `${barWidth}%`}}
                ></div>
            </div>
            <div className="flex items-center justify-center gap-2 text-xs text-gray-400 mt-1">
              <span className="capitalize">{isSimulationMode ? 'Simulation' : connectionStatus}</span>
              {isWakeLockActive && (
                  <span className="flex items-center" title="Screen Wake Lock is Active">
                      <WakeLockIcon className="w-4 h-4 text-amber-400" />
                  </span>
              )}
            </div>
        </div>
        
        <div className="flex items-center gap-2 sm:gap-4 p-2 bg-black/60 rounded-full pointer-events-auto mb-2">
            <button onClick={toggleFullscreen} className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center bg-gray-600/80 hover:bg-gray-500/80 rounded-full transition-colors" aria-label={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}>
              {isFullscreen 
                  ? <CompressIcon className="w-6 h-6 sm:w-7 sm:h-7 text-white" /> 
                  : <ExpandIcon className="w-6 h-6 sm:w-7 sm:h-7 text-white" />}
            </button>
            <button onClick={onShowSettings} className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center bg-gray-600/80 hover:bg-gray-500/80 rounded-full transition-colors" aria-label="Settings">
                <SettingsIcon className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
            </button>
            <button onClick={() => setIsChatOpen(true)} className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center bg-purple-600/80 hover:bg-purple-500/80 rounded-full transition-colors" aria-label="Co-Pilot Assistant">
                <ChatIcon className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
            </button>
             <button
                onClick={() => setIsMuted(m => !m)}
                className={`w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-full transition-colors ${isMuted ? 'bg-gray-600/80 hover:bg-gray-500/80' : 'bg-green-600/80 hover:bg-green-500/80'}`}
                aria-label={isMuted ? "Unmute" : "Mute"}
            >
                {isMuted
                    ? <SpeakerXMarkIcon className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                    : <SpeakerWaveIcon className="w-6 h-6 sm:w-7 sm:h-7 text-white" />}
            </button>
            <button onClick={() => setIsFlipped(f => !f)} className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center bg-blue-600/80 hover:bg-blue-500/80 rounded-full transition-colors" aria-label="Flip Vertically">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 sm:w-7 sm:h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 12L4 9m3 7l3-3m-3 3h10a2 2 0 002-2V7a2 2 0 00-2-2H7" /></svg>
            </button>
            <button onClick={() => setIsMirrored(m => !m)} className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center bg-blue-600/80 hover:bg-blue-500/80 rounded-full transition-colors" aria-label="Mirror Horizontally">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 sm:w-7 sm:h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 16V4m0 12L9 9m3 7l3-3m-3 3h2a2 2 0 002-2V7a2 2 0 00-2-2h-2" /></svg>
            </button>
        </div>
      </div>

      <ChatPanel isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />

      {!isStarted && (
        <div className="absolute inset-0 bg-black/80 flex flex-col justify-center items-center z-10 backdrop-blur-sm">
          <h2 className="text-3xl font-bold">Trailer Backup System</h2>
          <p className="text-gray-400 mt-2">Tap to enable sound and start camera feed</p>
          <button
            onClick={handleStart}
            className="mt-8 bg-green-600 hover:bg-green-700 text-white font-bold py-4 px-8 rounded-lg text-xl transition-transform hover:scale-105"
          >
            START
          </button>
        </div>
      )}
      {camError && (
        <div className="absolute inset-0 bg-red-900/90 flex flex-col justify-center items-center z-20 backdrop-blur-sm">
          <h2 className="text-3xl font-bold text-white">Camera Error</h2>
          <p className="text-red-200 mt-2">Could not load video stream.</p>
          <p className="text-red-300 mt-1">Check camera IP and network connection.</p>
           <button
            onClick={onShowSettings}
            className="mt-8 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-transform hover:scale-105"
          >
            Go to Settings
          </button>
        </div>
      )}
    </div>
  );
};

export default MainDisplay;