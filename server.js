import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";

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

const server = new Server(
  { name: "raj-mcp-server", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

// ✅ Use addTool instead of tool
server.addTool({
  name: "get_candidate_profile",
  description: "Returns executive summary of Raja Chatterjee",
  inputSchema: { type: "object", properties: {} },
  handler: async () => {
    return [{ type: "text", text: JSON.stringify(PORTFOLIO_DATA.profile, null, 2) }];
  }
});

server.addTool({
  name: "get_certifications",
  description: "Retrieves list of verified technical & AI certifications",
  inputSchema: { type: "object", properties: {} },
  handler: async () => {
    return [{ type: "text", text: JSON.stringify(PORTFOLIO_DATA.certifications, null, 2) }];
  }
});

server.addTool({
  name: "query_skills_and_projects",
  description: "Searches candidate skills and architectural focus areas",
  inputSchema: {
    type: "object",
    properties: { keyword: { type: "string", description: "Skill or domain keyword" } },
    required: ["keyword"]
  },
  handler: async ({ keyword }) => {
    const matchedSkills = PORTFOLIO_DATA.skills.filter(s =>
      s.toLowerCase().includes(keyword.toLowerCase())
    );
    return [{ type: "text", text: JSON.stringify({ query: keyword, matchedSkills }, null, 2) }];
  }
});

const transport = new StdioServerTransport();
server.connect(transport);