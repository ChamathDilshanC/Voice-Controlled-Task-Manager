"use client";

import TaskForm from "@/components/TaskForm";
import TaskList from "@/components/TaskList";
import VoiceIndicator from "@/components/VoiceIndicator";
import VoiceTaskCreator from "@/components/VoiceTaskCreator";
import { NotificationManager, ReminderManager } from "@/lib/reminders";
import { createTask, toggleTaskCompletion, updateTask } from "@/lib/utils";
import { VoiceManager, voiceCommands } from "@/lib/voice";
import { Task, TaskFormData } from "@/types/task";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | undefined>(undefined);
  const [isVoiceListening, setIsVoiceListening] = useState(false);
  const [isVoiceTaskCreatorOpen, setIsVoiceTaskCreatorOpen] = useState(false);
  const [isWaitingForWakeWord, setIsWaitingForWakeWord] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState<string>(
    "Ready for 'Hi Voice'"
  );

  // Voice and reminder managers
  const voiceManagerRef = useRef<VoiceManager | null>(null);
  const reminderManagerRef = useRef<ReminderManager | null>(null);
  const notificationManagerRef = useRef<NotificationManager | null>(null);

  // Initialize voice and reminder systems
  useEffect(() => {
    if (typeof window !== "undefined") {
      voiceManagerRef.current = new VoiceManager();
      reminderManagerRef.current = new ReminderManager();
      notificationManagerRef.current = new NotificationManager();

      const voiceManager = voiceManagerRef.current;
      const reminderManager = reminderManagerRef.current;
      const notificationManager = notificationManagerRef.current;

      // Set up wake word detection
      voiceManager.onWakeWord(() => {
        setIsWaitingForWakeWord(false);
        setVoiceStatus("Wake word detected! How can I help?");
        handleVoiceActivation();
      });

      // Set up listening state changes
      voiceManager.onListeningChange((listening) => {
        setIsVoiceListening(listening);
        if (listening && isWaitingForWakeWord) {
          setVoiceStatus("Listening for 'Hi Voice'...");
        }
      });

      // Set up voice command processing
      voiceManager.onSpeech(handleVoiceCommand);

      // Set up reminder callbacks
      reminderManager.onReminder((reminder, task) => {
        const message = `Reminder: ${task.title}`;

        if (reminder.type === "notification" || reminder.type === "both") {
          notificationManager.showNotification("Task Reminder", message, () => {
            // Focus the task when notification is clicked
            window.focus();
          });
        }

        if (reminder.type === "voice" || reminder.type === "both") {
          voiceManager.speak(
            `Reminder: It's time for your task "${task.title}"`
          );
        }
      });

      // Start listening for wake word
      startWakeWordListening();

      return () => {
        voiceManager.stopWakeWordListening();
        voiceManager.stopActiveListening();
      };
    }
  }, []);

  // Load tasks from localStorage on component mount
  useEffect(() => {
    const savedTasks = localStorage.getItem("voice-task-manager-tasks");
    if (savedTasks) {
      try {
        const parsedTasks = JSON.parse(savedTasks);
        const tasksWithDates = parsedTasks.map((task: any) => ({
          ...task,
          createdAt: new Date(task.createdAt),
          updatedAt: new Date(task.updatedAt),
          dueDate: task.dueDate ? new Date(task.dueDate) : undefined,
        }));
        setTasks(tasksWithDates);
      } catch (error) {
        console.error("Error loading tasks from localStorage:", error);
      }
    }
  }, []);

  // Save tasks to localStorage whenever tasks change
  useEffect(() => {
    localStorage.setItem("voice-task-manager-tasks", JSON.stringify(tasks));
  }, [tasks]);

  const startWakeWordListening = () => {
    if (voiceManagerRef.current && !isVoiceTaskCreatorOpen) {
      setIsWaitingForWakeWord(true);
      setVoiceStatus("Say 'Hi Voice' to activate");
      voiceManagerRef.current.startWakeWordListening();
    }
  };

  const handleVoiceActivation = () => {
    const voiceManager = voiceManagerRef.current;
    if (!voiceManager) return;

    setVoiceStatus("I'm listening! What would you like to do?");
    voiceManager.speak(
      "Hello! I'm your voice assistant. You can ask me to create a task, show your tasks, or complete a task. What would you like to do?",
      () => {
        voiceManager.startActiveListening();
      }
    );
  };

  const handleVoiceCommand = (transcript: string) => {
    const voiceManager = voiceManagerRef.current;
    if (!voiceManager) return;

    const command = transcript.toLowerCase().trim();
    setVoiceStatus(`Processing: "${command}"`);

    // Create task commands
    if (voiceCommands.createTask.some((cmd) => command.includes(cmd))) {
      voiceManager.stopActiveListening();
      voiceManager.speak(
        "I'll help you create a new task. Let me ask you a few questions.",
        () => {
          setIsVoiceTaskCreatorOpen(true);
        }
      );
      return;
    }

    // Complete task commands
    if (voiceCommands.completeTask.some((cmd) => command.includes(cmd))) {
      const taskToComplete = findTaskByCommand(command);
      if (taskToComplete) {
        handleToggleComplete(taskToComplete.id);
        voiceManager.speak(
          `Great! I've marked "${taskToComplete.title}" as completed.`,
          () => {
            setTimeout(startWakeWordListening, 2000);
          }
        );
      } else {
        voiceManager.speak(
          "I couldn't find a specific task to complete. Please say the task name more clearly.",
          () => {
            setTimeout(startWakeWordListening, 2000);
          }
        );
      }
      return;
    }

    // Show tasks commands
    if (voiceCommands.showTasks.some((cmd) => command.includes(cmd))) {
      const activeTasks = tasks.filter((t) => !t.completed);
      if (activeTasks.length === 0) {
        voiceManager.speak(
          "You have no active tasks. Great job staying organized!",
          () => {
            setTimeout(startWakeWordListening, 2000);
          }
        );
      } else {
        const taskList = activeTasks
          .slice(0, 5)
          .map((t) => t.title)
          .join(", ");
        voiceManager.speak(
          `You have ${activeTasks.length} active tasks. Here are your top tasks: ${taskList}`,
          () => {
            setTimeout(startWakeWordListening, 2000);
          }
        );
      }
      return;
    }

    // Help commands
    if (voiceCommands.help.some((cmd) => command.includes(cmd))) {
      voiceManager.speak(
        "I can help you create tasks, complete tasks, show your task list, or set reminders. Just say 'Hi Voice' and tell me what you'd like to do!",
        () => {
          setTimeout(startWakeWordListening, 2000);
        }
      );
      return;
    }

    // Default response
    voiceManager.speak(
      "I didn't understand that command. Try saying 'create task', 'show tasks', 'complete task', or ask for help.",
      () => {
        setTimeout(startWakeWordListening, 2000);
      }
    );
  };

  const findTaskByCommand = (command: string): Task | null => {
    // Try to find a task by matching words in the command with task titles
    const words = command.split(" ");

    for (const task of tasks.filter((t) => !t.completed)) {
      const taskWords = task.title.toLowerCase().split(" ");
      const matchScore = taskWords.reduce((score, word) => {
        return score + (words.includes(word) ? 1 : 0);
      }, 0);

      if (matchScore > 0) {
        return task;
      }
    }

    return null;
  };

  const handleCreateTask = (formData: TaskFormData) => {
    const newTask = createTask(formData);
    setTasks((prev) => [newTask, ...prev]);
    setIsFormOpen(false);
  };

  const handleVoiceTaskCreated = (formData: TaskFormData) => {
    const newTask = createTask(formData);
    setTasks((prev) => [newTask, ...prev]);
    setIsVoiceTaskCreatorOpen(false);

    const voiceManager = voiceManagerRef.current;
    if (voiceManager) {
      voiceManager.speak(
        `Perfect! I've created your task "${newTask.title}". Say 'Hi Voice' anytime you need help!`,
        () => {
          setTimeout(startWakeWordListening, 2000);
        }
      );
    }
  };

  const handleEditTask = (formData: TaskFormData) => {
    if (editingTask) {
      const updatedTask = updateTask(editingTask, formData);
      setTasks((prev) =>
        prev.map((task) => (task.id === editingTask.id ? updatedTask : task))
      );
      setEditingTask(undefined);
      setIsFormOpen(false);
    }
  };

  const handleToggleComplete = (taskId: string) => {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === taskId ? toggleTaskCompletion(task) : task
      )
    );
  };

  const handleDeleteTask = (taskId: string) => {
    setTasks((prev) => prev.filter((task) => task.id !== taskId));

    // Also remove any reminders for this task
    const reminderManager = reminderManagerRef.current;
    if (reminderManager) {
      const taskReminders = reminderManager.getRemindersForTask(taskId);
      taskReminders.forEach((reminder) => {
        reminderManager.removeReminder(reminder.id);
      });
    }
  };

  const handleEditClick = (task: Task) => {
    setEditingTask(task);
    setIsFormOpen(true);
  };

  const handleFormCancel = () => {
    setIsFormOpen(false);
    setEditingTask(undefined);
  };

  const handleVoiceTaskCancel = () => {
    setIsVoiceTaskCreatorOpen(false);
    setTimeout(startWakeWordListening, 1000);
  };

  const handleVoiceIndicatorToggle = () => {
    const voiceManager = voiceManagerRef.current;
    if (!voiceManager) return;

    if (isWaitingForWakeWord) {
      // Stop wake word listening
      voiceManager.stopWakeWordListening();
      setIsWaitingForWakeWord(false);
      setVoiceStatus("Voice assistant disabled");
    } else if (voiceManager.isCurrentlyListening()) {
      // Stop active listening
      voiceManager.stopActiveListening();
      setVoiceStatus("Voice assistant stopped");
    } else {
      // Start wake word listening
      startWakeWordListening();
    }
  };

  const completedCount = tasks.filter((task) => task.completed).length;
  const totalCount = tasks.length;
  const completionPercentage =
    totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return (
    <div className="min-h-screen w-full relative overflow-hidden">
      {/* Dark Horizon Glow Background */}
      <div
        className="absolute inset-0 z-0"
        style={{
          background:
            "radial-gradient(125% 125% at 50% 90%, #000000 40%, #0d1a36 100%)",
        }}
      />

      {/* Animated Background Elements */}
      <div className="absolute inset-0 z-0">
        <motion.div
          className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.1, 0.3],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute top-3/4 right-1/4 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl"
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.1, 0.3, 0.1],
          }}
          transition={{
            duration: 6,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 2,
          }}
        />
      </div>

      {/* Voice Status Indicator */}
      <motion.div
        className="fixed top-4 right-4 z-40"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <div
          className={`px-4 py-2 rounded-full text-sm font-medium backdrop-blur-sm border ${
            isWaitingForWakeWord
              ? "bg-blue-500/20 text-blue-200 border-blue-400/30"
              : isVoiceListening
              ? "bg-green-500/20 text-green-200 border-green-400/30"
              : "bg-gray-500/20 text-gray-200 border-gray-400/30"
          }`}
        >
          <div className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full ${
                isWaitingForWakeWord
                  ? "bg-blue-400 animate-pulse"
                  : isVoiceListening
                  ? "bg-green-400 animate-pulse"
                  : "bg-gray-400"
              }`}
            />
            {voiceStatus}
          </div>
        </div>
      </motion.div>

      {/* Content */}
      <div className="relative z-10">
        {/* Header */}
        <motion.header
          className="px-4 sm:px-6 lg:px-8 py-8"
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
              {/* Title Section */}
              <div className="text-center lg:text-left">
                <motion.div
                  className="inline-flex items-center gap-3 mb-4"
                  whileHover={{ scale: 1.05 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl">
                    <svg
                      className="w-8 h-8 text-white"
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
                  </div>
                  <div>
                    <h1 className="text-4xl lg:text-6xl font-bold bg-gradient-to-r from-white via-blue-100 to-purple-200 bg-clip-text text-transparent">
                      Voice Tasks
                    </h1>
                    <p className="text-lg text-blue-100/80 font-medium">
                      Say "Hi Voice" to get started
                    </p>
                  </div>
                </motion.div>

                <motion.p
                  className="text-gray-300 text-lg max-w-2xl"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3, duration: 0.8 }}
                >
                  Professional voice-controlled task management.
                  <br />
                  Create tasks, set reminders, and stay organized with AI.
                </motion.p>

                {/* Stats */}
                <motion.div
                  className="flex flex-wrap justify-center lg:justify-start gap-8 mt-8"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5, duration: 0.8 }}
                >
                  <div className="text-center">
                    <div className="text-3xl font-bold text-white">
                      {totalCount}+
                    </div>
                    <div className="text-sm text-blue-200">Tasks</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-white">
                      {Math.round(completionPercentage)}%
                    </div>
                    <div className="text-sm text-blue-200">Complete</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                      Voice
                    </div>
                    <div className="text-sm text-blue-200">Activated</div>
                  </div>
                </motion.div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4">
                <motion.button
                  onClick={() => setIsFormOpen(true)}
                  className="group relative px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl text-white font-semibold text-lg shadow-2xl overflow-hidden"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.7, duration: 0.5 }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-700 to-purple-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="relative flex items-center gap-3">
                    <motion.svg
                      className="w-6 h-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      whileHover={{ rotate: 90 }}
                      transition={{ duration: 0.3 }}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                      />
                    </motion.svg>
                    New Task
                  </div>
                </motion.button>
              </div>
            </div>
          </div>
        </motion.header>

        {/* Main Content */}
        <motion.main
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20"
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1, duration: 0.8 }}
        >
          <div className="bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl p-8">
            <TaskList
              tasks={tasks}
              onToggleComplete={handleToggleComplete}
              onDelete={handleDeleteTask}
              onEdit={handleEditClick}
            />
          </div>
        </motion.main>
      </div>

      {/* Task Form Modal */}
      <AnimatePresence>
        {isFormOpen && (
          <TaskForm
            task={editingTask}
            onSubmit={editingTask ? handleEditTask : handleCreateTask}
            onCancel={handleFormCancel}
            isOpen={isFormOpen}
          />
        )}
      </AnimatePresence>

      {/* Voice Task Creator */}
      <VoiceTaskCreator
        isActive={isVoiceTaskCreatorOpen}
        onTaskCreated={handleVoiceTaskCreated}
        onCancel={handleVoiceTaskCancel}
        voiceManager={voiceManagerRef.current!}
      />

      {/* Voice Indicator */}
      <VoiceIndicator
        isListening={isVoiceListening || isWaitingForWakeWord}
        onToggle={handleVoiceIndicatorToggle}
      />
    </div>
  );
}
