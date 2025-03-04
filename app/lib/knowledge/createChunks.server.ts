import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { getConfig } from "../config/config";

export const createChunks = async (
  text: string,
  chunkSize: number = getConfig().embedding?.chunkSize ?? 1000,
  chunkOverlap: number = getConfig().embedding?.overlap ?? 200
) => {
  const textSplitter = new RecursiveCharacterTextSplitter({
    chunkSize,
    chunkOverlap,
  });
  return textSplitter.splitText(text);
};
