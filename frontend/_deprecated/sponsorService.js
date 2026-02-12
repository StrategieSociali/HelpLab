//src/services/sponsorService.js
import api from "@/services/api";

export const getSponsorById = (id) =>
  api.get(`/sponsors/${id}`).then(r => r.data);

export const getSponsorRatingAverage = (id) =>
  api.get(`/sponsors/${id}/ratings/average`).then(r => r.data);

