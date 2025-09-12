// src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from './App';
import DepartamentoEditor from './DepartamentoEditor';
import HandlerIAConfiguration from './handlerIAConfiguration';
import IAConfiguration from './IAConfiguration';
import './App.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/departamento" element={<DepartamentoEditor />} />
        <Route path="/handlerIAConfiguration" element={<HandlerIAConfiguration />} />
        <Route path="/IAConfiguration" element={<IAConfiguration />} />
        </Routes>
    </BrowserRouter>
  </React.StrictMode>
);  