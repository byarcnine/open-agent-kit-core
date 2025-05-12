import type { Message } from "ai";
import { encoding_for_model, type TiktokenModel } from "tiktoken";

const DEFAULT_MODEL_ID = "gpt-4o-mini" satisfies TiktokenModel;

export const calculateTokensForMessage = (
  message: Message,
  modelId: string,
): number => {
  const messageWithoutAttachments = {
    ...message,
    ...(message.experimental_attachments && {
      experimental_attachments: message.experimental_attachments.map(
        (attachment) => ({
          ...attachment,
          url: "",
        }),
      ),
    }),
  };
  return calculateTokensString(
    JSON.stringify(messageWithoutAttachments),
    modelId,
  );
};

export const calculateTokensForMessages = (
  messages: Message[],
  modelId: string,
): number => {
  return messages.reduce(
    (acc, message) => acc + calculateTokensForMessage(message, modelId),
    0,
  );
};

export const calculateTokensString = (
  string: string,
  modelId: string = DEFAULT_MODEL_ID,
): number => {
  let enc;
  try {
    enc = encoding_for_model(modelId as TiktokenModel);
  } catch (error) {
    enc = encoding_for_model(DEFAULT_MODEL_ID);
  }
  const tokens = enc.encode(string).length;
  enc.free();
  return tokens;
};
