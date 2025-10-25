---
trigger: always_on
---

# Windsurf AI Agent Instruction Guide (continued)

## 8. Objective & Workflow

**Objective:**
Enable fully-automated, end-to-end, production-ready decentralized freelance work automation using the required frameworks. The AI should ensure each sponsor technology is robustly and visibly integrated, and that the user experience remains intuitive.

**Workflow:**
1. On agent initialization, register with the Almanac and make the protocol manifest visible in Agentverse.
2. Implement agent protocols following uAgents best practices, supporting asynchronous and real-time message types.
3. Pull Pyth price feeds and Entropy from Hermes and update contracts using the updatePriceFeeds method.
4. Deploy and wire up state channel payments via Yellow SDK, demonstrating gasless streaming and instant micropayments.
5. Route cross-chain payments and manage unified balances via Avail SDK; run end-to-end transactions across testnets.
6. Store verification files or deliverables in Lighthouse and mint access-controlled DataCoins as needed.
7. Document every step with clear code comments and a detailed README for architecture, installation, test, and sponsor tech integration.
8. Prepare a 2–5 minute demo video fully illustrating agent registration, communication, a sample job, payment, and dispute workflows.
9. Raise a PR showcasing Pyth usage in the designated repository, with a detailed integration section in README.

---

## 9. Tool Usage
- For agent logic and state: use the uAgents Python library
- For protocol discovery and registry: integrate with the Almanac contract, publishing to Agentverse
- For reasoning and knowledge graphs: embed MeTTa constructs for skill and reputation evaluation
- For oracle data: fetch price and randomness from Hermes API, consume in contracts, trigger updates via Pyth on-chain method
- For off-chain payments/state channels: integrate Yellow SDK/Nitrolite using provided documentation and testnets
- For cross-chain routing and unified balance: use Avail Nexus SDK, verifying all on-chain state updates
- For decentralized storage: Lighthouse SDK for upload, access, and tokenization
- For demo, documentation, and PR flows: follow sponsor checklists strictly

**Example Pyth Oracle Usage:**
```solidity
function updateMarketPrice(bytes[] memory priceUpdateData) public payable {
    uint256 fee = pyth.getUpdateFee(priceUpdateData);
    require(msg.value >= fee, "Insufficient fee");
    pyth.updatePriceFeeds{value: fee}(priceUpdateData);
}
```

---

## 10. Response Format

- All documentation in markdown, logical headings (<12000 chars/file)
- Code blocks for implementations; tables/diagrams for architecture if space permits
- Sectioned explanations—background, usage, expected outputs, error handling

---

## 11. Context, Examples & Error Handling

**Context:**
- Reference ReputeFlow’s agent types and major workflows as the backdrop for each integration.
- Use bulleted or numbered steps for walkthroughs; highlight innovation and sponsor value.

**Error Handling:**
- Anticipate timeouts, data not found, transaction reverts, and missing registration; log errors and give recovery steps.
- For sponsor-specific errors, log the incident and output an actionable user message and a stack trace for devs.

---

## 12. Iteration & Feedback

- When user feedback is given on a rule or a prototype, iterate promptly with a new revision, explaining what changed and why.
- Offer to clarify requirements if user input is ambiguous or incomplete.
- After implementing major features, prompt for confirmation: "Would you like to extend this workflow?"

---

## 13. Best Practices for Writing AI Instructions

- Explicitly state the agent’s identity, audience, and goal at the start.
- Decompose each workflow into discrete, chainable steps.
- Note specific tool or SDK calls with usage patterns, not just descriptions.
- Format outputs in markdown, using lists and code blocks for clarity.
- Anticipate errors and describe fallback paths (e.g., skip, retry, escalate).
- Encourage iterative feedback, clarifying ambiguity before execution.

---

## Example Prompt for Windsurf AI

> "You are Windsurf AI, tasked with implementing an off-chain gasless streaming payment feature for ReputeFlow using Yellow SDK. Document the complete workflow in markdown with stepwise agent logic, sample code blocks, error handling instructions, and a summary section of integration points. Use concise, professional, and solution-oriented language throughout and use Next JS for frontend.Stop creating unnecessary documentation for everything"

---

# End of Windsurf AI Rules (Part 2)