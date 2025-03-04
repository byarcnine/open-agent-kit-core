import {
  BlockTypeSelect,
  BoldItalicUnderlineToggles,
  headingsPlugin,
  listsPlugin,
  ListsToggle,
  MDXEditor,
  toolbarPlugin,
  UndoRedo,
} from "@mdxeditor/editor";
import "@mdxeditor/editor/style.css";
import { cn } from "~/lib/utils";
import styles from "./markdownedit.module.scss";

const MarkdownEdit = ({
  prompt,
  onChange,
}: {
  prompt: string;
  onChange: (markdown: string) => void;
}) => {
  return (
    <MDXEditor
      className={cn("border mb-8", styles.root)}
      plugins={[
        headingsPlugin(),
        listsPlugin(),
        toolbarPlugin({
          toolbarClassName: "my-classname",
          toolbarContents: () => (
            <>
              {" "}
              <BlockTypeSelect />
              <UndoRedo />
              <BoldItalicUnderlineToggles />
              <ListsToggle />
            </>
          ),
        }),
      ]}
      markdown={prompt}
      onChange={(markdown) => onChange(markdown)}
    />
  );
};

export default MarkdownEdit;
