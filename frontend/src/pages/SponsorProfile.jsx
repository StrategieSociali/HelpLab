//src/pages/SponsorProfile.jsx
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getSponsorById, getSponsorRatingAverage } from "@/services/sponsorService";
import SponsorHeader from "@/components/sponsor/SponsorHeader";
import SponsorRatingSummary from "@/components/sponsor/SponsorRatingSummary";
import SponsorDescription from "@/components/sponsor/SponsorDescription";

export default function SponsorProfile() {
  const { id } = useParams();
  const [sponsor, setSponsor] = useState(null);
  const [rating, setRating] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([
      getSponsorById(id),
      getSponsorRatingAverage(id),
    ])
      .then(([sponsorData, ratingData]) => {
        setSponsor(sponsorData);
        setRating(ratingData);
      })
      .catch(err => {
        setError(err);
      });
  }, [id]);

  if (error) return <p>⚠️ Sponsor non trovato</p>;
  if (!sponsor) return <p>Caricamento…</p>;

  return (
    <section className="page-section page-text">
      <div className="container">
        <SponsorHeader sponsor={sponsor} />
        <SponsorRatingSummary rating={rating} />
        <SponsorDescription sponsor={sponsor} />
      </div>
    </section>
  );
}

