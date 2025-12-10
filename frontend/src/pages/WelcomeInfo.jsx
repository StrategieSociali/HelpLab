// src/pages/WelcomeInfo.jsx
/**
 * Scopo: presentare all'utente appena registrato o al visitatore le opportunità di HelpLab
 *
 * Attualmente ci sono contenuti per:
 * - Informare l’utente appena registrato sulle possibilità offerte dalla piattaforma.
 * - Guidarlo nella scelta del suo ruolo o attività preferita.
 * - Stimolare l’interazione con sfide, community, e percorsi formativi.
 * - Formato coerente con lo stile già presente
*/


import React from "react";

export default function WelcomeInfo() {
  return (
    <section className="page-section page-text">
      <div className="container">
        <h2 className="page-title">Benvenuto su HelpLab!</h2>
        <p className="muted">Scopri tutto quello che puoi fare su questa piattaforma collaborativa per l’innovazione sostenibile.</p>

        <div className="card" style={{ padding: 24, marginTop: 24 }}>
          <h3 className="page-title">🎯 Partecipa a una Sfida</h3>
          <p>Le sfide sono delle azioni locali a valore ambientale e/o sociale. Ogni sfida cerca di realizzazione piccole azioni locali che apportano vantaggi alla comunità. Se sei un cittadino puoi unirti a una sfida locale o tematica, proporre soluzioni reali, fare delle azioni che contribuiscono a portare a buon fine la sfida e guadagnare così dei punti. Nel tempo o grazie alle tue competenze puoi diventare un giudice. I punti permettono di ottenere piccoli rimborsi sotto varie forme e quindi avere un beneficio anche economico per il tuo volontariato.</p>
        </div>

        <div className="card" style={{ padding: 24, marginTop: 24 }}>
          <h3 className="page-title">🧑‍⚖️ Diventa Giudice</h3>
          <p>Le sfide sono valutate dai giudici che hanno il compito di verificare la corretta esecuzione di tutte le azioni previste e le evidenze portate dai volontari per il lavoro svolto. Ogni giudice quindi aiuta a rendere i risultati oggettivi in modo imparziale e costruttivo. Tutti possono diventare giudici grazie all'esperienza maturata su HelpLab o in base a un curriculum che valutiamo. I giudici ottengono anche una valutazione terza dai valontari sulla loro capacità e imparzialità. Più giudichi, più aumenti il tuo prestigio nella community.</p>
        </div>

        <div className="card" style={{ padding: 24, marginTop: 24 }}>
          <h3 className="page-title">🏭 Coinvolgi uno Sponsor</h3>
          <p>Le sfide possono essere gestite come puro volontariato oppure ottenere degli sponsor che ne coprono le spese. Gli sponsor possono essere trovati dai volontari o possono proporsi direttamente a HelpLab. Anche tu puoi impegnarti nel connettere imprese, enti o fondazioni interessate a sostenere sfide ad alto impatto. Gli sponsor guadagnano visibilità, valore sociale e ottengono specifici report di impatto utili per i loro obiettivi ambientali e sociali. Le sponsorizzazioni saranno detraibili o deducibili in base alla normativa del Paese in cui sono realizzate le sfide.</p>
        </div>

        <div className="card" style={{ padding: 24, marginTop: 24 }}>
          <h3 className="page-title">📚 Segui i Percorsi Formativi</h3>
          <p>Per aiutarti a utilizzare al meglio questa piattaforma e per formarti su piccole azioni di sostenibilità ambientale e sociale presto predisporremo una serie di corsi di formazione gratuiti. Potrai approfondire temi legati all’innovazione sociale e ambientale, all’imprenditoria, alla cittadinanza attiva. Per le imprese o altri enti potranno essere realizzati corsi specifici anche a pagamento.</p>
        </div>

        <div className="card" style={{ padding: 24, marginTop: 24 }}>
          <h3 className="page-title">💬 Contribuisci alla Community</h3>
          <p>HelpLab vuole diventare una piattaforma per la promozione di azioni concrete utili a cambiare il futuro a livello locale. Condividi idee, feedback, aiuta gli altri utenti e costruisci con noi una community sostenibile e attiva.</p>
        </div>

        <p style={{ marginTop: 32 }}>➡️ Da dove vuoi iniziare? Vai al tuo <a href="/dashboard/profile" className="link">profilo</a> o esplora le <a href="/challenges" className="link">sfide disponibili</a>.</p>
      </div>
    </section>
  );
}

