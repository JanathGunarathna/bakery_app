import React, { useState } from "react";
import { useNavigate } from "react-router-dom"; 

export default function Welcome() {  
    const [darkMode, setDarkMode] = useState(false);
    const navigate = useNavigate();

    const handleGetStarted = () => {  
         navigate("/selection");
    };

    const toggleDarkMode = () => {
        setDarkMode(prev => !prev);
    };

    return (
        <div className={`welcome-container ${darkMode ? "dark" : ""}`}>
            <header>
                <h1 className="title">
                    Welcome to T & S Bakery chain
                </h1>
                <button className="btn" onClick={handleGetStarted}>
                    Get Started  
                </button>
                <button className="toggle-btn" onClick={toggleDarkMode}>
                    {darkMode ? "☀ Light Mode" : "🌙 Dark Mode"}
                </button>
            </header>
        </div>
    );
}