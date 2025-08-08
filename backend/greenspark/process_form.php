<?php
$successMessage = "";
if ($_SERVER["REQUEST_METHOD"] === "POST") {
    $name = htmlspecialchars($_POST["name"]);
    $email = htmlspecialchars($_POST["email"]);
    $interests = htmlspecialchars($_POST["interests"]);
    $newsletter = isset($_POST["newsletter"]) ? "Sì" : "No";

    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        http_response_code(400);
        echo json_encode(["error" => "Email non valida"]);
        exit;
    }

    $entry = "Nome: $name\nEmail: $email\nInteressi: $interests\nNewsletter: $newsletter\n---\n";
    file_put_contents(__DIR__ . "/iscritti.txt", $entry, FILE_APPEND);

    $to = "tonino.lazzari@gmail.com";
    $subject = "Nuova iscrizione GreenSpark";
    $message = "Hai ricevuto una nuova iscrizione:\n\n" . $entry;
    $headers = "From: greenspark@helplab.space\r\n";

    if (@mail($to, $subject, $message, $headers)) {
        echo json_encode(["success" => "Grazie per esserti iscritto alla community GreenSpark!"]);
    } else {
        http_response_code(500);
        echo json_encode(["error" => "Errore durante l'invio dell'email"]);
    }
}

