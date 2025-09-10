// Web Speech API Type Declarations

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  serviceURI: string;
  grammars: SpeechGrammarList;

  start(): void;
  stop(): void;
  abort(): void;

  onaudiostart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onaudioend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onerror:
    | ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any)
    | null;
  onnomatch:
    | ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any)
    | null;
  onresult:
    | ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any)
    | null;
  onsoundstart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onsoundend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onspeechstart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onspeechend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onstart: ((this: SpeechRecognition, ev: Event) => any) | null;
}

interface SpeechRecognitionStatic {
  new (): SpeechRecognition;
}

interface SpeechRecognitionEvent extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  readonly error: SpeechRecognitionErrorCode;
  readonly message: string;
}

type SpeechRecognitionErrorCode =
  | "aborted"
  | "audio-capture"
  | "bad-grammar"
  | "language-not-supported"
  | "network"
  | "no-speech"
  | "not-allowed"
  | "service-not-allowed";

interface SpeechRecognitionResult {
  readonly length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionResultList {
  readonly length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionAlternative {
  readonly transcript: string;
  readonly confidence: number;
}

interface SpeechGrammarList {
  readonly length: number;
  item(index: number): SpeechGrammar;
  [index: number]: SpeechGrammar;
  addFromURI(src: string, weight?: number): void;
  addFromString(string: string, weight?: number): void;
}

interface SpeechGrammar {
  src: string;
  weight: number;
}

// Speech Synthesis API
interface SpeechSynthesisUtterance {
  text: string;
  lang: string;
  voice: SpeechSynthesisVoice | null;
  volume: number;
  rate: number;
  pitch: number;

  onstart:
    | ((this: SpeechSynthesisUtterance, ev: SpeechSynthesisEvent) => any)
    | null;
  onend:
    | ((this: SpeechSynthesisUtterance, ev: SpeechSynthesisEvent) => any)
    | null;
  onerror:
    | ((this: SpeechSynthesisUtterance, ev: SpeechSynthesisErrorEvent) => any)
    | null;
  onpause:
    | ((this: SpeechSynthesisUtterance, ev: SpeechSynthesisEvent) => any)
    | null;
  onresume:
    | ((this: SpeechSynthesisUtterance, ev: SpeechSynthesisEvent) => any)
    | null;
  onmark:
    | ((this: SpeechSynthesisUtterance, ev: SpeechSynthesisEvent) => any)
    | null;
  onboundary:
    | ((this: SpeechSynthesisUtterance, ev: SpeechSynthesisEvent) => any)
    | null;
}

interface SpeechSynthesisEvent extends Event {
  readonly utterance: SpeechSynthesisUtterance;
  readonly charIndex: number;
  readonly elapsedTime: number;
  readonly name: string;
}

interface SpeechSynthesisErrorEvent extends SpeechSynthesisEvent {
  readonly error: SpeechSynthesisErrorCode;
}

type SpeechSynthesisErrorCode =
  | "canceled"
  | "interrupted"
  | "audio-busy"
  | "audio-hardware"
  | "network"
  | "synthesis-unavailable"
  | "synthesis-failed"
  | "language-unavailable"
  | "voice-unavailable"
  | "text-too-long"
  | "invalid-argument";

// Window interface extensions
declare global {
  interface Window {
    SpeechRecognition: SpeechRecognitionStatic;
    webkitSpeechRecognition: SpeechRecognitionStatic;
  }
}
