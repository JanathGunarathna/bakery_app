import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Welcome() {
  const [darkMode, setDarkMode] = useState(false);
  const navigate = useNavigate();

  const handleGetStarted = () => {
    // For demo purposes, just show an alert
    navigate("/selection");
  };

  const toggleDarkMode = () => {
    setDarkMode((prev) => !prev);
  };

  return (
    <div
      className={`min-h-screen relative transition-all duration-700 ease-in-out ${
        darkMode
          ? "bg-gradient-to-br from-gray-900 via-black to-gray-800 text-white"
          : "bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 text-gray-900"
      }`}
    >
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Gradient orbs */}
        <div
          className={`absolute top-20 left-10 w-96 h-96 rounded-full opacity-20 blur-3xl animate-pulse ${
            darkMode ? "bg-orange-600" : "bg-amber-400"
          }`}
          style={{ animationDelay: "0s", animationDuration: "4s" }}
        ></div>
        <div
          className={`absolute top-40 right-20 w-80 h-80 rounded-full opacity-15 blur-3xl animate-pulse ${
            darkMode ? "bg-yellow-600" : "bg-orange-400"
          }`}
          style={{ animationDelay: "2s", animationDuration: "6s" }}
        ></div>
        <div
          className={`absolute bottom-20 left-1/2 transform -translate-x-1/2 w-64 h-64 rounded-full opacity-25 blur-3xl animate-pulse ${
            darkMode ? "bg-amber-600" : "bg-yellow-400"
          }`}
          style={{ animationDelay: "4s", animationDuration: "5s" }}
        ></div>

        {/* Bakery-themed floating elements */}
        <div
          className={`absolute top-1/4 right-1/3 text-6xl opacity-10 ${
            darkMode ? "text-amber-400" : "text-orange-600"
          }`}
          style={{
            animation: "float 8s ease-in-out infinite",
          }}
        >
          🍞
        </div>

        <div
          className={`absolute bottom-1/3 left-1/4 text-5xl opacity-15 ${
            darkMode ? "text-yellow-400" : "text-amber-600"
          }`}
          style={{
            animation: "float 6s ease-in-out infinite",
            animationDelay: "2s",
          }}
        >
          🥐
        </div>

        <div
          className={`absolute top-1/2 left-1/6 text-4xl opacity-10 ${
            darkMode ? "text-orange-400" : "text-yellow-600"
          }`}
          style={{
            animation: "float 7s ease-in-out infinite",
            animationDelay: "1s",
          }}
        >
          🧁
        </div>

        <div
          className={`absolute bottom-1/4 right-1/4 text-5xl opacity-15 ${
            darkMode ? "text-amber-500" : "text-orange-500"
          }`}
          style={{
            animation: "float 9s ease-in-out infinite",
            animationDelay: "3s",
          }}
        >
          🥯
        </div>

        {/* Floating crumb dots */}
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className={`absolute w-3 h-3 rounded-full opacity-20 ${
              darkMode ? "bg-amber-500" : "bg-orange-400"
            }`}
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animation: `float ${3 + Math.random() * 4}s ease-in-out infinite`,
              animationDelay: `${Math.random() * 2}s`,
            }}
          />
        ))}
      </div>

      {/* Subtle pattern overlay */}
      <div
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: `radial-gradient(circle at 2px 2px, ${
            darkMode ? "rgba(255,165,0,0.3)" : "rgba(139,69,19,0.3)"
          } 2px, transparent 0)`,
          backgroundSize: "50px 50px",
        }}
      ></div>

      {/* Header */}
      <header className="relative z-20 flex justify-between items-center p-6">
        <div className="flex items-center gap-3">
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-lg transition-all duration-300 ${
              darkMode
                ? "bg-gradient-to-r from-amber-700 to-orange-700 hover:from-amber-600 hover:to-orange-600"
                : "bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700"
            }`}
          >
            <span className="text-xl font-bold text-white">T&S</span>
          </div>
          <span
            className={`font-semibold text-lg transition-colors duration-300 ${
              darkMode ? "text-amber-200" : "text-amber-800"
            }`}
          >
            Bakery Chain
          </span>
        </div>

        <button
          onClick={toggleDarkMode}
          className={`group flex items-center gap-3 px-6 py-3 rounded-2xl transition-all duration-300 hover:scale-105 shadow-lg ${
            darkMode
              ? "bg-gray-800 hover:bg-gray-700 text-amber-200 border border-gray-600"
              : "bg-white hover:bg-amber-50 text-amber-700 shadow-xl border border-amber-200"
          }`}
        >
          <span
            className={`text-xl transition-transform duration-300 group-hover:rotate-180 ${
              darkMode ? "text-yellow-400" : "text-amber-600"
            }`}
          >
            {darkMode ? "☀️" : "🌙"}
          </span>
          <span className="text-sm font-medium">
            {darkMode ? "Light Mode" : "Dark Mode"}
          </span>
        </button>
      </header>

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6 -mt-20">
        {/* Hero section */}
        <div className="text-center mb-12 max-w-4xl">
          {/* Logo */}
          <div
            className={`inline-flex p-8 rounded-3xl mb-8 transition-all duration-500 hover:scale-110 hover:rotate-2 ${
              darkMode
                ? "bg-gray-800/70 backdrop-blur-md border border-amber-700 shadow-2xl"
                : "bg-white/90 backdrop-blur-md border border-amber-200 shadow-2xl"
            }`}
          >
            <span
              className="text-7xl"
              style={{
                animation: "bounce 2s ease-in-out infinite",
              }}
            >
              🥖
            </span>
          </div>

          {/* Title */}
          <h1
            className={`text-5xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight transition-all duration-500 ${
              darkMode
                ? "text-transparent bg-gradient-to-r from-amber-400 via-orange-400 to-yellow-400 bg-clip-text"
                : "text-transparent bg-gradient-to-r from-amber-800 via-orange-700 to-yellow-700 bg-clip-text"
            }`}
          >
            T & S Bakery Chain
          </h1>

          <p
            className={`text-xl md:text-2xl mb-8 font-light leading-relaxed transition-colors duration-500 ${
              darkMode ? "text-amber-300" : "text-amber-700"
            }`}
          >
            Crafting excellence, one loaf at a time
          </p>

          {/* Status badge */}
          <div
            className={`inline-flex items-center gap-3 px-6 py-3 rounded-full text-sm font-medium transition-all duration-300 hover:scale-105 ${
              darkMode
                ? "bg-gray-800/60 text-amber-200 border border-amber-700"
                : "bg-amber-50 text-amber-800 border border-amber-300"
            }`}
          >
            <div
              className={`w-3 h-3 rounded-full animate-pulse ${
                darkMode ? "bg-amber-400" : "bg-amber-600"
              }`}
            ></div>
            <span>Fresh • Local • Artisanal</span>
          </div>
        </div>

        {/* CTA Button */}
        <div className="relative group mb-8">
          <div
            className={`absolute -inset-1 rounded-2xl blur opacity-60 transition-opacity duration-300 group-hover:opacity-100 ${
              darkMode
                ? "bg-gradient-to-r from-amber-600 to-orange-600"
                : "bg-gradient-to-r from-amber-500 to-orange-500"
            }`}
          ></div>

          <button
            onClick={handleGetStarted}
            className={`relative px-10 py-5 text-xl font-semibold rounded-2xl transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 focus:outline-none focus:ring-4 active:scale-95 ${
              darkMode
                ? "bg-gradient-to-r from-amber-700 to-orange-700 hover:from-amber-600 hover:to-orange-600 text-white shadow-2xl focus:ring-amber-500"
                : "bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white shadow-2xl focus:ring-amber-400"
            }`}
          >
            <span className="relative z-10 flex items-center gap-3">
              <span>Get Started</span>
              <span className="text-2xl transition-transform duration-300 group-hover:translate-x-2">
                →
              </span>
            </span>
          </button>
        </div>

        {/* Bottom text */}
        <div className="text-center">
          <p
            className={`text-sm transition-colors duration-500 ${
              darkMode ? "text-amber-500" : "text-amber-600"
            }`}
          >
            Join thousands of satisfied customers worldwide
          </p>
        </div>
      </div>

      <style jsx>{`
        @keyframes float {
          0%,
          100% {
            transform: translateY(0px) translateX(0px) rotate(0deg);
            opacity: 0.1;
          }
          25% {
            transform: translateY(-15px) translateX(5px) rotate(5deg);
            opacity: 0.2;
          }
          50% {
            transform: translateY(-25px) translateX(15px) rotate(-5deg);
            opacity: 0.15;
          }
          75% {
            transform: translateY(-10px) translateX(8px) rotate(3deg);
            opacity: 0.2;
          }
        }

        @keyframes bounce {
          0%,
          20%,
          53%,
          80%,
          100% {
            animation-timing-function: cubic-bezier(0.215, 0.61, 0.355, 1);
            transform: translate3d(0, 0, 0);
          }
          40%,
          43% {
            animation-timing-function: cubic-bezier(0.755, 0.05, 0.855, 0.06);
            transform: translate3d(0, -8px, 0);
          }
          70% {
            animation-timing-function: cubic-bezier(0.755, 0.05, 0.855, 0.06);
            transform: translate3d(0, -4px, 0);
          }
          90% {
            transform: translate3d(0, -2px, 0);
          }
        }
      `}</style>
    </div>
  );
}
