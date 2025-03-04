import { useState } from "react";
import { Clipboard } from "react-feather";
import { toast } from "sonner";

const CopyToClipboardLink = ({ link }: { link: string }) => {
  const [justCopied, setJustCopied] = useState(false);
  const handleCopyLink = (link: string) => {
    navigator.clipboard
      .writeText(link)
      .then(() => {
        setJustCopied(true);
        toast.success("Link copied to clipboard");

        // Reset the copied state after 2 seconds
        setTimeout(() => {
          setJustCopied(false);
        }, 2000);
      })
      .catch((err) => {
        console.error("Failed to copy link:", err);
        toast.error("Failed to copy link");
      });
  };
  return (
    <button
      onClick={() => handleCopyLink(link)}
      className="text-blue-600 hover:text-blue-800 hover:underline focus:outline-none"
    >
      {justCopied ? (
        "Copied!"
      ) : (
        <span className="flex items-center gap-2">
          Copy <Clipboard width={16} height={16} />
        </span>
      )}
    </button>
  );
};

export default CopyToClipboardLink;
