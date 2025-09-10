"use client";

import { parseReminderFromSpeech } from "@/lib/reminders";
import { VoiceManager, parseDateFromSpeech, taskQuestions } from "@/lib/voice";
import { TaskFormData } from "@/types/task";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";

interface VoiceTaskCreatorProps {
  isActive: boolean;
  onTaskCreated: (taskData: TaskFormData) => void;
  onCancel: () => void;
  voiceManager: VoiceManager;
}

export default function VoiceTaskCreator({
  isActive,
  onTaskCreated,
  onCancel,
  voiceManager,
}: VoiceTaskCreatorProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [taskData, setTaskData] = useState<TaskFormData>({
    title: "",
    description: "",
    priority: "medium",
    category: "",
    dueDate: "",
  });
  const [isListening, setIsListening] = useState(false);
  const [currentTranscript, setCurrentTranscript] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [needsReminder, setNeedsReminder] = useState(false);
  const [reminderTime, setReminderTime] = useState<Date | null>(null);

  const currentQuestion = taskQuestions[currentQuestionIndex];

  useEffect(() => {
    if (!isActive) {
      resetCreator();
      return;
    }

    // Start with first question
    askCurrentQuestion();

    // Set up voice recognition
    voiceManager.onSpeech(handleSpeechResult);
    voiceManager.onListeningChange(setIsListening);

    return () => {
      voiceManager.stopActiveListening();
    };
  }, [isActive]);

  const resetCreator = () => {
    setCurrentQuestionIndex(0);
    setTaskData({
      title: "",
      description: "",
      priority: "medium",
      category: "",
      dueDate: "",
    });
    setCurrentTranscript("");
    setIsProcessing(false);
    setNeedsReminder(false);
    setReminderTime(null);
  };

  const askCurrentQuestion = () => {
    if (currentQuestionIndex >= taskQuestions.length) {
      // Ask about reminder
      if (!needsReminder) {
        voiceManager.speak(
          "Great! Your task is ready. Would you like to set a reminder? Say 'yes' to add a reminder or 'no' to finish.",
          () => {
            setNeedsReminder(true);
            voiceManager.startActiveListening();
          }
        );
        return;
      }

      // Finish task creation
      finishTaskCreation();
      return;
    }

    const question = taskQuestions[currentQuestionIndex];
    voiceManager.speak(question.question, () => {
      voiceManager.startActiveListening();
    });
  };

  const handleSpeechResult = (transcript: string) => {
    setCurrentTranscript(transcript);
    setIsProcessing(true);

    // Add delay to prevent processing partial speech
    setTimeout(() => {
      processAnswer(transcript);
    }, 1000);
  };

  const processAnswer = (answer: string) => {
    const lowerAnswer = answer.toLowerCase().trim();

    // Handle reminder question
    if (needsReminder && !reminderTime) {
      if (lowerAnswer.includes("no") || lowerAnswer.includes("skip")) {
        finishTaskCreation();
        return;
      }

      if (lowerAnswer.includes("yes")) {
        voiceManager.speak(
          "When would you like to be reminded? You can say things like 'in 30 minutes', 'tomorrow at 9', or 'next week'.",
          () => {
            voiceManager.startActiveListening();
          }
        );
        return;
      }

      // Try to parse reminder time
      const parsedTime = parseReminderFromSpeech(lowerAnswer);
      if (parsedTime) {
        setReminderTime(parsedTime);
        const timeStr = parsedTime.toLocaleString();
        voiceManager.speak(
          `Reminder set for ${timeStr}. Creating your task now!`,
          () => {
            finishTaskCreation();
          }
        );
        return;
      } else {
        voiceManager.speak(
          "I didn't understand that time. Please try again or say 'no' to skip the reminder.",
          () => {
            voiceManager.startActiveListening();
          }
        );
        return;
      }
    }

    if (currentQuestionIndex >= taskQuestions.length) return;

    const question = currentQuestion;
    let processedAnswer = lowerAnswer;

    // Skip handling
    if (
      lowerAnswer.includes("skip") ||
      lowerAnswer.includes("no") ||
      lowerAnswer === ""
    ) {
      if (question.field === "title") {
        voiceManager.speak(
          "Task title is required. Please tell me what you'd like to call this task.",
          () => {
            voiceManager.startActiveListening();
          }
        );
        setIsProcessing(false);
        return;
      }

      // Skip optional fields
      nextQuestion();
      return;
    }

    // Process based on question type
    switch (question.field) {
      case "title":
        setTaskData((prev) => ({ ...prev, title: answer.trim() }));
        break;

      case "description":
        setTaskData((prev) => ({ ...prev, description: answer.trim() }));
        break;

      case "priority":
        const priority =
          ["high", "medium", "low"].find((p) => processedAnswer.includes(p)) ||
          "medium";
        setTaskData((prev) => ({
          ...prev,
          priority: priority as "low" | "medium" | "high",
        }));
        processedAnswer = priority;
        break;

      case "category":
        setTaskData((prev) => ({ ...prev, category: answer.trim() }));
        break;

      case "dueDate":
        const parsedDate = parseDateFromSpeech(processedAnswer);
        if (parsedDate) {
          setTaskData((prev) => ({ ...prev, dueDate: parsedDate }));
          processedAnswer = new Date(parsedDate).toLocaleDateString();
        }
        break;
    }

    // Provide feedback and move to next question
    const followUp = question.followUp || "";
    const feedback =
      question.field === "dueDate"
        ? `${followUp}${processedAnswer}.`
        : `${followUp}${processedAnswer}.`;

    voiceManager.speak(feedback, () => {
      nextQuestion();
    });
  };

  const nextQuestion = () => {
    setIsProcessing(false);
    setCurrentTranscript("");
    setCurrentQuestionIndex((prev) => prev + 1);

    setTimeout(() => {
      askCurrentQuestion();
    }, 500);
  };

  const finishTaskCreation = () => {
    voiceManager.stopActiveListening();
    onTaskCreated(taskData);

    // If reminder is set, we'll handle it in the parent component
    if (reminderTime) {
      // This will be handled by passing reminderTime back to parent
    }
  };

  const handleCancel = () => {
    voiceManager.speak("Task creation cancelled.", () => {
      voiceManager.stopActiveListening();
      onCancel();
    });
  };

  if (!isActive) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="bg-gradient-to-br from-blue-900/95 to-purple-900/95 backdrop-blur-xl rounded-3xl border border-white/20 shadow-2xl max-w-2xl w-full p-8"
          initial={{ scale: 0.8, y: 50 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.8, y: 50 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
        >
          {/* Header */}
          <div className="text-center mb-8">
            <motion.div
              className="mx-auto w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center mb-4"
              animate={
                isListening
                  ? {
                      scale: [1, 1.1, 1],
                      boxShadow: [
                        "0 0 0 0 rgba(59, 130, 246, 0.7)",
                        "0 0 0 10px rgba(59, 130, 246, 0)",
                        "0 0 0 20px rgba(59, 130, 246, 0)",
                      ],
                    }
                  : {}
              }
              transition={{ duration: 1.5, repeat: isListening ? Infinity : 0 }}
            >
              <svg
                className="w-10 h-10 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                />
              </svg>
            </motion.div>

            <h2 className="text-3xl font-bold text-white mb-2">
              Voice Task Creator
            </h2>
            <p className="text-blue-200">
              {isListening ? "I'm listening..." : "Getting ready to listen..."}
            </p>
          </div>

          {/* Progress */}
          <div className="mb-8">
            <div className="flex justify-between text-sm text-blue-200 mb-2">
              <span>Progress</span>
              <span>
                {Math.min(currentQuestionIndex + 1, taskQuestions.length)} /{" "}
                {taskQuestions.length}
              </span>
            </div>
            <div className="w-full bg-white/10 rounded-full h-2">
              <motion.div
                className="h-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
                initial={{ width: "0%" }}
                animate={{
                  width: `${
                    (Math.min(currentQuestionIndex + 1, taskQuestions.length) /
                      taskQuestions.length) *
                    100
                  }%`,
                }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>

          {/* Current Question */}
          <div className="bg-white/5 rounded-2xl p-6 mb-6">
            <h3 className="text-xl font-semibold text-white mb-4">
              {currentQuestionIndex < taskQuestions.length
                ? currentQuestion?.question
                : needsReminder && !reminderTime
                ? "Would you like to set a reminder?"
                : "Creating your task..."}
            </h3>

            {currentTranscript && (
              <motion.div
                className="bg-blue-500/20 rounded-xl p-4 mt-4"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <p className="text-blue-100">
                  <span className="text-blue-300 font-medium">You said:</span> "
                  {currentTranscript}"
                </p>
                {isProcessing && (
                  <div className="mt-2 flex items-center gap-2 text-blue-300">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-300"></div>
                    Processing...
                  </div>
                )}
              </motion.div>
            )}
          </div>

          {/* Current Task Data Preview */}
          {taskData.title && (
            <motion.div
              className="bg-gradient-to-r from-green-500/10 to-blue-500/10 rounded-2xl p-4 mb-6 border border-green-400/20"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <h4 className="text-green-300 font-medium mb-2">Task Preview:</h4>
              <div className="space-y-1 text-sm">
                <div className="text-white">
                  <span className="text-green-200">Title:</span>{" "}
                  {taskData.title}
                </div>
                {taskData.description && (
                  <div className="text-white">
                    <span className="text-green-200">Description:</span>{" "}
                    {taskData.description}
                  </div>
                )}
                <div className="text-white">
                  <span className="text-green-200">Priority:</span>{" "}
                  {taskData.priority}
                </div>
                {taskData.category && (
                  <div className="text-white">
                    <span className="text-green-200">Category:</span>{" "}
                    {taskData.category}
                  </div>
                )}
                {taskData.dueDate && (
                  <div className="text-white">
                    <span className="text-green-200">Due:</span>{" "}
                    {new Date(taskData.dueDate).toLocaleDateString()}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-4">
            <motion.button
              onClick={handleCancel}
              className="flex-1 bg-red-600/20 border border-red-500/30 text-red-300 py-3 px-6 rounded-xl font-medium hover:bg-red-600/30 transition-colors"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Cancel
            </motion.button>

            {taskData.title && (
              <motion.button
                onClick={finishTaskCreation}
                className="flex-1 bg-gradient-to-r from-green-600 to-blue-600 text-white py-3 px-6 rounded-xl font-medium shadow-lg hover:shadow-green-500/25 transition-all"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Create Task Now
              </motion.button>
            )}
          </div>

          {/* Listening Indicator */}
          {isListening && (
            <motion.div
              className="absolute -bottom-6 left-1/2 transform -translate-x-1/2"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="bg-blue-500 text-white px-4 py-2 rounded-full text-sm font-medium shadow-lg flex items-center gap-2">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                Listening...
              </div>
            </motion.div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
