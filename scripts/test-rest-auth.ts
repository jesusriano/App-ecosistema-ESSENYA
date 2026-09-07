import fetch from 'node-fetch';
import appletConfig from '../firebase-applet-config.json' with { type: 'json' };

async function testQuotaHeader() {
  console.log("=== DIAGNOSTIC REST WITH X-GOOG-USER-PROJECT HEADER ===");
  try {
    console.log("1. Fetching access token from Metadata Server...");
    const metaRes = await fetch("http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token", {
      headers: { "Metadata-Flavor": "Google" }
    });
    
    if (!metaRes.ok) {
      throw new Error(`Failed to get metadata token: ${metaRes.statusText}`);
    }
    
    const tokenData = await metaRes.json() as any;
    const accessToken = tokenData.access_token;
    console.log("  Obtained Access Token!");

    const projectId = appletConfig.projectId;
    console.log(`2. Querying v3 downloadAccount with Access Token...`);
    
    const res = await fetch(`https://www.googleapis.com/identitytoolkit/v3/relyingparty/downloadAccount`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "x-goog-user-project": projectId
      },
      body: JSON.stringify({
        targetProjectId: projectId,
        maxResults: 10
      })
    });

    console.log("Response status:", res.status);
    const textOutput = await res.text();
    console.log("Response data:", textOutput.substring(0, 1000));

  } catch (err: any) {
    console.error("Test error:", err);
  }
}

testQuotaHeader();
