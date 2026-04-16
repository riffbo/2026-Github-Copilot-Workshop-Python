/**
 * エントリポイント — React アプリケーションを DOM にマウントする。
 * StrictMode を有効化し、開発時に潜在的な問題を検出する。
 */

import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
