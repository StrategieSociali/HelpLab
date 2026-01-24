import React from "react";
import { useParams } from "react-router-dom";

export default function JudgeChallengeOverview() {
  const { id } = useParams();

  return (
    <section className="page-section page-text">
      <div className="container">
        <h1 className="page-title">Challenge #{id}</h1>
        <p className="muted">
          Overview challenge, task e submissions (vista giudice).
        </p>

        <div className="card" style={{ marginTop: 24 }}>
          🚧 Overview giudice in costruzione (v0.8)
        </div>
      </div>
    </section>
  );
}

