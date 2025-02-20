import { spawn, exec } from "child_process";
import ngrok from "ngrok";
import fs from "fs/promises";

function killProcessOnPort(port: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const platform = process.platform;
    let command = '';
    
    if (platform === 'win32') {
      command = `netstat -ano | findstr :${port}`;
    } else {
      command = `lsof -i :${port} -t`;
    }

    exec(command, (error, stdout, stderr) => {
      if (error) {
        // If there's an error, it likely means no process is running on this port
        resolve();
        return;
      }

      const pid = stdout.trim();
      if (!pid) {
        resolve();
        return;
      }

      const killCommand = platform === 'win32' ? `taskkill /F /PID ${pid}` : `kill -9 ${pid}`;
      exec(killCommand, (error) => {
        if (error) {
          console.warn(`Warning: Failed to kill process on port ${port}`);
        } else {
          console.log(`Killed process ${pid} on port ${port}`);
        }
        resolve();
      });
    });
  });
}

async function updateEnvFile(webhookUrl: string) {
  try {
    const envContent = await fs.readFile(".env", "utf-8");
    const lines = envContent.split("\n");
    let webhookFound = false;
    
    const updatedLines = lines.map(line => {
      if (line.startsWith("WEBHOOK_URL=")) {
        webhookFound = true;
        return `WEBHOOK_URL=${webhookUrl}`;
      }
      return line;
    });
    
    if (!webhookFound) {
      updatedLines.push(`WEBHOOK_URL=${webhookUrl}`);
    }
    
    await fs.writeFile(".env", updatedLines.join("\n"));
    console.log("Updated .env with new webhook URL");
  } catch (error) {
    console.error("Error updating .env file:", error);
  }
}

async function startServices() {
  const PORT = 8080;
  
  // Kill any existing process on port 8080
  await killProcessOnPort(PORT);
  
  // Wait a moment for the port to be fully released
  await new Promise(resolve => setTimeout(resolve, 1000));

  const server = spawn("npm", ["run", "dev"], {
    stdio: "inherit",
    shell: true
  });

  try {
    const url = await ngrok.connect(PORT);
    console.log("ngrok tunnel created:", url);
    
    await updateEnvFile(url);
    
    process.on("SIGINT", async () => {
      console.log("Shutting down...");
      await ngrok.kill();
      server.kill();
      process.exit();
    });
  } catch (error) {
    console.error("Error:", error);
    server.kill();
    process.exit(1);
  }
}

startServices();
