import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Navigate, Routes, Route } from "react-router-dom";
import StudioShell from "./studio/StudioShell";
import PromptsPage from "./studio/PromptsPage";
import WhatsAppPage from "./studio/WhatsAppPage";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route element={<StudioShell />}>
          <Route path="/prompts" element={<PromptsPage />} />
          <Route path="/prompts/:promptId" element={<PromptsPage />} />
          <Route path="/IAConfiguration" element={<PromptsPage />} />
          <Route path="/whatsapp" element={<WhatsAppPage />} />
          <Route path="*" element={<Navigate to="/prompts" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
);
