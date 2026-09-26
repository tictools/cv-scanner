export const DATA_DIR = "data";
export const CVS_DIR = `${DATA_DIR}/cvs`;
export const PHOTOS_DIR = `${DATA_DIR}/photos`;

export const photoPathFor = (candidateId: string): string => {
  return `${PHOTOS_DIR}/${candidateId}.png`;
};
