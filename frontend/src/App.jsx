import React from "react";
import AppRoutes from "./routes";
import "./index.css";
import { GoogleOAuthProvider } from "@react-oauth/google";

function App() {
  // Client ID của Google OAuth
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  return (
    <GoogleOAuthProvider clientId={clientId}>
      <AppRoutes />
    </GoogleOAuthProvider>
  );
}

export default App;
