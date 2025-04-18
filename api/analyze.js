function splitContractIntoClauses(contractText) {
  let clauses = contractText.split(/\n(?=(\d{1,2}\.|\bARTICLE\b|\bSection\b))/i);
  if (clauses.length < 8) {
    clauses = contractText.split(/\n{2,}/);
  }
  return clauses
    .map(clause => clause.trim())
    .filter(clause => clause.length > 30);
}

function enforceStartupOverrides(clauseText, gptOutput) {
  const lowerClause = clauseText.toLowerCase();
  const lowerOutput = gptOutput.toLowerCase();
  let additions = "";

  if (
  lowerClause.includes("penalty") &&
  (lowerClause.includes("termination") || lowerClause.includes("early termination")) &&
  !lowerOutput.includes("delete this clause")
) {
  additions += `
⚠️ Override: This clause imposes a financial penalty for terminating early. Startups should never pay to exit a contract.
✅ Recommendation: DELETE THIS CLAUSE ENTIRELY.
`;
}

  if (
    lowerClause.includes("exclusive") &&
    !lowerOutput.includes("delete this clause")
  ) {
    additions += `
⚠️ Override: This clause limits your freedom to work with other vendors or providers.
✅ Recommendation: DELETE THIS CLAUSE or revise it to be non-exclusive.
`;
  }

  if (
    lowerClause.includes("unlimited") &&
    lowerClause.includes("liability") &&
    !lowerOutput.includes("cap") &&
    !lowerOutput.includes("delete this clause")
  ) {
    additions += `
⚠️ Override: Unlimited liability is too risky for a small business.
✅ Recommendation: Cap liability to the total fees paid under this agreement.
`;
  }

  if (additions) {
    console.log("✅ OVERRIDE TRIGGERED for clause:\n", clauseText);
  }

  return additions || gptOutput;
}

export default async function handler(req, res) {
  const { contract } = req.body;
  let clauses = splitContractIntoClauses(contract);

  if (clauses.length < 10) {
    const fallbackChunks = contract.match(/.{300,600}[\s.]/g) || [];
    clauses = clauses.concat(fallbackChunks.slice(0, 10 - clauses.length));
  }

  console.log("📄 Clauses sent for review:", clauses.length);

  const clauseAnalysisPromises = clauses.map(async (clauseText) => {
    const prompt = `
You are reviewing this clause for a small business.

Your job is to recommend **deletion** if it imposes risk, cost, or inflexibility.

Use this format:
🔹 Clause Title (guess if not given)
❌ Original
⚠️ Why It's Bad
✅ Redline Suggestion (or say DELETE THIS CLAUSE if unacceptable)

Clause:
${clauseText}
`;

    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "gpt-4",
          temperature: 0.4,
          max_tokens: 1000,
          messages: [
            {
              role: "system",
              content: "You are a no-compromise legal advocate for a startup. You delete clauses that hurt the company.",
            },
            {
              role: "user",
              content: prompt,
            },
          ]
        })
      });

      const data = await response.json();

      if (!response.ok || !data.choices) {
        console.error("⚠️ GPT response error:", data);
        return `⚠️ GPT failed to process this clause.`;
      }

      const rawOutput = data.choices[0].message?.content || "";
      const enforcedOutput = enforceStartupOverrides(clauseText, rawOutput);
      return enforcedOutput;

    } catch (err) {
      console.error("❌ GPT call failed for clause:", clauseText, err);
      return `❌ Error processing this clause.`;
    }
  });

  try {
    const clauseAnalyses = await Promise.all(clauseAnalysisPromises);
    const finalAnalysis = clauseAnalyses.join("\n\n");
    res.status
