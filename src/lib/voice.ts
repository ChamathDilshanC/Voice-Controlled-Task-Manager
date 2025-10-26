// src/lib/voice.ts
// ------------------------------------------------------
// Voice Recognition and Speech Synthesis Utilities
// TypeScript-safe & stable version
// ------------------------------------------------------

export const voiceCommands = {
  createTask: ["create task", "add task", "new task", "make task"],
  completeTask: ["complete", "finish", "done", "mark complete"],
  showTasks: ["show tasks", "list tasks", "my tasks", "view tasks"],
  help: ["help", "what can you do", "commands"],
};

export interface VoiceConfig {
  wakeWord: string;
  language: string;
  continuous: boolean;
}

export interface TaskQuestion {
  id: string;
  question: string;
  field: keyof import("@/types/task").TaskFormData;
  type: "text" | "select" | "date";
  options?: string[];
  validation?: (value: string) => boolean;
  followUp?: string;
}

export class VoiceManager {
  private recognition: SpeechRecognition | null = null;
  private synthesis: SpeechSynthesis;
  private isListening = false;
  private isWaitingForWakeWord = false;
  private wakeWord = "hi voice";
  private onWakeWordDetected?: () => void;
  private onSpeechResult?: (text: string) => void;
  private onListeningStateChange?: (isListening: boolean) => void;
  private retryTimeoutId?: number;
  private retryCount = 0;
  private maxRetries = 3;
  private isRecognizing = false;
  private debug = true; // Enable debug logging
  private hasShownSecurityAlert = false;
  private permanentlyDisabled = false;

  constructor() {
    this.synthesis = window.speechSynthesis;

    if (this.isSpeechRecognitionSupported()) {
      this.initializeRecognition();
      console.log(
        "%c🎤 Voice Manager Initialized",
        "color: #10b981; font-weight: bold; font-size: 14px;",
        "\n✅ Speech recognition is supported in this browser" +
          "\n📍 Running on:",
        location.href +
          "\n💡 Say 'Hi Voice' to activate voice commands" +
          "\n\n⚠️ Note: Requires internet connection to reach Google Speech API"
      );
    } else {
      console.warn("Speech recognition is not supported in this browser");
    }
  }

  private log(msg: string) {
    if (this.debug) console.log(`[VoiceManager] ${msg}`);
  }

  private isSpeechRecognitionSupported(): boolean {
    return "webkitSpeechRecognition" in window || "SpeechRecognition" in window;
  }

  private initializeRecognition() {
    const SpeechRecognitionConstructor =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionConstructor) {
      console.error("Speech recognition not supported in this browser");
      return;
    }

    this.recognition = new SpeechRecognitionConstructor() as SpeechRecognition;
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = "en-US";

    // ------------------------
    // Recognition Handlers
    // ------------------------

    this.recognition!.onstart = () => {
      this.isRecognizing = true;
      this.isListening = true;
      // Don't reset retry count here - it should only be reset on successful recognition
      // or when explicitly starting wake word listening for the first time
      console.log("🎤 Recognition started - microphone is active");
      if (this.isWaitingForWakeWord) {
        console.log(`👂 Listening for wake word: "${this.wakeWord}"`);
      }
      this.onListeningStateChange?.(true);
    };

    this.recognition!.onaudiostart = () => {
      console.log("🔊 Audio input detected - microphone is receiving sound");
    };

    this.recognition!.onsoundstart = () => {
      console.log("📢 Sound detected - processing audio...");
    };

    this.recognition!.onspeechstart = () => {
      console.log("🗣️ Speech detected - recognizing words...");
    };

    this.recognition!.onspeechend = () => {
      console.log("🔇 Speech ended");
    };

    this.recognition!.onend = () => {
      this.isRecognizing = false;
      this.isListening = false;
      this.log("Recognition ended");
      this.onListeningStateChange?.(false);

      // Only restart if waiting for wake word, not permanently disabled, and haven't exceeded retries
      if (
        this.isWaitingForWakeWord &&
        !this.permanentlyDisabled &&
        this.retryCount < this.maxRetries
      ) {
        this.retryTimeoutId = window.setTimeout(() => {
          if (
            this.isWaitingForWakeWord &&
            !this.isRecognizing &&
            !this.permanentlyDisabled
          ) {
            this.safeStart();
          }
        }, 1500);
      }
    };

    this.recognition!.onresult = (event: SpeechRecognitionEvent) => {
      const lastResult = event.results[event.results.length - 1];
      if (lastResult.isFinal) {
        const transcript = lastResult[0].transcript.toLowerCase().trim();
        const confidence = lastResult[0].confidence;
        console.log(
          `🎤 Heard: "${transcript}" (confidence: ${(confidence * 100).toFixed(
            1
          )}%)`
        );

        // Reset retry count on successful speech recognition
        this.retryCount = 0;

        if (this.isWaitingForWakeWord) {
          console.log(
            `🔍 Checking for wake word "${this.wakeWord}" in: "${transcript}"`
          );
          if (transcript.includes(this.wakeWord)) {
            console.log("✅ Wake word detected!");
            this.handleWakeWordDetected();
          } else {
            console.log(
              `❌ Wake word not found. Try saying "${this.wakeWord}"`
            );
          }
        } else {
          this.onSpeechResult?.(transcript);
        }
      }
    };
    this.recognition!.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);

      if (this.retryTimeoutId) {
        clearTimeout(this.retryTimeoutId);
        this.retryTimeoutId = undefined;
      }

      switch (event.error) {
        case "network":
          const isLocalhost =
            location.hostname === "localhost" ||
            location.hostname === "127.0.0.1" ||
            location.hostname === "";
          const isHttps = location.protocol === "https:";

          if (!isHttps && !isLocalhost) {
            console.error(
              "❌ SpeechRecognition requires HTTPS or localhost. Current origin is not secure."
            );
            console.error(
              "Please access the app via https:// or localhost to use voice features."
            );
            this.isWaitingForWakeWord = false;
            this.permanentlyDisabled = true;

            if (!this.hasShownSecurityAlert) {
              this.hasShownSecurityAlert = true;
              alert(
                "Voice recognition requires HTTPS or localhost.\n\n" +
                  "Please access the app via:\n" +
                  "• https://your-domain.com\n" +
                  "• http://localhost:3000\n\n" +
                  "Voice features are disabled on insecure origins."
              );
            }
            break;
          }

          // If we're on localhost/https but still getting network errors, it might be a real network issue
          if (this.retryCount < this.maxRetries) {
            this.retryCount++;
            console.warn(
              `Network error in speech recognition. Retry ${this.retryCount}/${this.maxRetries} in 3 seconds...`
            );
            this.retryTimeoutId = window.setTimeout(() => {
              if (this.isWaitingForWakeWord && !this.isRecognizing) {
                this.safeStart();
              }
            }, 3000);
          } else {
            console.error("Max retries reached. Stopping speech recognition.");
            console.error(
              "💡 Tip: Make sure you've granted microphone permissions in your browser.\n" +
                "Go to: chrome://settings/content/siteDetails?site=http://localhost:3000"
            );
            this.isWaitingForWakeWord = false;
            this.permanentlyDisabled = true;
            this.onListeningStateChange?.(false);

            if (!this.hasShownSecurityAlert) {
              this.hasShownSecurityAlert = true;
              alert(
                "⚠️ Unable to connect to speech recognition service\n\n" +
                  "Possible causes:\n" +
                  "• Microphone permissions not granted\n" +
                  "• Microphone is being used by another app\n" +
                  "• Browser doesn't have microphone access\n" +
                  "• Firewall/antivirus blocking the connection\n\n" +
                  "Troubleshooting:\n" +
                  "1. Click the 🔒 or ℹ️ icon in the address bar\n" +
                  "2. Ensure microphone is set to 'Allow'\n" +
                  "3. Close other apps using your microphone\n" +
                  "4. Refresh the page and try again\n\n" +
                  "Voice features will be disabled until the page is refreshed."
              );
            }
          }
          break;

        case "not-allowed":
          alert(
            "Microphone access denied. Please allow microphone access and refresh."
          );
          this.isWaitingForWakeWord = false;
          this.onListeningStateChange?.(false);
          break;

        case "no-speech":
          console.warn(
            "⚠️ No speech detected. Make sure:\n" +
              "  • Your microphone is working and not muted\n" +
              "  • You're speaking clearly and loud enough\n" +
              "  • The correct microphone is selected in browser settings\n" +
              "  • No other app is using the microphone"
          );
          if (this.isWaitingForWakeWord && this.retryCount < this.maxRetries) {
            this.retryTimeoutId = window.setTimeout(() => {
              if (!this.isRecognizing) this.safeStart();
            }, 1000);
          }
          break;

        case "aborted":
          this.log("Speech recognition aborted intentionally.");
          break;

        default:
          console.warn("Unknown speech recognition error:", event.error);
          if (this.isWaitingForWakeWord && this.retryCount < this.maxRetries) {
            this.retryCount++;
            setTimeout(() => {
              if (!this.isRecognizing) this.safeStart();
            }, 2000);
          } else if (this.retryCount >= this.maxRetries) {
            console.error("Max retries reached for unknown error. Stopping.");
            this.isWaitingForWakeWord = false;
            this.onListeningStateChange?.(false);
          }
          break;
      }
    };
  }

  // ------------------------
  // Safe Start/Stop
  // ------------------------

  private safeStart() {
    // Don't start if permanently disabled
    if (this.permanentlyDisabled) {
      console.warn(
        "Voice recognition is permanently disabled due to security requirements"
      );
      return;
    }

    if (!this.recognition || this.isRecognizing) {
      if (!this.recognition) console.warn("Speech recognition unavailable");
      return;
    }

    try {
      this.recognition!.start();
      this.isRecognizing = true;
      this.log("Recognition started safely");
    } catch (error: any) {
      if (error.name === "InvalidStateError") {
        this.log("Recognition already running — syncing state");
        this.isRecognizing = true;
      } else {
        console.error("Error starting speech recognition:", error.message);
      }
    }
  }

  private safeStop() {
    if (this.recognition && this.isRecognizing) {
      try {
        this.recognition!.stop();
        this.isRecognizing = false;
        this.log("Recognition stopped safely");
      } catch (error) {
        console.error("Error stopping recognition:", error);
      }
    }
  }

  // ------------------------
  // Public API
  // ------------------------

  public startWakeWordListening() {
    this.isWaitingForWakeWord = true;
    // Only reset retry count if not already listening
    if (!this.isRecognizing) {
      this.retryCount = 0;
    }
    this.safeStart();
  }

  public stopWakeWordListening() {
    this.isWaitingForWakeWord = false;
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
      this.retryTimeoutId = undefined;
    }
    this.safeStop();
  }

  public startActiveListening() {
    this.isWaitingForWakeWord = false;
    this.safeStart();
  }

  public stopActiveListening() {
    this.safeStop();
  }

  public resetRetryCount() {
    this.retryCount = 0;
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
      this.retryTimeoutId = undefined;
    }
  }

  private handleWakeWordDetected() {
    this.isWaitingForWakeWord = false;
    this.resetRetryCount();
    this.onWakeWordDetected?.();
    this.speak("Hello! I'm listening. How can I help you with your tasks?");
  }

  public speak(text: string, callback?: () => void) {
    if (!this.synthesis) return;
    this.synthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.volume = 0.8;
    utterance.onend = () => callback?.();
    this.synthesis.speak(utterance);
  }

  // ------------------------
  // Event Bindings
  // ------------------------

  public onWakeWord(callback: () => void) {
    this.onWakeWordDetected = callback;
  }

  public onSpeech(callback: (text: string) => void) {
    this.onSpeechResult = callback;
  }

  public onListeningChange(callback: (isListening: boolean) => void) {
    this.onListeningStateChange = callback;
  }

  public isCurrentlyListening() {
    return this.isListening;
  }

  public isWaitingForWake() {
    return this.isWaitingForWakeWord;
  }

  public isDisabled() {
    return this.permanentlyDisabled;
  }

  public isSupported() {
    return this.recognition !== null;
  }

  public cleanup() {
    this.stopWakeWordListening();
    this.stopActiveListening();
    this.resetRetryCount();
  }
}

// ------------------------------------------------------
// Task Question Flow
// ------------------------------------------------------

export const taskQuestions: TaskQuestion[] = [
  {
    id: "title",
    question: "What would you like to call this task?",
    field: "title",
    type: "text",
    validation: (value) => value.trim().length > 0,
    followUp: "Got it!",
  },
  {
    id: "description",
    question:
      "Would you like to add a description? You can say 'skip' to continue.",
    field: "description",
    type: "text",
    followUp: "Description noted.",
  },
  {
    id: "priority",
    question: "What's the priority level? Say 'high', 'medium', or 'low'.",
    field: "priority",
    type: "select",
    options: ["high", "medium", "low"],
    validation: (value) =>
      ["high", "medium", "low"].includes(value.toLowerCase()),
    followUp: "Priority set.",
  },
  {
    id: "category",
    question:
      "What category is this task? For example: work, personal, shopping, or say 'skip'.",
    field: "category",
    type: "text",
    followUp: "Category added.",
  },
  {
    id: "dueDate",
    question:
      "When is this due? You can say things like 'today', 'tomorrow', 'next Friday', or 'skip'.",
    field: "dueDate",
    type: "date",
    followUp: "Due date set.",
  },
];

// ------------------------------------------------------
// Date Parsing Utility
// ------------------------------------------------------

export function parseDateFromSpeech(speech: string): string {
  const text = speech.toLowerCase();
  const today = new Date();

  if (text.includes("today")) return today.toISOString().split("T")[0];
  if (text.includes("tomorrow")) {
    const d = new Date(today);
    d.setDate(d.getDate() + 1);
    return d.toISOString().split("T")[0];
  }
  if (text.includes("next week")) {
    const d = new Date(today);
    d.setDate(d.getDate() + 7);
    return d.toISOString().split("T")[0];
  }
  if (text.includes("monday")) {
    const d = new Date(today);
    const diff = (1 + 7 - today.getDay()) % 7 || 7;
    d.setDate(today.getDate() + diff);
    return d.toISOString().split("T")[0];
  }
  return "";
}
