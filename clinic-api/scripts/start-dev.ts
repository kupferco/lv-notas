// clinic-api/scripts/start-dev.ts
import { spawn, exec } from "child_process";
import ngrok from "ngrok";
import fs from "fs/promises";
import 'dotenv/config';

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
    let webhookLocalFound = false;
    
    const updatedLines = lines.map(line => {
      if (line.startsWith("WEBHOOK_URL_LOCAL=")) {
        webhookLocalFound = true;
        return `WEBHOOK_URL_LOCAL=${webhookUrl}`;
      }
      if (line.startsWith("WEBHOOK_URL=")) {
        webhookFound = true;
        return `WEBHOOK_URL=${webhookUrl}`;
      }
      return line;
    });
    
    if (!webhookFound) {
      updatedLines.push(`WEBHOOK_URL=${webhookUrl}`);
    }
    if (!webhookLocalFound) {
      updatedLines.push(`WEBHOOK_URL_LOCAL=${webhookUrl}`);
    }
    
    await fs.writeFile(".env", updatedLines.join("\n"));
    console.log("✅ Updated .env with new webhook URL:", webhookUrl);
    
  } catch (error) {
    console.error("Error updating .env file:", error);
  }
}

async function updateServerWebhookUrl(webhookUrl: string) {
  try {
    console.log("🔄 Updating running server's webhook URL...");
    
    const response = await fetch('http://localhost:3000/api/update-webhook-url', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ webhookUrl })
    });
    
    if (response.ok) {
      console.log("✅ Server's webhook URL updated dynamically");
    } else {
      console.log("⚠️  Could not update server's webhook URL");
    }
  } catch (error) {
    console.log("⚠️  Could not reach server to update webhook URL");
  }
}

async function setupWebhook() {
  try {
    console.log("🔗 Setting up webhook with updated URL...");
    
    const response = await fetch('http://localhost:3000/api/setup-webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      console.log("✅ Webhook automatically registered with new ngrok URL");
    } else {
      console.log("⚠️  Webhook setup failed, you may need to register manually");
    }
  } catch (error) {
    console.log("⚠️  Could not auto-register webhook");
  }
}

async function startServices() {
  const PORT = parseInt(process.env.PORT || '3000');
  
  // Kill any existing process on port
  await killProcessOnPort(PORT);
  
  // Wait a moment for the port to be fully released
  await new Promise(resolve => setTimeout(resolve, 1000));

  const server = spawn("npm", ["run", "dev"], {
    stdio: "inherit",
    shell: true
  });

  try {
    // Wait for server to start
    console.log("⏳ Waiting for server to start...");
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    const url = await ngrok.connect(PORT);
    console.log("🌐 ngrok tunnel created:", url);
    
    // 1. Update .env file
    await updateEnvFile(url);
    
    // 2. Update running server's environment variables
    await updateServerWebhookUrl(url);
    
    // 3. Setup webhook with new URL
    await setupWebhook();
    
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