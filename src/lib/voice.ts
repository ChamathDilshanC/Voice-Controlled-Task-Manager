// Voice Recognition and Speech Synthesis Utilities

// Define voice command categories
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

  constructor() {
    this.synthesis = window.speechSynthesis;

    // Check if speech recognition is available
    if (this.isSpeechRecognitionSupported()) {
      this.initializeRecognition();
    } else {
      console.warn("Speech recognition is not supported in this browser");
    }
  }

  private isSpeechRecognitionSupported(): boolean {
    return "webkitSpeechRecognition" in window || "SpeechRecognition" in window;
  }

  private initializeRecognition() {
    if (
      !("webkitSpeechRecognition" in window) &&
      !("SpeechRecognition" in window)
    ) {
      console.error("Speech recognition not supported in this browser");
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    this.recognition = new SpeechRecognition();

    this.recognition!.continuous = true;
    this.recognition!.interimResults = true;
    this.recognition!.lang = "en-US";

    this.recognition!.onstart = () => {
      this.isListening = true;
      this.onListeningStateChange?.(true);
      // Reset retry count on successful start
      this.retryCount = 0;
    };

    this.recognition!.onend = () => {
      this.isListening = false;
      this.onListeningStateChange?.(false);

      // Only restart if we're still waiting for wake word and haven't exceeded retries
      if (this.isWaitingForWakeWord && this.retryCount < this.maxRetries) {
        this.retryTimeoutId = window.setTimeout(() => {
          if (this.isWaitingForWakeWord && !this.isListening) {
            this.startWakeWordListening();
          }
        }, 1000);
      }
    };
    this.recognition!.onresult = (event: any) => {
      const lastResult = event.results[event.results.length - 1];

      if (lastResult.isFinal) {
        const transcript = lastResult[0].transcript.toLowerCase().trim();

        if (this.isWaitingForWakeWord) {
          if (transcript.includes(this.wakeWord)) {
            this.handleWakeWordDetected();
          }
        } else {
          this.onSpeechResult?.(transcript);
        }
      }
    };

    this.recognition!.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);

      // Clear any existing retry timeout
      if (this.retryTimeoutId) {
        window.clearTimeout(this.retryTimeoutId);
        this.retryTimeoutId = undefined;
      }

      // Handle different types of errors
      switch (event.error) {
        case "network":
          if (this.retryCount < this.maxRetries) {
            this.retryCount++;
            console.warn(
              `Network error in speech recognition. Retry ${this.retryCount}/${this.maxRetries} in 3 seconds...`
            );
            this.retryTimeoutId = window.setTimeout(() => {
              if (this.isWaitingForWakeWord && !this.isListening) {
                this.startWakeWordListening();
              }
            }, 3000);
          } else {
            console.error(
              "Max retries reached for speech recognition network errors. Stopping retries."
            );
            this.isWaitingForWakeWord = false;
          }
          break;

        case "not-allowed":
          console.error(
            "Microphone access denied. Please allow microphone access and refresh."
          );
          this.isWaitingForWakeWord = false;
          break;

        case "no-speech":
          if (this.isWaitingForWakeWord && this.retryCount < this.maxRetries) {
            // Continue listening for wake word after a brief pause
            this.retryTimeoutId = window.setTimeout(() => {
              if (!this.isListening) {
                this.startWakeWordListening();
              }
            }, 1000);
          }
          break;

        case "audio-capture":
          console.error("Audio capture error. Check your microphone.");
          break;

        case "aborted":
          // Recognition was aborted, this is usually intentional
          console.log("Speech recognition aborted");
          break;

        default:
          console.error("Unknown speech recognition error:", event.error);
          // Try to restart after a delay for unknown errors
          setTimeout(() => {
            if (this.isWaitingForWakeWord) {
              this.startWakeWordListening();
            }
          }, 2000);
          break;
      }
    };
  }

  public startWakeWordListening() {
    if (!this.recognition || this.isListening) {
      if (!this.recognition) {
        console.warn("Speech recognition not available");
      } else {
        console.log("Speech recognition already listening");
      }
      return;
    }

    try {
      this.isWaitingForWakeWord = true;
      this.retryCount = 0; // Reset retry count on new start
      this.recognition.start();
    } catch (error: any) {
      console.error("Error starting speech recognition:", error.message);
      if (
        error.name === "InvalidStateError" &&
        error.message.includes("already started")
      ) {
        // Recognition is already running, just update our state
        console.log("Speech recognition was already running, syncing state");
        this.isListening = true;
        this.isWaitingForWakeWord = true;
      }
    }
  }

  public stopWakeWordListening() {
    this.isWaitingForWakeWord = false;

    // Clear any pending retries
    if (this.retryTimeoutId) {
      window.clearTimeout(this.retryTimeoutId);
      this.retryTimeoutId = undefined;
    }

    if (this.recognition && this.isListening) {
      try {
        this.recognition.stop();
      } catch (error) {
        console.error("Error stopping speech recognition:", error);
      }
    }
  }

  public resetRetryCount() {
    this.retryCount = 0;
    if (this.retryTimeoutId) {
      window.clearTimeout(this.retryTimeoutId);
      this.retryTimeoutId = undefined;
    }
  }

  public startActiveListening() {
    if (!this.recognition || this.isListening) {
      if (!this.recognition) {
        console.warn("Speech recognition not available");
      }
      return;
    }

    try {
      this.isWaitingForWakeWord = false;
      this.recognition.start();
    } catch (error) {
      console.error("Error starting active listening:", error);
    }
  }

  public stopActiveListening() {
    if (this.recognition && this.isListening) {
      try {
        this.recognition.stop();
      } catch (error) {
        console.error("Error stopping active listening:", error);
      }
    }
  }

  private handleWakeWordDetected() {
    this.isWaitingForWakeWord = false;
    this.resetRetryCount(); // Reset retry count on successful wake word detection
    this.onWakeWordDetected?.();
    this.speak("Hello! I'm listening. How can I help you with your tasks?");
  }

  public speak(text: string, callback?: () => void) {
    if (!this.synthesis) return;

    // Cancel any ongoing speech
    this.synthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.volume = 0.8;

    utterance.onend = () => {
      callback?.();
    };

    this.synthesis.speak(utterance);
  }

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

  public cleanup() {
    this.stopWakeWordListening();
    this.stopActiveListening();
    this.resetRetryCount();
  }
}

// Task creation questions flow
export const taskQuestions: TaskQuestion[] = [
  {
    id: "title",
    question: "What would you like to call this task?",
    field: "title",
    type: "text",
    validation: (value) => value.trim().length > 0,
    followUp: "Got it! ",
  },
  {
    id: "description",
    question:
      "Would you like to add a description? You can say 'skip' to continue.",
    field: "description",
    type: "text",
    followUp: "Description noted. ",
  },
  {
    id: "priority",
    question: "What's the priority level? Say 'high', 'medium', or 'low'.",
    field: "priority",
    type: "select",
    options: ["high", "medium", "low"],
    validation: (value) =>
      ["high", "medium", "low"].includes(value.toLowerCase()),
    followUp: "Priority set to ",
  },
  {
    id: "category",
    question:
      "What category is this task? For example: work, personal, shopping, or say 'skip'.",
    field: "category",
    type: "text",
    followUp: "Category added. ",
  },
  {
    id: "dueDate",
    question:
      "When is this due? You can say things like 'today', 'tomorrow', 'next Friday', or 'skip'.",
    field: "dueDate",
    type: "date",
    followUp: "Due date set. ",
  },
];

// Date parsing utility
export function parseDateFromSpeech(speech: string): string {
  const text = speech.toLowerCase();
  const today = new Date();

  if (text.includes("today")) {
    return today.toISOString().split("T")[0];
  }

  if (text.includes("tomorrow")) {
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split("T")[0];
  }

  if (text.includes("next week")) {
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);
    return nextWeek.toISOString().split("T")[0];
  }

  if (text.includes("monday")) {
    const nextMonday = new Date(today);
    const daysUntilMonday = (1 + 7 - today.getDay()) % 7 || 7;
    nextMonday.setDate(today.getDate() + daysUntilMonday);
    return nextMonday.toISOString().split("T")[0];
  }

  // Add more date parsing logic as needed
  return "";
}
