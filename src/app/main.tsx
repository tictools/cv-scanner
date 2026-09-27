import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ChatProvider } from "./context/chat-context";
import { ChatPage } from "./pages/ChatPage/ChatPage";
import "./styles/global.css";

const root = document.getElementById("root");

if (!root) {
  throw new Error("#root element not found");
}

createRoot(root).render(
  <StrictMode>
    <ChatProvider>
      <ChatPage />
    </ChatProvider>
  </StrictMode>,
);
