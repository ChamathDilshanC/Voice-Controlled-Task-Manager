"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";

interface VoiceIndicatorProps {
  isListening: boolean;
  onToggle: () => void;
}

export default function VoiceIndicator({
  isListening,
  onToggle,
}: VoiceIndicatorProps) {
  const [audioLevels, setAudioLevels] = useState([0.2, 0.5, 0.3, 0.8, 0.1]);

  // Simulate audio levels when listening
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isListening) {
      interval = setInterval(() => {
        setAudioLevels((prev) => prev.map(() => Math.random() * 0.8 + 0.2));
      }, 150);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isListening]);

  return (
    <motion.div
      className="fixed bottom-8 right-8 z-50"
      initial={{ opacity: 0, scale: 0 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 1.5, type: "spring", stiffness: 200 }}
    >
      {/* Voice Status Tooltip */}
      <AnimatePresence>
        {isListening && (
          <motion.div
            className="absolute bottom-full mb-4 left-1/2 transform -translate-x-1/2"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
          >
            <div className="bg-gradient-to-r from-red-500 to-pink-500 text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-xl">
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  {audioLevels.map((level, index) => (
                    <motion.div
                      key={index}
                      className="w-1 bg-white rounded-full"
                      animate={{
                        height: [4, level * 16 + 4, 4],
                      }}
                      transition={{
                        duration: 0.3,
                        repeat: Infinity,
                        delay: index * 0.1,
                      }}
                    />
                  ))}
                </div>
                Listening...
              </div>
            </div>
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-3 h-3 bg-red-500 rotate-45 -mt-1.5"></div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Voice Button */}
      <motion.button
        onClick={onToggle}
        className={`relative w-20 h-20 rounded-full shadow-2xl flex items-center justify-center group overflow-hidden ${
          isListening
            ? "bg-gradient-to-r from-red-500 to-pink-500"
            : "bg-gradient-to-r from-blue-600 to-purple-600"
        }`}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        animate={
          isListening
            ? {
                boxShadow: [
                  "0 0 0 0 rgba(239, 68, 68, 0.7)",
                  "0 0 0 10px rgba(239, 68, 68, 0)",
                  "0 0 0 20px rgba(239, 68, 68, 0)",
                ],
              }
            : {}
        }
        transition={{
          boxShadow: {
            duration: 2,
            repeat: Infinity,
          },
        }}
      >
        {/* Background Glow */}
        <div
          className={`absolute inset-0 rounded-full transition-all duration-500 ${
            isListening ? "bg-red-600/20 animate-pulse" : "bg-blue-600/20"
          }`}
        />

        {/* Microphone Icon */}
        <motion.svg
          className="w-8 h-8 text-white relative z-10"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          animate={
            isListening
              ? {
                  scale: [1, 1.2, 1],
                }
              : {}
          }
          transition={{
            duration: 1,
            repeat: isListening ? Infinity : 0,
          }}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
          />
        </motion.svg>

        {/* Ripple Effect */}
        <AnimatePresence>
          {isListening && (
            <motion.div
              className="absolute inset-0 rounded-full border-2 border-white/30"
              initial={{ scale: 1, opacity: 1 }}
              animate={{ scale: 2, opacity: 0 }}
              exit={{ scale: 1, opacity: 0 }}
              transition={{ duration: 1, repeat: Infinity }}
            />
          )}
        </AnimatePresence>
      </motion.button>

      {/* Floating Particles */}
      <AnimatePresence>
        {isListening && (
          <>
            {[...Array(6)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-2 h-2 bg-red-400 rounded-full"
                initial={{
                  x: 40,
                  y: 40,
                  opacity: 0,
                }}
                animate={{
                  x: [40, Math.random() * 200 - 100],
                  y: [40, Math.random() * 200 - 100],
                  opacity: [0, 1, 0],
                }}
                transition={{
                  duration: 2,
                  delay: i * 0.2,
                  repeat: Infinity,
                }}
              />
            ))}
          </>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
