// frontend/src/api/greenspark.js
export async function submitGreenSparkForm(data) {
  try {
    const formData = new FormData();
    Object.keys(data).forEach((key) => formData.append(key, data[key]));

    const res = await fetch("/backend/greenspark/process_form.php", {
      method: "POST",
      body: formData,
    });

    const json = await res.json();
    if (!res.ok) {
      return { success: false, message: json.error || "Errore imprevisto" };
    }

    return { success: true, message: json.success };
  } catch (err) {
    return { success: false, message: "Errore di rete o server non raggiungibile" };
  }
}

