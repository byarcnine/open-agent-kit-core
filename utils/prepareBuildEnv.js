import { existsSync, symlinkSync, mkdirSync } from "fs";
import { resolve } from "path";

export const prepareBuildEnv = () => {
  // Create .oak directory if it doesn't exist
  if (!existsSync(".oak")) {
    mkdirSync(".oak");
  }

  // Create symlinks if they don't exist
  const symlinks = [
    {
      target: "node_modules/@open-agent-kit/core",
      path: ".oak/core",
    },
  ];

  symlinks.forEach(({ target, path }) => {
    if (!existsSync(path)) {
      try {
        symlinkSync(resolve(process.cwd(), target), path);
        console.log(`Created symlink: ${path}`);
      } catch (error) {
        console.error(`Failed to create symlink ${path}:`, error);
      }
    }
  });
};
