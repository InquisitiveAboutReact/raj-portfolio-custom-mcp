import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

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
  { name: "raja-portfolio-mcp", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

// Register your 3 tools
server.tool("get_candidate_profile", {}, async () => [
  { type: "text", text: JSON.stringify(PORTFOLIO_DATA.profile, null, 2) }
]);

server.tool("get_certifications", {}, async () => [
  { type: "text", text: JSON.stringify(PORTFOLIO_DATA.certifications, null, 2) }
]);

server.tool("query_skills_and_projects",
  { keyword: { type: "string", description: "Skill or domain keyword" } },
  async ({ keyword }) => {
    const matchedSkills = PORTFOLIO_DATA.skills.filter(s =>
      s.toLowerCase().includes(keyword.toLowerCase())
    );
    return [{ type: "text", text: JSON.stringify({ query: keyword, matchedSkills }, null, 2) }];
  }
);

// Start server
const transport = new StdioServerTransport();
server.connect(transport);