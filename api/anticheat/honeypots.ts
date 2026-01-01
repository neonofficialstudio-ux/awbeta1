// Honeypots invisíveis
export function createHoneypots() {
  if (typeof document === 'undefined') return;
  const bait1 = document.createElement("input");
  bait1.type = "text";
  bait1.name = "hp_field";
  bait1.style.position = "absolute";
  bait1.style.left = "-9999px";
  bait1.style.opacity = "0";

  document.body.appendChild(bait1);

  bait1.addEventListener("input", () => {
    localStorage.setItem("honeypotTriggered", "1");
  });
}
