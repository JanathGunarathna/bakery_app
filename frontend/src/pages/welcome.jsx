import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Welcome() {
  const [darkMode, setDarkMode] = useState(false);
  const navigate= useNavigate();

  const handleGetStarted = () => {
    navigate("/selection");
  };

  const toggleDarkMode = () => {
    setDarkMode((prev) => !prev);
  };

  return (
    <div
      className={`min-h-screen relative transition-all duration-700 ease-in-out ${
        darkMode
          ? "bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 text-white"
          : "bg-gradient-to-br from-slate-50 via-white to-blue-50 text-gray-900"
      }`}
    >
      {/* Professional background pattern */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute inset-0 bg-grid-pattern"></div>
      </div>

      {/* Animated background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className={`absolute top-20 left-10 w-96 h-96 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse ${
            darkMode ? "bg-purple-600" : "bg-blue-400"
          }`}
          style={{ animationDelay: "0s", animationDuration: "4s" }}
        ></div>
        <div
          className={`absolute top-40 right-20 w-80 h-80 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse ${
            darkMode ? "bg-blue-600" : "bg-purple-400"
          }`}
          style={{ animationDelay: "2s", animationDuration: "6s" }}
        ></div>
        <div
          className={`absolute bottom-20 left-1/2 transform -translate-x-1/2 w-64 h-64 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse ${
            darkMode ? "bg-indigo-600" : "bg-cyan-400"
          }`}
          style={{ animationDelay: "4s", animationDuration: "5s" }}
        ></div>
      </div>

      {/* Header */}
      <header className="relative z-20 flex justify-between items-center p-6">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
            darkMode ? "bg-gradient-to-r from-purple-600 to-blue-600" : "bg-gradient-to-r from-blue-600 to-purple-600"
          }`}>
            <span className="text-xl font-bold text-white">T&S</span>
          </div>
          <span className={`font-semibold text-lg ${darkMode ? "text-gray-200" : "text-gray-700"}`}>
            Bakery Chain
          </span>
        </div>
        
        <button
          onClick={toggleDarkMode}
          className={`group flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-300 hover:scale-105 ${
            darkMode
              ? "bg-gray-800/80 backdrop-blur-sm hover:bg-gray-700/80 text-gray-200 border border-gray-700"
              : "bg-white/80 backdrop-blur-sm hover:bg-white text-gray-700 shadow-lg border border-gray-200"
          }`}
        >
          <span className={`text-lg group-hover:rotate-12 transition-transform duration-300 ${
            darkMode ? "text-yellow-400" : "text-blue-600"
          }`}>
            {darkMode ? "☀️" : "🌙"}
          </span>
          <span className="text-sm font-medium">
            {darkMode ? "Light" : "Dark"}
          </span>
        </button>
      </header>

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6 -mt-20">
        {/* Hero section */}
        <div className="text-center mb-12 max-w-4xl">
          {/* Logo */}
          <div className={`inline-flex p-6 rounded-2xl mb-8 transition-all duration-500 hover:scale-110 ${
            darkMode 
              ? "bg-gradient-to-r from-purple-600/20 to-blue-600/20 backdrop-blur-sm border border-purple-500/30" 
              : "bg-gradient-to-r from-blue-600/10 to-purple-600/10 backdrop-blur-sm border border-blue-200"
          }`}>
            <span className="text-6xl">🥖</span>
          </div>

          {/* Title */}
          <h1 className={`text-5xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight ${
            darkMode
              ? "bg-gradient-to-r from-white via-blue-100 to-purple-100 bg-clip-text text-transparent"
              : "bg-gradient-to-r from-gray-900 via-blue-800 to-purple-800 bg-clip-text text-transparent"
          }`}>
            T & S Bakery Chain
          </h1>

          {/* <p className={`text-xl md:text-2xl mb-8 font-light leading-relaxed ${
            darkMode ? "text-gray-300" : "text-gray-600"
          }`}>
            Professional inventory management system for modern bakeries
          </p> */}

          {/* <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${
            darkMode 
              ? "bg-green-900/30 text-green-300 border border-green-700/50" 
              : "bg-green-50 text-green-700 border border-green-200"
          }`}>
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            Trusted by 500+ bakeries worldwide
          </div> */}
        </div>

        {/* Feature cards */}
        {/* <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 max-w-5xl w-full">
          {[
            { 
              icon: "📊", 
              title: "Real-time Analytics", 
              desc: "Monitor sales, track inventory, and get insights with live dashboards and reporting tools" 
            },
            { 
              icon: "🏪", 
              title: "Multi-location Support", 
              desc: "Seamlessly manage inventory across multiple bakery locations from a single platform" 
            },
            { 
              icon: "📈", 
              title: "Smart Forecasting", 
              desc: "AI-powered demand prediction helps optimize inventory and reduce waste effectively" 
            }
          ].map((feature, index) => (
              <div 
                key={index} 
                className={`group p-8 rounded-2xl transition-all duration-500 hover:scale-105 cursor-pointer border ${
                  darkMode 
                    ? 'bg-gray-800/50 backdrop-blur-md border-gray-700/50 hover:bg-gray-800/70 hover:border-gray-600' 
                    : 'bg-white/60 backdrop-blur-md border-gray-200 hover:bg-white/80 hover:border-gray-300 shadow-lg hover:shadow-xl'
                }`}
                style={{animationDelay: `${index * 0.1}s`}}
              >
                <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-6 transition-all duration-300 group-hover:scale-110 text-3xl ${
                  darkMode 
                    ? "bg-gradient-to-r from-purple-600 to-blue-600 group-hover:from-purple-500 group-hover:to-blue-500" 
                    : "bg-gradient-to-r from-blue-600 to-purple-600 group-hover:from-blue-500 group-hover:to-purple-500"
                }`}>
                  <span className="group-hover:animate-bounce">{feature.icon}</span>
                </div>
                <h3 className={`font-bold text-xl mb-3 transition-colors duration-300 ${
                  darkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  {feature.title}
                </h3>
                <p className={`leading-relaxed ${
                  darkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  {feature.desc}
                </p>
              </div>
            ))}
        </div> */}

        {/* CTA Button */}
        <div className="relative">
          <button
            onClick={handleGetStarted}
            className={`group relative px-8 py-4 text-lg font-semibold rounded-xl transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 focus:outline-none focus:ring-4 active:scale-95 ${
              darkMode
                ? "bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white shadow-2xl shadow-purple-900/30 focus:ring-purple-500/50"
                : "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white shadow-2xl shadow-blue-900/30 focus:ring-blue-500/50"
            }`}
          >
            <span className="relative z-10 flex items-center gap-2">
              <span>Get Started</span>
              <span className="text-xl transition-transform duration-300 group-hover:translate-x-1">→</span>
            </span>
          </button>
        </div>

        {/* Bottom text */}
        {/* <div className="mt-12 text-center">
          <p className={`text-sm ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
            Start your free trial today • No credit card required • Setup in 5 minutes
          </p>
        </div> */}
      </div>

      {/* Decorative elements */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className={`absolute w-1 h-1 rounded-full opacity-40 animate-pulse ${
              darkMode ? "bg-blue-400" : "bg-blue-600"
            }`}
            style={{
              left: `${10 + (i * 12)}%`,
              top: `${20 + (i * 8)}%`,
              animationDelay: `${i * 0.5}s`,
              animationDuration: `${2 + (i * 0.2)}s`,
            }}
          />
        ))}
      </div>

      <style jsx>{`
        .bg-grid-pattern {
          background-image: radial-gradient(circle at 1px 1px, ${darkMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)'} 1px, transparent 0);
          background-size: 20px 20px;
        }
      `}</style>
    </div>
  );
}