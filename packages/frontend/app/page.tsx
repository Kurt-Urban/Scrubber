// app/_app.tsx
import { FileProvider } from "@/context";
import "./globals.css";
import { Home } from "@/components";

function MyApp() {
  return (
    <FileProvider>
      <Home />
    </FileProvider>
  );
}

export default MyApp;
