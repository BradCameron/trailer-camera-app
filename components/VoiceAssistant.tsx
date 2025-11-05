import React, { useState, useEffect, useCallback, useRef } from 'react';
// Fix: The 'LiveSession' type is not exported from the '@google/genai' package.
// It has been removed from the import statement to fix the error.
import { GoogleGenAI, LiveServerMessage, Modality, Blob, FunctionDeclaration, Type } from '@google/genai';
import { GUIDELINE_DISTANCES } from '../constants';

// --- Props and Types ---
interface VoiceAssistantProps {
    isOpen: boolean;
    onClose: () => void;
    distance: number | null;
    actions: {
        toggleMute: () => void;
        toggleMirror: () => void;
        toggleFlip: () => void;
        toggleFullscreen: () => void;
    };
}

type Status = 'IDLE' | 'LISTENING' | 'CONNECTING' | 'ERROR';

// --- Audio Helper Functions (as per Gemini Live API guidelines) ---

function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

function createBlob(data: Float32Array): Blob {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = data[i] * 32768;
  }
  return {
    data: encode(new Uint8Array(int16.buffer)),
    mimeType: 'audio/pcm;rate=16000',
  };
}

// --- Function Declarations for Voice Commands ---
const functionDeclarations: FunctionDeclaration[] = [
    { name: 'toggleMute', description: 'Toggles the audio beeper on or off.', parameters: { type: Type.OBJECT, properties: {} } },
    { name: 'toggleMirror', description: 'Mirrors the camera feed horizontally.', parameters: { type: Type.OBJECT, properties: {} } },
    { name: 'toggleFlip', description: 'Flips the camera feed vertically.', parameters: { type: Type.OBJECT, properties: {} } },
    { name: 'toggleFullscreen', description: 'Toggles fullscreen mode.', parameters: { type: Type.OBJECT, properties: {} } },
    { name: 'getHelp', description: 'Lists available voice commands.', parameters: { type: Type.OBJECT, properties: {} } },
];

const API_KEY = process.env.API_KEY;

// --- Component ---
const VoiceAssistant: React.FC<VoiceAssistantProps> = ({ isOpen, onClose, distance, actions }) => {
    const [status, setStatus] = useState<Status>('IDLE');
    const [userTranscript, setUserTranscript] = useState('');
    const [modelTranscript, setModelTranscript] = useState('');
    const [error, setError] = useState<string | null>(null);

    // Fix: The 'LiveSession' type is not exported. Using 'any' for the session promise type.
    const sessionPromiseRef = useRef<Promise<any> | null>(null);
    const inputAudioContextRef = useRef<AudioContext | null>(null);
    const outputAudioContextRef = useRef<AudioContext | null>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
    const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const nextStartTimeRef = useRef(0);
    const outputSourcesRef = useRef(new Set<AudioBufferSourceNode>());

    const isTooClose = distance !== null && distance < GUIDELINE_DISTANCES.red;

    const closeSession = useCallback(() => {
        if (sessionPromiseRef.current) {
            sessionPromiseRef.current.then(session => session.close()).catch(console.error);
            sessionPromiseRef.current = null;
        }

        if (scriptProcessorRef.current) {
            scriptProcessorRef.current.disconnect();
            scriptProcessorRef.current = null;
        }
        if (mediaStreamSourceRef.current) {
            mediaStreamSourceRef.current.disconnect();
            mediaStreamSourceRef.current = null;
        }
        if (inputAudioContextRef.current && inputAudioContextRef.current.state !== 'closed') {
            inputAudioContextRef.current.close().catch(console.error);
            inputAudioContextRef.current = null;
        }
        if (outputAudioContextRef.current && outputAudioContextRef.current.state !== 'closed') {
             outputAudioContextRef.current.close().catch(console.error);
             outputAudioContextRef.current = null;
        }
        if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach(track => track.stop());
            mediaStreamRef.current = null;
        }
        setStatus('IDLE');
        setUserTranscript('');
        setModelTranscript('');
    }, []);
    
    const startSession = useCallback(async () => {
        if (!API_KEY) {
            setError("AI assistant is not configured.");
            setStatus('ERROR');
            return;
        }
        if (isTooClose) {
            setError("Driving Focus Mode: Voice assistant disabled when object is critically close.");
            setStatus('ERROR');
            return;
        }

        setStatus('CONNECTING');
        setError(null);
        
        try {
            mediaStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
            
            inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
            outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
            nextStartTimeRef.current = 0;
            outputSourcesRef.current.clear();
            const outputNode = outputAudioContextRef.current.createGain();
            
            const ai = new GoogleGenAI({ apiKey: API_KEY });

            const sessionPromise = ai.live.connect({
                model: 'gemini-2.5-flash-native-audio-preview-09-2025',
                callbacks: {
                    onopen: () => {
                        const inputCtx = inputAudioContextRef.current;
                        const stream = mediaStreamRef.current;
                        if (!inputCtx || !stream) return;

                        const source = inputCtx.createMediaStreamSource(stream);
                        mediaStreamSourceRef.current = source;

                        const scriptProcessor = inputCtx.createScriptProcessor(4096, 1, 1);
                        scriptProcessorRef.current = scriptProcessor;

                        scriptProcessor.onaudioprocess = (event) => {
                            const inputData = event.inputBuffer.getChannelData(0);
                            const pcmBlob = createBlob(inputData);
                            sessionPromiseRef.current?.then(session => {
                                session.sendRealtimeInput({ media: pcmBlob });
                            });
                        };
                        source.connect(scriptProcessor);
                        scriptProcessor.connect(inputCtx.destination);
                        setStatus('LISTENING');
                    },
                    onmessage: async (message: LiveServerMessage) => {
                        // Handle Transcription
                        if (message.serverContent?.inputTranscription) {
                            setUserTranscript(t => t + message.serverContent.inputTranscription.text);
                        }
                        if (message.serverContent?.outputTranscription) {
                            setModelTranscript(t => t + message.serverContent.outputTranscription.text);
                        }
                        if (message.serverContent?.turnComplete) {
                            setTimeout(() => {
                                setUserTranscript('');
                                setModelTranscript('');
                            }, 3000);
                        }
                        
                        // Handle Function Calling
                        if (message.toolCall) {
                            for (const fc of message.toolCall.functionCalls) {
                                let result = "Command executed.";
                                switch(fc.name) {
                                    case 'toggleMute': actions.toggleMute(); break;
                                    case 'toggleMirror': actions.toggleMirror(); break;
                                    case 'toggleFlip': actions.toggleFlip(); break;
                                    case 'toggleFullscreen': actions.toggleFullscreen(); break;
                                    case 'getHelp': 
                                        result = "You can say: mute, mirror camera, flip camera, or toggle fullscreen.";
                                        setModelTranscript(result);
                                        break;
                                    default: result = `Unknown command: ${fc.name}`;
                                }
                                sessionPromiseRef.current?.then(session => {
                                    session.sendToolResponse({
                                        functionResponses: { id: fc.id, name: fc.name, response: { result: result } }
                                    });
                                });
                            }
                        }

                        // Handle Audio Output
                        const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
                        if (base64Audio && outputAudioContextRef.current) {
                            const outCtx = outputAudioContextRef.current;
                            nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outCtx.currentTime);
                            const audioBuffer = await decodeAudioData(decode(base64Audio), outCtx, 24000, 1);
                            const source = outCtx.createBufferSource();
                            source.buffer = audioBuffer;
                            source.connect(outputNode);
                            source.addEventListener('ended', () => {
                                outputSourcesRef.current.delete(source);
                            });
                            source.start(nextStartTimeRef.current);
                            nextStartTimeRef.current += audioBuffer.duration;
                            outputSourcesRef.current.add(source);
                        }

                        if (message.serverContent?.interrupted) {
                            for (const source of outputSourcesRef.current.values()) {
                                source.stop();
                                outputSourcesRef.current.delete(source);
                            }
                            nextStartTimeRef.current = 0;
                        }
                    },
                    onerror: (e: ErrorEvent) => {
                        console.error('Gemini Live API Error:', e);
                        setError("Connection error with AI assistant.");
                        setStatus('ERROR');
                        closeSession();
                    },
                    onclose: () => {
                        // The session may close naturally.
                    },
                },
                config: {
                    responseModalities: [Modality.AUDIO],
                    speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } },
                    systemInstruction: "You are 'Co-Pilot', a helpful assistant for drivers backing up trailers. Be extremely concise. For commands, just confirm the action. For questions, provide brief, safe advice.",
                    tools: [{ functionDeclarations }],
                    outputAudioTranscription: {},
                    inputAudioTranscription: {},
                },
            });
            sessionPromiseRef.current = sessionPromise;

        } catch (e: any) {
            console.error('Failed to start voice session:', e);
            if (e.name === 'NotAllowedError' || e.name === 'PermissionDeniedError') {
                 setError('Microphone permission denied. Please enable it in your browser settings.');
            } else {
                 setError('Could not access microphone.');
            }
            setStatus('ERROR');
            closeSession();
        }
    }, [actions, closeSession, isTooClose]);

    useEffect(() => {
        if (isOpen) {
            startSession();
        } else {
            closeSession();
        }
        return () => {
            closeSession();
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen]);

    if (!isOpen) {
        return null;
    }

    const getStatusText = () => {
        switch (status) {
            case 'CONNECTING': return "Connecting to Co-Pilot...";
            case 'LISTENING': return "Listening...";
            case 'ERROR': return "Error";
            default: return "Co-Pilot Assistant";
        }
    }

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-lg z-50 flex flex-col items-center justify-center p-4 text-white font-sans animate-fade-in">
            <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-full text-gray-400 hover:bg-gray-700 transition-colors" aria-label="Close Assistant">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            
            <div className="text-2xl font-bold mb-8">{getStatusText()}</div>

            <div className="relative w-48 h-48 flex items-center justify-center">
                 {status === 'LISTENING' && (
                    <>
                        <div className="absolute inset-0 bg-blue-500 rounded-full animate-pulse-slow opacity-30"></div>
                        <div className="absolute inset-2 bg-blue-500 rounded-full animate-pulse-medium opacity-40"></div>
                    </>
                 )}
                 <div className="relative w-32 h-32 bg-blue-600 rounded-full flex items-center justify-center shadow-2xl">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-16 h-16 text-white"> <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 016 0v8.25a3 3 0 01-3 3z" /> </svg>
                 </div>
            </div>

            <div className="mt-8 text-center min-h-[100px] w-full max-w-lg">
                {error && <div className="p-3 rounded-lg bg-red-900/50 text-red-300">{error}</div>}
                
                <p className="text-xl text-gray-300 h-10 transition-opacity duration-300" key={`user-${userTranscript}`}>
                    {userTranscript}
                </p>
                <p className="text-2xl font-semibold text-white h-14 transition-opacity duration-300" key={`model-${modelTranscript}`}>
                    {modelTranscript}
                </p>
            </div>
            
            <style>{`
                @keyframes fade-in { 0% { opacity: 0; } 100% { opacity: 1; } }
                .animate-fade-in { animation: fade-in 0.3s ease-in-out; }
                @keyframes pulse-slow { 0%, 100% { transform: scale(1); opacity: 0.3; } 50% { transform: scale(1.1); opacity: 0.1; } }
                .animate-pulse-slow { animation: pulse-slow 3s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
                @keyframes pulse-medium { 0%, 100% { transform: scale(1); opacity: 0.4; } 50% { transform: scale(1.05); opacity: 0.2; } }
                .animate-pulse-medium { animation: pulse-medium 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; animation-delay: 0.5s; }
            `}</style>
        </div>
    );
};

export default VoiceAssistant;