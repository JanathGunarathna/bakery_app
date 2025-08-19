import './App.css';
import React from 'react'; 
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";  // Fixed import source

import Welcome from './pages/welcome';
import SelectionPage from './pages/selectionPage';

function App() {
  return (
    <Router>  {/* Added Router wrapper */}
      <div className="App">
        <header className="App-header">
          <Routes>
            <Route path="/" element={<Welcome/>} />
            <Route path="/selection" element={<SelectionPage/>}/>
          </Routes>
        </header>
      </div>
    </Router>
  );
}

export default App;