import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource/londrina-solid/400.css";
import "@fontsource/londrina-solid/900.css";
import "@fontsource-variable/nunito";
import "./styles.css";
import App from "./App";
import { CartProvider } from "./cart";
import { DataProvider } from "./data/context";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <DataProvider>
      <CartProvider>
        <App />
      </CartProvider>
    </DataProvider>
  </StrictMode>,
);
