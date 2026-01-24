// src/utils/date.ts/**
 /** Scopo: normalizzare le date dal DB quando non ISO
 */
 
export const formatDate = (value: unknown): string => {
  if (!value) return "—";

  let date: Date;

  if (value instanceof Date) {
    date = value;
  } else if (typeof value === "string") {
    // MySQL datetime → ISO
    date = new Date(value.replace(" ", "T"));
  } else {
    return "—";
  }

  return isNaN(date.getTime()) ? "—" : date.toLocaleDateString();
};
