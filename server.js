const PORTFOLIO_DATA = {
    profile: {
      name: "Raja Chatterjee",
      title: "IT Technical Delivery Manager & AI Engineer",
      experience: "18+ years in enterprise delivery, OCI, fast formulas, and AI/RAG engineering",
      location: "India",
    },
    certifications: [
      "Oracle Cloud Infrastructure Enterprise AI Professional",
      "Oracle Payroll Cloud Certified Implementation Professional",
      "Claude Certified Associate - Foundations",
      "Microsoft Certified: Azure Solutions Architect",
    ],
    skills: [
      "Technical Delivery Management",
      "Enterprise Software Implementation",
      "Oracle Cloud Infrastructure (OCI)",
      "AI & RAG Engineering",
      "React & Node.js",
      "Docker & n8n Automation",
    ],
  };
  
  export default async function handler(req, res) {
    // CORS
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  
    if (req.method === "OPTIONS") return res.status(204).end();
    if (req.method !== "POST") return res.status(405).end();
  
    res.setHeader("Content-Type", "application/json");
  
    let body;
    try {
      body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    } catch {
      return res.status(400).json({
        jsonrpc: "2.0",
        id: null,
        error: { code: -32700, message: "Parse error" }
      });
    }
  
    const { id, method, params } = body || {};
  
    // Notifications (no id) - no response
    if (id === undefined) return res.status(202).end();
  
    // Initialize
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
  
    // Tools list
    if (method === "tools/list") {
      return res.status(200).json({
        jsonrpc: "2.0",
        id,
        result: {
          tools: [
            {
              name: "get_candidate_profile",
              description: "Returns executive summary of Raja Chatterjee",
              inputSchema: { type: "object", properties: {}, required: [] }
            },
            {
              name: "get_certifications",
              description: "Retrieves list of verified technical & AI certifications",
              inputSchema: { type: "object", properties: {}, required: [] }
            },
            {
              name: "query_skills_and_projects",
              description: "Searches candidate skills and architectural focus areas",
              inputSchema: {
                type: "object",
                properties: { keyword: { type: "string", description: "Skill or domain keyword" } },
                required: ["keyword"]
              }
            }
          ]
        }
      });
    }
  
    // Tool calls
    if (method === "tools/call") {
      const toolName = params?.name;
      const args = params?.arguments || {};
  
      let result;
      if (toolName === "get_candidate_profile") {
        result = { content: [{ type: "text", text: JSON.stringify(PORTFOLIO_DATA.profile, null, 2) }], isError: false };
      } else if (toolName === "get_certifications") {
        result = { content: [{ type: "text", text: JSON.stringify(PORTFOLIO_DATA.certifications, null, 2) }], isError: false };
      } else if (toolName === "query_skills_and_projects") {
        const keyword = (args?.keyword || "").toLowerCase();
        const matchedSkills = PORTFOLIO_DATA.skills.filter(s => s.toLowerCase().includes(keyword));
        result = { content: [{ type: "text", text: JSON.stringify({ query: args?.keyword, matchedSkills }, null, 2) }], isError: false };
      } else {
        return res.status(200).json({
          jsonrpc: "2.0",
          id,
          error: { code: -32601, message: `Tool not found: ${toolName}` }
        });
      }
  
      return res.status(200).json({ jsonrpc: "2.0", id, result });
    }
  
    return res.status(200).json({
      jsonrpc: "2.0",
      id,
      error: { code: -32601, message: `Method not found: ${method}` }
    });
  }