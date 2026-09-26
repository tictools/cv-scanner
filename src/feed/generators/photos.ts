import { access, mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { GeminiClient } from "../client/gemini-client";
import type { Candidate } from "../cv/types";
import { PHOTOS_DIR } from "../output/paths";

const IMAGE_MODEL = "gemini-3.1-flash-lite-image";

export interface GeneratePhotoParams {
  client: ImageClient;
  candidate: Candidate;
  photosDir?: string;
}

type ImageClient = Pick<GeminiClient, "generateImageBytes">;

const fileExists = async (path: string): Promise<boolean> => {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
};

/**
 * Generates the candidate's AI portrait and saves it as a PNG. Existing photos
 * are reused without calling the API (cache-and-skip).
 */
export const generatePhoto = async ({
  client,
  candidate,
  photosDir = PHOTOS_DIR,
}: GeneratePhotoParams): Promise<string> => {
  const photoPath = join(photosDir, `${candidate.id}.png`);

  if (await fileExists(photoPath)) {
    return photoPath;
  }

  const bytes = await client.generateImageBytes({
    model: IMAGE_MODEL,
    prompt: buildPhotoPrompt(candidate),
  });

  await mkdir(photosDir, { recursive: true });
  await writeFile(photoPath, bytes);

  return photoPath;
};

const buildPhotoPrompt = (candidate: Candidate): string => {
  const { ageRange, gender, ethnicity } = candidate.appearance;
  return (
    `Photorealistic professional headshot portrait of a ${ageRange}-year-old ${gender} ` +
    `person of ${ethnicity} ethnicity, for a corporate CV. Neutral background, soft studio ` +
    `lighting, shoulders-up, facing the camera, natural expression.`
  );
};
