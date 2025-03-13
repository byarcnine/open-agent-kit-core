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
      className={styles.root}
      plugins={[
        headingsPlugin({
          allowedHeadingLevels: [1, 2, 3],
        }),
        listsPlugin(),
        toolbarPlugin({
          toolbarContents: () => (
            <>
              <BlockTypeSelect />
              <UndoRedo />
              <BoldItalicUnderlineToggles />
              <ListsToggle options={["number", "bullet"]} />
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
