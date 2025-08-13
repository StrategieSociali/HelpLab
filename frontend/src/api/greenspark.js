export async function submitGreenSparkForm(payload) {
  try {
    const res = await fetch('/api/greenspark.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    return { success: !!data.success, message: data.message || (data.success ? 'Ok' : 'Errore') };
  } catch (err) {
    return { success: false, message: 'Errore di rete. Riprova.' };
  }
}

