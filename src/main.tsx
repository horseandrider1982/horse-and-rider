import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initWebVitals } from "./lib/webVitals";

createRoot(document.getElementById("root")!).render(<App />);

// Real User Monitoring (LCP/CLS/INP/FCP/TTFB → GA4 via GTM dataLayer)
initWebVitals();
