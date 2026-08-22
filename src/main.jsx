import React from "react";
import ReactDOM from "react-dom/client";
import { handleSpotifyPopupCallback } from "./lib/spotify";
import "./styles.css";

// Quando esta janela e o popup do login do Spotify, devolvemos o codigo para a
// janela principal e fechamos sem montar o app inteiro.
if (!handleSpotifyPopupCallback()) {
  import("./App").then(({ default: App }) => {
    ReactDOM.createRoot(document.getElementById("root")).render(
      <React.StrictMode>
        <App />
      </React.StrictMode>,
    );
  });
}