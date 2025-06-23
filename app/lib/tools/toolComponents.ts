import type { FC } from "react";
import { DateTimeAndDayTool } from "~/components/dateAndTimeTool/dateAndTimeTool";
import FeedbackTool from "~/components/feedbackTool/feedbackTool";
import KnowledgeTool from "~/components/knowledgeTool/knowledgeTool";
import AccessWebTool from "~/components/accessWeb/accessWeb";
import type { PluginPackageJson } from "~/types/plugins";

const toolComponentFiles: Record<string, { default: FC }> = import.meta.glob(
  "/node_modules/oak-*/toolComponents/*.tsx",
  {
    eager: true,
  },
);

const modulePackageJsons: Record<string, { default: PluginPackageJson }> =
  import.meta.glob("/node_modules/oak-*/package.json", {
    eager: true,
  });

export const toolComponents: Record<string, React.FC<any>> = {
  ...Object.fromEntries(
    Object.entries(toolComponentFiles).map(([key, value]) => {
      const fileName = key.replace(".tsx", "").split("/").pop();
      const packageJsonPath =
        key.match(/(.+?node_modules\/[^/]+)\//)?.[1] + "/package.json";
      const packageInfo = packageJsonPath
        ? // localPackageJsons[packageJsonPath]
          modulePackageJsons[packageJsonPath]?.default
        : undefined;
      const componentName = `${packageInfo?.name}__${fileName}`;
      return [componentName, value.default];
    }),
  ),
  // default tools
  default__dateTimeAndDay: DateTimeAndDayTool,
  default__accessKnowledgeBase: KnowledgeTool,
  default__collectFeedback: FeedbackTool,
  default__accessWeb: AccessWebTool,
};
