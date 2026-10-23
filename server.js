import express from 'express';

const PORTFOLIO_DATA = { /* your data */ };

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// CORS
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  next();
});

// Only handle POST to /api/mcp
app.post("/api/mcp", async (req, res) => {
  // Your existing MCP handler code here
  let body;
  try {
    body = req.body;
  } catch {
    return res.status(400).json({
      jsonrpc: "2.0",
      id: null,
      error: { code: -32700, message: "Parse error" }
    });
  }

  const { id, method, params } = body || {};

  if (id === undefined) return res.status(202).end();

  if (method === "initialize") {
    return res.status(200).json({
      jsonrpc: "2.0",
      id,
      result: {
        protocolVersion: "2024-11-05",
        capabilities: { tools: {} },
        serverInfo: { name: "raj-mcp-server", version: "1.0.0" }
      }
    });
  }

  // ... rest of your tool handlers ...
});

// Reject all other methods/paths
app.all("*", (req, res) => {
  res.status(405).json({ error: "Method Not Allowed" });
});

app.listen(PORT, () => {
  console.log(`MCP server running on port ${PORT}`);
});