import React from "react";
import { FileText, XCircle, Plus, ArrowUp } from "react-feather";
import { Textarea } from "../ui/textarea";
import type { ChatSettings } from "~/types/chat";

interface ChatInputProps {
  input: string;
  handleInputChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
  handleKeyDown: (event: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  handleFormSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  fileInputRef: React.RefObject<HTMLInputElement>;
  files: File[];
  handleFileInputChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  handleFileButtonClick: () => void;
  supportedFileTypes: string[];
  chatSettings: ChatSettings;
  onClearFile?: (fileName: string) => void;
}

const ChatInput =
  ({
    input,
    handleInputChange,
    handleKeyDown,
    handleFormSubmit,
    textareaRef,
    fileInputRef,
    files,
    handleFileInputChange,
    handleFileButtonClick,
    supportedFileTypes,
    chatSettings,
    onClearFile,
  }: ChatInputProps) => {
    return (
      <div className="oak-chat__input-container">
        <form onSubmit={handleFormSubmit} className="oak-chat__form">
          {files.length > 0 && (
            <div className="oak-chat__file-thumbnails">
              {files.map((file: File) => (
                <div
                  key={file.name}
                  className="oak-chat__file-thumbnails__item"
                >
                  {file.type.startsWith("image/") && (
                    <img src={URL.createObjectURL(file)} alt={file.name} />
                  )}
                  {file.type === "application/pdf" && (
                    <div className="oak-chat__file-thumbnails__item--pdf">
                      <div className="oak-chat__file-thumbnails__item--pdf-icon">
                        <FileText size={20} />
                      </div>
                      <div>
                        <span>{file.name}</span>
                        <span>PDF</span>
                      </div>
                    </div>
                  )}
                  <button
                    type="button"
                    className="oak-chat__file-remove-button"
                    onClick={() => onClearFile?.(file.name)}
                  >
                    <XCircle size={20} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="oak-chat__text-area-container">
            <Textarea
              ref={textareaRef}
              onKeyDown={handleKeyDown}
              name="prompt"
              value={input}
              rows={chatSettings?.textAreaInitialRows || 2}
              onChange={handleInputChange}
              placeholder="Type your message..."
              className="oak-chat__text-area"
            />
          </div>

          <div className="oak-chat__action-row">
            {chatSettings?.enableFileUpload && supportedFileTypes && (
              <div>
                <button
                  type="button"
                  className="oak-chat__action-button"
                  onClick={handleFileButtonClick}
                >
                  <Plus size={18} />
                </button>
                <input
                  multiple
                  type="file"
                  accept={supportedFileTypes.join(",")}
                  ref={fileInputRef}
                  style={{ display: "none" }}
                  onChange={handleFileInputChange}
                />
              </div>
            )}
            <button
              type="submit"
              disabled={!input}
              className="oak-chat__submit-button"
            >
              <ArrowUp size={20} />
            </button>
          </div>
        </form>
      </div>
  );
};

export default React.memo(ChatInput);
