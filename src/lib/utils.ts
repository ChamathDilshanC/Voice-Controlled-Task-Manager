import { Task, TaskFormData } from "@/types/task";

// Generate unique ID for tasks
export function generateTaskId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

// Create a new task from form data
export function createTask(formData: TaskFormData): Task {
  const now = new Date();
  return {
    id: generateTaskId(),
    title: formData.title,
    description: formData.description,
    completed: false,
    priority: formData.priority,
    category: formData.category,
    createdAt: now,
    updatedAt: now,
    dueDate: formData.dueDate ? new Date(formData.dueDate) : undefined,
  };
}

// Update an existing task
export function updateTask(task: Task, updates: Partial<TaskFormData>): Task {
  return {
    ...task,
    ...updates,
    updatedAt: new Date(),
    dueDate: updates.dueDate ? new Date(updates.dueDate) : task.dueDate,
  };
}

// Toggle task completion status
export function toggleTaskCompletion(task: Task): Task {
  return {
    ...task,
    completed: !task.completed,
    updatedAt: new Date(),
  };
}

// Sort tasks by priority
export function sortTasksByPriority(tasks: Task[]): Task[] {
  const priorityOrder = { high: 3, medium: 2, low: 1 };
  return tasks.sort(
    (a, b) => priorityOrder[b.priority] - priorityOrder[a.priority]
  );
}

// Filter tasks based on criteria
export function filterTasks(
  tasks: Task[],
  filters: {
    completed?: boolean;
    priority?: "low" | "medium" | "high";
    category?: string;
    search?: string;
  }
): Task[] {
  return tasks.filter((task) => {
    if (
      filters.completed !== undefined &&
      task.completed !== filters.completed
    ) {
      return false;
    }
    if (filters.priority && task.priority !== filters.priority) {
      return false;
    }
    if (filters.category && task.category !== filters.category) {
      return false;
    }
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      return (
        task.title.toLowerCase().includes(searchLower) ||
        task.description?.toLowerCase().includes(searchLower) ||
        false
      );
    }
    return true;
  });
}
