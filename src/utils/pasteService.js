const PROXY_BASE_URL = "https://vercel-gadgets.vercel.app";
const APP_HEADER_VALUE =
  "HeronScout (github.com/heronrobotics/decode-scoring-analysis)";

const headersWithIdentity = {
  "X-Requested-With": APP_HEADER_VALUE,
};

export async function createPaste(content) {
  const response = await fetch(`${PROXY_BASE_URL}/pastespost`, {
    method: "POST",
    headers: {
      "Content-Type": "text/plain;charset=UTF-8",
      ...headersWithIdentity,
    },
    body: content,
  });

  if (!response.ok) {
    throw new Error("Failed to create paste");
  }

  let key;

  try {
    const data = await response.json();
    key = data?.key;
  } catch {
    // ignore json parse errors and rely on headers instead
  }

  if (!key) {
    const location = response.headers.get("Location");
    if (location) {
      key = location.replace(/^\//, "").split("/").pop();
    }
  }

  if (!key) {
    throw new Error("Paste key missing in response");
  }

  return key;
}

export async function readPaste(key) {
  const response = await fetch(
    `${PROXY_BASE_URL}/pastesget?key=${encodeURIComponent(key)}`,
    {
      headers: headersWithIdentity,
    }
  );

  if (!response.ok) {
    throw new Error("Failed to read paste");
  }

  return response.text();
}
