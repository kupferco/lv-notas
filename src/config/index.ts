import { SAFE_PROXY_API_KEY } from "@env";

// const PROXY_URL = "http://localhost:3000";
const PROXY_URL = process.env.EXPO_PUBLIC_SAFE_PROXY_URL || "http://localhost:3000";

console.log("Environment variables:", {
  proxy_url: PROXY_URL,
  client_key: (SAFE_PROXY_API_KEY || process.env.EXPO_PUBLIC_SAFE_PROXY_KEY) ? "Present" : "Missing"
});

const config = {
  airtableBaseId: process.env.EXPO_PUBLIC_AIRTABLE_BASE_ID,
  proxyUrl: PROXY_URL,
  getAirtableApiKey: async () => {
    console.log("Loading client key from proxy...");
    try {
      // Use babel-loaded env var first, fall back to runtime env var
      const clientKey = SAFE_PROXY_API_KEY || process.env.EXPO_PUBLIC_SAFE_PROXY_KEY;
      if (!clientKey) {
        throw new Error("Client API key not found in environment variables");
      }

      const response = await fetch(`${PROXY_URL}/api/key`, {
        headers: {
          "X-API-Key": clientKey
        }
      });
      if (!response.ok) throw new Error("Failed to get API key");
      const data = await response.json();

      console.log("Got apiKey!!");
      return data.apiKey;
    } catch (error) {
      console.error("Failed to get API key from proxy:", error);
      throw error;
    }
  }
};

export { config };
