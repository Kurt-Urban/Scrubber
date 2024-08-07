// app/_app.tsx
import React from "react";
import { FileProvider } from "@/context";
import "./globals.css";
import { Home } from "@/components";

function App() {
  return (
    <FileProvider>
      <Home />
    </FileProvider>
  );
}

export default App;
