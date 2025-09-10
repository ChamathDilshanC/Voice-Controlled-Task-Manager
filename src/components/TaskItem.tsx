"use client";

import { Task } from "@/types/task";
import { useState } from "react";
import { motion } from "framer-motion";

interface TaskItemProps {
  task: Task;
  onToggleComplete: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (task: Task) => void;
}

export default function TaskItem({
  task,
  onToggleComplete,
  onDelete,
  onEdit,
}: TaskItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const getPriorityGradient = (priority: string) => {
    switch (priority) {
      case "high":
        return "from-red-500/20 to-pink-500/20 border-red-400/30";
      case "medium":
        return "from-yellow-500/20 to-orange-500/20 border-yellow-400/30";
      case "low":
        return "from-green-500/20 to-emerald-500/20 border-green-400/30";
      default:
        return "from-gray-500/20 to-gray-600/20 border-gray-400/30";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-500/20 text-red-300 border-red-400/40";
      case "medium":
        return "bg-yellow-500/20 text-yellow-300 border-yellow-400/40";
      case "low":
        return "bg-green-500/20 text-green-300 border-green-400/40";
      default:
        return "bg-gray-500/20 text-gray-300 border-gray-400/40";
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && !task.completed;

  return (
    <motion.div
      className={`relative bg-gradient-to-r ${getPriorityGradient(
        task.priority
      )} backdrop-blur-sm rounded-2xl p-6 border transition-all duration-300 hover:shadow-2xl group ${
        task.completed ? 'opacity-75' : ''
      }`}
      whileHover={{ scale: 1.02, y: -2 }}
      layout
    >
      {/* Glow effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      <div className="relative flex items-start justify-between">
        <div className="flex items-start space-x-4 flex-1">
          {/* Custom Checkbox */}
          <motion.button
            onClick={() => onToggleComplete(task.id)}
            className="mt-1 relative"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all duration-300 ${
              task.completed 
                ? 'bg-gradient-to-r from-green-500 to-emerald-500 border-green-400' 
                : 'border-white/30 hover:border-white/50 bg-white/5'
            }`}>
              {task.completed && (
                <motion.svg
                  className="w-4 h-4 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  initial={{ scale: 0, rotate: 180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 500, damping: 15 }}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={3}
                    d="M5 13l4 4L19 7"
                  />
                </motion.svg>
              )}
            </div>
          </motion.button>

          <div className="flex-1">
            <motion.h3
              className={`text-xl font-bold mb-2 transition-all duration-300 ${
                task.completed
                  ? "line-through text-white/50"
                  : "text-white"
              }`}
              layout
            >
              {task.title}
            </motion.h3>

            {task.description && (
              <motion.div layout>
                <p
                  className={`text-sm mb-4 transition-all duration-300 ${
                    task.completed ? "text-white/40" : "text-blue-100"
                  }`}
                >
                  {isExpanded
                    ? task.description
                    : task.description.slice(0, 120) +
                      (task.description.length > 120 ? "..." : "")}
                </p>
                {task.description.length > 120 && (
                  <motion.button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="text-blue-300 hover:text-blue-200 text-sm font-medium transition-colors duration-300"
                    whileHover={{ scale: 1.05 }}
                  >
                    {isExpanded ? "Show less" : "Read more"}
                  </motion.button>
                )}
              </motion.div>
            )}

            <div className="flex flex-wrap items-center gap-3 mt-4">
              <motion.span
                className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${getPriorityColor(
                  task.priority
                )}`}
                whileHover={{ scale: 1.1 }}
              >
                {task.priority.toUpperCase()}
              </motion.span>

              {task.category && (
                <motion.span
                  className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-400/40"
                  whileHover={{ scale: 1.1 }}
                >
                  {task.category}
                </motion.span>
              )}

              {task.dueDate && (
                <motion.span
                  className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${
                    isOverdue
                      ? "bg-red-500/20 text-red-300 border-red-400/40 animate-pulse"
                      : "bg-purple-500/20 text-purple-300 border-purple-400/40"
                  }`}
                  whileHover={{ scale: 1.1 }}
                >
                  {isOverdue ? "⚠ Overdue: " : "Due: "}
                  {formatDate(task.dueDate)}
                </motion.span>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2 ml-4 opacity-0 group-hover:opacity-100 transition-all duration-300">
          <motion.button
            onClick={() => onEdit(task)}
            className="p-2 text-blue-300 hover:text-blue-200 hover:bg-blue-500/10 rounded-lg transition-all duration-300"
            whileHover={{ scale: 1.1, rotate: 5 }}
            whileTap={{ scale: 0.9 }}
            title="Edit task"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
          </motion.button>

          <motion.button
            onClick={() => onDelete(task.id)}
            className="p-2 text-red-300 hover:text-red-200 hover:bg-red-500/10 rounded-lg transition-all duration-300"
            whileHover={{ scale: 1.1, rotate: -5 }}
            whileTap={{ scale: 0.9 }}
            title="Delete task"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}
