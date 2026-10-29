import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource/londrina-solid/900.css";
import "@fontsource-variable/nunito";
import "./admin.css";
import { AdminApp } from "./AdminApp";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AdminApp />
  </StrictMode>,
);
