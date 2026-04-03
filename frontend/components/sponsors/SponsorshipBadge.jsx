// src/components/sponsors/SponsorshipBadge.jsx
//
// Badge visivo da mostrare sulle card delle challenge quando
// `sponsor_interest === true` nella response GET /challenges.
//
// Scelta UX: il badge è volutamente discreto (non invasivo rispetto al
// contenuto della card) ma abbastanza distinto da essere notato.
// Usa un'icona + testo breve, clickabile opzionalmente verso la guida sponsor.
//
// PROPS:
//   onClick  {function|null}  — se passato, il badge diventa cliccabile
//   size     {"sm"|"md"}      — default "md"
//
// USO TIPICO (su ChallengeCard):
//   {challenge.sponsor_interest && <SponsorshipBadge onClick={() => navigate(routes.community.sponsorGuide)} />}

import { Handshake } from "lucide-react";
import { routes } from "../../routes";

export default function SponsorshipBadge({ onClick = null, size = "md" }) {
  const isSmall = size === "sm";

  const baseClass = [
    "inline-flex items-center gap-1 font-semibold rounded-full border",
    "transition-colors duration-150 select-none",
    isSmall
      ? "px-2 py-0.5 text-xs"
      : "px-3 py-1 text-xs",
    // Colore ambra/oro — distinto dal verde CO2 e dal blu info già in uso
    "bg-amber-50 border-amber-300 text-amber-700",
    onClick
      ? "cursor-pointer hover:bg-amber-100 hover:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-300"
      : "cursor-default",
  ]
    .filter(Boolean)
    .join(" ");

  const content = (
    <>
      <Handshake size={isSmall ? 11 : 13} aria-hidden="true" />
      <span>Cerca sponsor</span>
    </>
  );

  // Se clickabile rendiamo un <button> per accessibilità corretta
  if (onClick) {
    return (
      <button
        type="button"
        className={baseClass}
        onClick={onClick}
        aria-label="Questa challenge cerca uno sponsor — scopri come sponsorizzare"
      >
        {content}
      </button>
    );
  }

  return (
    <span className={baseClass} aria-label="Questa challenge cerca uno sponsor">
      {content}
    </span>
  );
}
