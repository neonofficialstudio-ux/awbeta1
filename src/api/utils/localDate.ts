
export function parseLocalDate(dateTimeString: string): Date {
  // Converte "2025-11-29T14:30" para um Date sem aplicar timezone (preserva o horário visual do admin)
  if (!dateTimeString) return new Date();
  
  const [datePart, timePart] = dateTimeString.split("T");
  const [year, month, day] = datePart.split("-").map(Number);
  const [hour, minute] = timePart.split(":").map(Number);

  return new Date(year, month - 1, day, hour, minute, 0);
}

export function toLocalInputValue(dateInput: Date | string): string {
  // Converte Date → "YYYY-MM-DDTHH:MM" para inputs sem mexer no horário (ignora conversão UTC do browser)
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return "";

  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    date.getFullYear() +
    "-" +
    pad(date.getMonth() + 1) +
    "-" +
    pad(date.getDate()) +
    "T" +
    pad(date.getHours()) +
    ":" +
    pad(date.getMinutes())
  );
}
