import client from "@prisma/client";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

const installPlugins = async () => {
  const prisma = new client.PrismaClient();

  try {
    const plugins = await prisma.globalConfig.findUnique({
      where: {
        key: "npm_plugins",
      },
    });

    if (!plugins || !plugins.value) {
      console.log("No plugins found in database");
      return;
    }

    const pluginsToInstall = plugins.value;

    console.log(`Installing plugins: ${pluginsToInstall.join(", ")}`);

    // Install plugins individually to avoid one failure breaking all installations
    const installResults = [];

    for (const plugin of pluginsToInstall) {
      try {
        const command = `npm install ${plugin}`;
        console.log(`Executing: ${command}`);

        const { stdout, stderr } = await execAsync(command);

        if (stdout) {
          console.log(`Installation output for ${plugin}:`, stdout);
        }

        if (stderr) {
          console.warn(`Installation warnings for ${plugin}:`, stderr);
        }

        installResults.push({ plugin, success: true });
        console.log(`✓ ${plugin} installed successfully!`);
      } catch (error) {
        console.error(`✗ Error installing ${plugin}:`, error.message);
        installResults.push({ plugin, success: false, error: error.message });
      }
    }

    // Summary of installation results
    const successfulInstalls = installResults.filter(
      (result) => result.success,
    );
    const failedInstalls = installResults.filter((result) => !result.success);

    console.log(`\nInstallation Summary:`);
    console.log(
      `✓ Successfully installed: ${successfulInstalls.length} plugins`,
    );
    if (successfulInstalls.length > 0) {
      console.log(`  - ${successfulInstalls.map((r) => r.plugin).join(", ")}`);
    }

    if (failedInstalls.length > 0) {
      console.log(`✗ Failed to install: ${failedInstalls.length} plugins`);
      console.log(`  - ${failedInstalls.map((r) => r.plugin).join(", ")}`);
    }
  } catch (error) {
    console.error("Error installing plugins:", error.message);
  } finally {
    await prisma.$disconnect();
  }
};

installPlugins();
