import React from "react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Button } from "../ui/button";

// dynamically import react-json-view
const ReactJson = React.lazy(() => import("@microlink/react-json-view"));

interface JsonEditorProps {
  data: any;
  onSave: (updatedData: any) => void;
  onClose: () => void;
  isOpen: boolean;
}

const JsonEditor: React.FC<JsonEditorProps> = ({
  data,
  onSave,
  onClose,
  isOpen,
}) => {
  const [localData, setLocalData] = React.useState(data);
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Metadata</DialogTitle>
        </DialogHeader>
        <div className="overflow-auto max-h-[70vh] w-full rounded-md">
          <ReactJson
            src={localData}
            onEdit={(edit) => setLocalData(edit.updated_src)}
            onAdd={(add) => setLocalData(add.updated_src)}
            onDelete={(del) => setLocalData(del.updated_src)}
            theme="monokai"
            style={{
              padding: "10px",
              borderRadius: "5px",
              backgroundColor: "#282c34",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
            }}
          />
        </div>
        <div className="flex justify-end gap-4 mt-4">
          <DialogClose asChild>
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </DialogClose>
          <Button onClick={() => onSave(localData)}>Save</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default JsonEditor;
