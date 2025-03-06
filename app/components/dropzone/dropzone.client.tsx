import { useDropzone } from "react-dropzone";
import { useCallback, useRef, useState } from "react";
import { toast, Toaster } from "sonner";
import { Form } from "react-router";

const acceptedFileTypes = {
  "application/pdf": [".pdf"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [
    ".docx",
  ],
  "application/json": [".json"],
  "text/csv": [".csv"],
  "application/vnd.ms-excel": [".xls"],
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
    ".xlsx",
  ],
  "application/xml": [".xml"],
  "text/markdown": [".md"],
};

const Dropzone = ({ agentId }: { agentId: string }) => {
  const [uploading, setUploading] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (!formRef.current || acceptedFiles.length === 0) return;
    setUploading(true);
    try {
      // Just submit the form directly!
      const formData = new FormData();
      acceptedFiles.forEach((file) => {
        formData.append("file", file);
      });
      toast.success("Progressing ... Please do not close this page");
      await fetch(`/agent/${agentId}/knowledge`, {
        method: "POST",
        body: formData,
      });
      toast.success("Uploaded successfully");
      setUploading(false);
      // TODO: implement a cleaner way to reload the page
      window.location.reload();
    } finally {
      setUploading(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: acceptedFileTypes,
    maxSize: 10 * 1024 * 1024, // 10MB max file size
    onDropRejected: (fileRejections) => {
      fileRejections.forEach((rejection) => {
        if (rejection.errors.some((e) => e.code === "file-too-large")) {
          toast.error("File is too large. Maximum size is 10MB.");
        } else {
          toast.error("Invalid file type.");
        }
      });
    },
    noClick: false,
    noKeyboard: false,
    preventDropOnDocument: true,
  });

  return (
    <>
      <Form
        ref={formRef}
        method="post"
        encType="multipart/form-data"
        className="mb-6"
      >
        <div {...getRootProps()}>
          <input {...getInputProps()} name="file" />
          <div className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:bg-gray-50">
            {uploading ? (
              <p>Uploading...</p>
            ) : isDragActive ? (
              <p>Drop the files here...</p>
            ) : (
              <p>
                Drag and drop files here, or click to select files. <br />
                Allowed file types are{" "}
                {Object.values(acceptedFileTypes).join(", ")} <br />
                Maximum file size: 10MB
              </p>
            )}
          </div>
        </div>
      </Form>
      <Toaster expand={true} />
    </>
  );
};

export default Dropzone;
