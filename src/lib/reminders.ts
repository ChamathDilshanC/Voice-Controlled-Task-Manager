// Reminder System for Tasks

import { Task } from "@/types/task";

export interface Reminder {
  id: string;
  taskId: string;
  reminderTime: Date;
  message: string;
  isActive: boolean;
  type: "notification" | "voice" | "both";
}

export class ReminderManager {
  private reminders: Map<string, Reminder> = new Map();
  private timeouts: Map<string, NodeJS.Timeout> = new Map();
  private onReminderTriggered?: (reminder: Reminder, task: Task) => void;

  constructor() {
    this.loadReminders();
  }

  public addReminder(
    taskId: string,
    reminderTime: Date,
    type: "notification" | "voice" | "both" = "both"
  ): string {
    const reminderId = this.generateId();
    const reminder: Reminder = {
      id: reminderId,
      taskId,
      reminderTime,
      message: `Reminder for your task`,
      isActive: true,
      type,
    };

    this.reminders.set(reminderId, reminder);
    this.scheduleReminder(reminder);
    this.saveReminders();

    return reminderId;
  }

  public removeReminder(reminderId: string): void {
    const timeout = this.timeouts.get(reminderId);
    if (timeout) {
      clearTimeout(timeout);
      this.timeouts.delete(reminderId);
    }

    this.reminders.delete(reminderId);
    this.saveReminders();
  }

  public updateReminder(reminderId: string, updates: Partial<Reminder>): void {
    const reminder = this.reminders.get(reminderId);
    if (!reminder) return;

    // Clear existing timeout
    const timeout = this.timeouts.get(reminderId);
    if (timeout) {
      clearTimeout(timeout);
    }

    // Update reminder
    const updatedReminder = { ...reminder, ...updates };
    this.reminders.set(reminderId, updatedReminder);

    // Reschedule if still active
    if (updatedReminder.isActive) {
      this.scheduleReminder(updatedReminder);
    }

    this.saveReminders();
  }

  public getRemindersForTask(taskId: string): Reminder[] {
    return Array.from(this.reminders.values()).filter(
      (r) => r.taskId === taskId
    );
  }

  public getAllActiveReminders(): Reminder[] {
    return Array.from(this.reminders.values()).filter((r) => r.isActive);
  }

  private scheduleReminder(reminder: Reminder): void {
    const now = new Date();
    const timeUntilReminder = reminder.reminderTime.getTime() - now.getTime();

    if (timeUntilReminder <= 0) {
      // Reminder time has passed, trigger immediately
      this.triggerReminder(reminder);
      return;
    }

    const timeout = setTimeout(() => {
      this.triggerReminder(reminder);
    }, timeUntilReminder);

    this.timeouts.set(reminder.id, timeout);
  }

  private triggerReminder(reminder: Reminder): void {
    // Mark as triggered (not active anymore)
    reminder.isActive = false;
    this.reminders.set(reminder.id, reminder);

    // Clean up timeout
    this.timeouts.delete(reminder.id);

    // Save changes
    this.saveReminders();

    // Trigger callback
    if (this.onReminderTriggered) {
      // We need the task details, so this will be handled by the component
      const task = this.getTaskById(reminder.taskId);
      if (task) {
        this.onReminderTriggered(reminder, task);
      }
    }
  }

  private getTaskById(taskId: string): Task | null {
    // This will be injected by the component
    const tasks = this.getStoredTasks();
    return tasks.find((t) => t.id === taskId) || null;
  }

  private getStoredTasks(): Task[] {
    try {
      const stored = localStorage.getItem("voice-task-manager-tasks");
      if (stored) {
        const parsed = JSON.parse(stored);
        return parsed.map((task: any) => ({
          ...task,
          createdAt: new Date(task.createdAt),
          updatedAt: new Date(task.updatedAt),
          dueDate: task.dueDate ? new Date(task.dueDate) : undefined,
        }));
      }
    } catch (error) {
      console.error("Error loading tasks for reminders:", error);
    }
    return [];
  }

  private saveReminders(): void {
    const remindersArray = Array.from(this.reminders.values());
    localStorage.setItem(
      "voice-task-reminders",
      JSON.stringify(remindersArray)
    );
  }

  private loadReminders(): void {
    try {
      const stored = localStorage.getItem("voice-task-reminders");
      if (stored) {
        const remindersArray: Reminder[] = JSON.parse(stored);

        remindersArray.forEach((reminder) => {
          reminder.reminderTime = new Date(reminder.reminderTime);
          this.reminders.set(reminder.id, reminder);

          if (reminder.isActive) {
            this.scheduleReminder(reminder);
          }
        });
      }
    } catch (error) {
      console.error("Error loading reminders:", error);
    }
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }

  public onReminder(callback: (reminder: Reminder, task: Task) => void): void {
    this.onReminderTriggered = callback;
  }

  // Smart reminder suggestions
  public suggestReminderTime(task: Task): Date[] {
    const suggestions: Date[] = [];
    const now = new Date();

    if (task.dueDate) {
      const dueDate = new Date(task.dueDate);

      // 1 day before due date
      const oneDayBefore = new Date(dueDate);
      oneDayBefore.setDate(oneDayBefore.getDate() - 1);
      oneDayBefore.setHours(9, 0, 0, 0); // 9 AM

      if (oneDayBefore > now) {
        suggestions.push(oneDayBefore);
      }

      // 1 hour before due date
      const oneHourBefore = new Date(dueDate);
      oneHourBefore.setHours(oneHourBefore.getHours() - 1);

      if (oneHourBefore > now) {
        suggestions.push(oneHourBefore);
      }
    }

    // Default suggestions
    if (suggestions.length === 0) {
      // Tomorrow at 9 AM
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(9, 0, 0, 0);
      suggestions.push(tomorrow);

      // Next week same time
      const nextWeek = new Date(now);
      nextWeek.setDate(nextWeek.getDate() + 7);
      suggestions.push(nextWeek);
    }

    return suggestions;
  }
}

// Notification utilities
export class NotificationManager {
  private hasPermission = false;

  constructor() {
    this.requestPermission();
  }

  private async requestPermission(): Promise<void> {
    if ("Notification" in window) {
      const permission = await Notification.requestPermission();
      this.hasPermission = permission === "granted";
    }
  }

  public showNotification(
    title: string,
    body: string,
    onClick?: () => void
  ): void {
    if (!this.hasPermission) {
      console.warn("Notification permission not granted");
      return;
    }

    const notification = new Notification(title, {
      body,
      icon: "/favicon.ico",
      badge: "/favicon.ico",
      tag: "task-reminder",
      requireInteraction: true,
    });

    if (onClick) {
      notification.onclick = onClick;
    }

    // Auto close after 10 seconds
    setTimeout(() => notification.close(), 10000);
  }
}

// Parse reminder time from speech
export function parseReminderFromSpeech(speech: string): Date | null {
  const text = speech.toLowerCase();
  const now = new Date();

  // "in 5 minutes"
  const minutesMatch = text.match(/in (\d+) minutes?/);
  if (minutesMatch) {
    const minutes = parseInt(minutesMatch[1]);
    const reminderTime = new Date(now);
    reminderTime.setMinutes(reminderTime.getMinutes() + minutes);
    return reminderTime;
  }

  // "in 1 hour"
  const hoursMatch = text.match(/in (\d+) hours?/);
  if (hoursMatch) {
    const hours = parseInt(hoursMatch[1]);
    const reminderTime = new Date(now);
    reminderTime.setHours(reminderTime.getHours() + hours);
    return reminderTime;
  }

  // "tomorrow at 9"
  if (text.includes("tomorrow")) {
    const timeMatch = text.match(/at (\d+)/);
    const reminderTime = new Date(now);
    reminderTime.setDate(reminderTime.getDate() + 1);

    if (timeMatch) {
      const hour = parseInt(timeMatch[1]);
      reminderTime.setHours(hour, 0, 0, 0);
    } else {
      reminderTime.setHours(9, 0, 0, 0); // Default to 9 AM
    }

    return reminderTime;
  }

  // "next week"
  if (text.includes("next week")) {
    const reminderTime = new Date(now);
    reminderTime.setDate(reminderTime.getDate() + 7);
    reminderTime.setHours(9, 0, 0, 0);
    return reminderTime;
  }

  return null;
}
