// DOM Manipulation Scanner
import { DiagnosticCore } from "../../services/diagnostic.core";

export function detectDOMTampering() {
  if (typeof document === 'undefined') return;
  try {
    const before = document.body.innerHTML.length;
    setTimeout(() => {
      const after = document.body.innerHTML.length;
      if (Math.abs(after - before) > 5000) {
        DiagnosticCore.record("security", {
          action: "dom_tamper_detected",
          level: "high",
          reason: "Manipulação de DOM suspeita detectada"
        });
      }
    }, 2000);
  } catch {}
}
