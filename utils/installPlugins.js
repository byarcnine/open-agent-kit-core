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

    console.log(
      `Installing plugins: ${pluginsToInstall.map((p) => p.name).join(", ")}`,
    );

    // Install plugins individually to avoid one failure breaking all installations
    const installResults = [];

    for (const plugin of pluginsToInstall) {
      try {
        // Update status to pending before installation
        await updatePluginStatus(prisma, plugin.name, "pending");

        const command = `npm install ${plugin.name}`;
        console.log(`Executing: ${command}`);

        const { stdout, stderr } = await execAsync(command);

        if (stdout) {
          console.log(`Installation output for ${plugin.name}:`, stdout);
        }

        if (stderr) {
          console.warn(`Installation warnings for ${plugin.name}:`, stderr);
        }

        // Update status to installed on success
        await updatePluginStatus(prisma, plugin.name, "installed");

        installResults.push({ plugin, success: true });
        console.log(`✓ ${plugin.name} installed successfully!`);
      } catch (error) {
        console.error(`✗ Error installing ${plugin.name}:`, error.message);

        // Update status to failed on error
        await updatePluginStatus(prisma, plugin.name, "failed");

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
      console.log(
        `  - ${successfulInstalls.map((r) => r.plugin.name).join(", ")}`,
      );
    }

    if (failedInstalls.length > 0) {
      console.log(`✗ Failed to install: ${failedInstalls.length} plugins`);
      console.log(`  - ${failedInstalls.map((r) => r.plugin.name).join(", ")}`);
    }
  } catch (error) {
    console.error("Error installing plugins:", error.message);
  } finally {
    await prisma.$disconnect();
  }
};

// Helper function to update plugin status in the database
const updatePluginStatus = async (prisma, pluginName, status) => {
  try {
    const pluginsConfig = await prisma.globalConfig.findUnique({
      where: { key: "npm_plugins" },
    });

    if (pluginsConfig && pluginsConfig.value) {
      const updatedPlugins = pluginsConfig.value.map((plugin) =>
        plugin.name === pluginName
          ? { ...plugin, status, lastUpdated: new Date().toISOString() }
          : plugin,
      );

      await prisma.globalConfig.update({
        where: { key: "npm_plugins" },
        data: { value: updatedPlugins },
      });

      console.log(`Updated ${pluginName} status to: ${status}`);
    }
  } catch (error) {
    console.error(`Error updating status for ${pluginName}:`, error.message);
  }
};

installPlugins();
