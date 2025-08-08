<?php
$successMessage = "";
if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $name = htmlspecialchars($_POST["name"]);
    $email = htmlspecialchars($_POST["email"]);
    $interests = htmlspecialchars($_POST["interests"]);
    $newsletter = isset($_POST["newsletter"]) ? "Sì" : "No";

    $entry = "Nome: $name\nEmail: $email\nInteressi: $interests\nNewsletter: $newsletter\n---\n";
    file_put_contents("iscritti.txt", $entry, FILE_APPEND);

    $to = "tonino.lazzari@gmail.com";
    $subject = "Nuova iscrizione GreenSpark";
    $message = "Hai ricevuto una nuova iscrizione:\n\n" . $entry;
    $headers = "From: greenspark@helplab.space\r\n";

    @mail($to, $subject, $message, $headers);

    $successMessage = "Grazie per esserti iscritto alla community GreenSpark!";
}
?>

<!DOCTYPE html>
<html lang="it">
<head>
    <meta charset="UTF-8">
    <title>GreenSpark - Unisciti alla Community Sostenibile</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="Unisciti a GreenSpark e fai la differenza per il pianeta. Community sostenibile per un futuro migliore.">
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <!-- Hero Section -->
    <section class="hero-section">
        <div class="hero-overlay"></div>
        <div class="hero-content">
            <div class="hero-text">
                <h1>Trasforma il Futuro del Pianeta</h1>
                <p>Unisciti alla più grande community sostenibile d'Italia. Insieme possiamo creare un impatto positivo duraturo per le generazioni future.</p>
                <div class="hero-stats">
                    <div class="stat">
                        <div class="stat-icon">🌍</div>
                        <div class="stat-text">
                            <div class="stat-number">50,000+</div>
                            <div class="stat-label">Membri Attivi</div>
                        </div>
                    </div>
                    <div class="stat">
                        <div class="stat-icon">👥</div>
                        <div class="stat-text">
                            <div class="stat-number">200+</div>
                            <div class="stat-label">Progetti Completati</div>
                        </div>
                    </div>
                    <div class="stat">
                        <div class="stat-icon">🌱</div>
                        <div class="stat-text">
                            <div class="stat-number">1M+</div>
                            <div class="stat-label">Alberi Piantati</div>
                        </div>
                    </div>
                </div>
                <button class="cta-button" onclick="scrollToRegistration()">
                    Inizia Ora <span class="arrow">→</span>
                </button>
            </div>
        </div>
    </section>

    <!-- Features Table -->
    <section class="features-section">
        <div class="container">
            <h2>Confronta i Piani di Membership</h2>
            <div class="features-table">
                <div class="table-header">
                    <div class="feature-column">Funzionalità</div>
                    <div class="plan-column">Gratuito</div>
                    <div class="plan-column premium">Premium</div>
                    <div class="plan-column">Enterprise</div>
                </div>
                <div class="table-row">
                    <div class="feature-cell">Accesso Community</div>
                    <div class="plan-cell">✓</div>
                    <div class="plan-cell">✓</div>
                    <div class="plan-cell">✓</div>
                </div>
                <div class="table-row">
                    <div class="feature-cell">Progetti Mensili</div>
                    <div class="plan-cell">3</div>
                    <div class="plan-cell">Illimitati</div>
                    <div class="plan-cell">Illimitati</div>
                </div>
                <div class="table-row">
                    <div class="feature-cell">Mentorship</div>
                    <div class="plan-cell">—</div>
                    <div class="plan-cell">✓</div>
                    <div class="plan-cell">✓</div>
                </div>
                <div class="table-row">
                    <div class="feature-cell">Eventi Esclusivi</div>
                    <div class="plan-cell">—</div>
                    <div class="plan-cell">✓</div>
                    <div class="plan-cell">✓</div>
                </div>
                <div class="table-row">
                    <div class="feature-cell">Supporto Prioritario</div>
                    <div class="plan-cell">—</div>
                    <div class="plan-cell">—</div>
                    <div class="plan-cell">✓</div>
                </div>
            </div>
        </div>
    </section>

    <!-- Community Benefits -->
    <section class="community-section">
        <div class="community-bg"></div>
        <div class="container">
            <h2>Perché Scegliere la Nostra Community?</h2>
            <div class="benefits-grid">
                <div class="benefit-card">
                    <div class="benefit-icon">👥</div>
                    <h3>Community Globale</h3>
                    <p>Connettiti con persone che condividono la tua passione per l'ambiente</p>
                </div>
                <div class="benefit-card">
                    <div class="benefit-icon">💡</div>
                    <h3>Innovazione Sostenibile</h3>
                    <p>Accedi alle ultime innovazioni e tecnologie verdi</p>
                </div>
                <div class="benefit-card">
                    <div class="benefit-icon">🎯</div>
                    <h3>Obiettivi Concreti</h3>
                    <p>Lavora su progetti che creano un impatto reale e misurabile</p>
                </div>
                <div class="benefit-card">
                    <div class="benefit-icon">🏆</div>
                    <h3>Riconoscimenti</h3>
                    <p>Ottieni certificazioni e riconoscimenti per il tuo impegno</p>
                </div>
                <div class="benefit-card">
                    <div class="benefit-icon">💬</div>
                    <h3>Supporto Continuo</h3>
                    <p>Ricevi supporto e feedback dalla community e dagli esperti</p>
                </div>
                <div class="benefit-card">
                    <div class="benefit-icon">📈</div>
                    <h3>Crescita Personale</h3>
                    <p>Sviluppa competenze e conoscenze nel campo della sostenibilità</p>
                </div>
            </div>
        </div>
    </section>

    <!-- Support Section -->
    <section class="support-section">
        <div class="container">
            <h2>Il Nostro Impegno per Te</h2>
            <div class="support-grid">
                <div class="support-card">
                    <div class="support-icon">📚</div>
                    <h3>Formazione Continua</h3>
                    <p>Accedi a corsi, webinar e workshop tenuti da esperti del settore per migliorare le tue competenze in sostenibilità.</p>
                </div>
                <div class="support-card">
                    <div class="support-icon">🤝</div>
                    <h3>Networking Professionale</h3>
                    <p>Connettiti con professionisti, imprenditori e attivisti per creare opportunità di collaborazione e crescita.</p>
                </div>
                <div class="support-card">
                    <div class="support-icon">🌿</div>
                    <h3>Progetti Concreti</h3>
                    <p>Partecipa a iniziative reali che hanno un impatto positivo sull'ambiente e sulla società locale e globale.</p>
                </div>
            </div>
        </div>
    </section>

    <!-- Registration Section -->
    <section class="registration-section" id="registration">
        <div class="container">
            <h2>Inizia il Tuo Viaggio Sostenibile</h2>
            <p>Unisciti oggi stesso alla nostra community e inizia a fare la differenza per il pianeta. La registrazione è gratuita e immediata.</p>

            <?php if (!empty($successMessage)): ?>
                <div style="background: #10b981; padding: 1rem; color: white; border-radius: 10px; margin-bottom: 2rem;">
                    <?php echo $successMessage; ?>
                </div>
            <?php endif; ?>

            <form method="POST" class="registration-form">
                <div class="form-group">
                    <label for="name">Nome Completo</label>
                    <input type="text" id="name" name="name" required>
                </div>
                
                <div class="form-group">
                    <label for="email">Email</label>
                    <input type="email" id="email" name="email" required>
                </div>
                
                <div class="form-group">
                    <label for="interests">Aree di Interesse</label>
                    <select id="interests" name="interests" required>
                        <option value="">Seleziona un'area</option>
                        <option value="Energia Rinnovabile">Energia Rinnovabile</option>
                        <option value="Riduzione dei Rifiuti">Riduzione dei Rifiuti</option>
                        <option value="Agricoltura Sostenibile">Agricoltura Sostenibile</option>
                        <option value="Tecnologie Verdi">Tecnologie Verdi</option>
                        <option value="Educazione Ambientale">Educazione Ambientale</option>
                    </select>
                </div>
                
                <div class="form-group checkbox-group">
                    <input type="checkbox" id="newsletter" name="newsletter">
                    <label for="newsletter">Iscriviti alla newsletter per ricevere aggiornamenti</label>
                </div>
                
                <button type="submit" class="submit-button">
                    Unisciti alla Community
                </button>
            </form>
        </div>
    </section>

    <script src="script.js"></script>
</body>
</html>

