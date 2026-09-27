/**
 * The candidate's portrait as the app serves it. `feed` writes it to
 * `data/photos/<candidateId>.png` and that directory is the app's public root,
 * so the id alone locates the file — no manifest lookup.
 */
export const photoUrl = (candidateId: string): string => `/photos/${candidateId}.png`;
