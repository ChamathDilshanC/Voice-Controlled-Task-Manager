export interface Task {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  priority: "low" | "medium" | "high";
  category?: string;
  createdAt: Date;
  updatedAt: Date;
  dueDate?: Date;
}

export interface TaskFormData {
  title: string;
  description?: string;
  priority: "low" | "medium" | "high";
  category?: string;
  dueDate?: string;
}

export interface TaskFilters {
  completed?: boolean;
  priority?: "low" | "medium" | "high";
  category?: string;
  search?: string;
}
