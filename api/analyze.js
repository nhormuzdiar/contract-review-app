// 🔹 1. Clause splitter
function splitContractIntoClauses(contractText) {
  let clauses = contractText.split(/\n(?=(\d{1,2}\.|\bARTICLE\b|\bSection\b))/i);
  if (clauses.length < 8) {
    clauses = contractText.split(/\n{2,}/);
  }

  return clauses
    .map(clause => clause.trim())
    .filter(clause => clause.length > 30);
}

// 🔹 2. Override logic (forced delete/edit of risky clauses)
function enforceStartupOverrides(clauseText, gptOutput) {
  const lowerClause = clauseText.toLowerCase();
  const original = clauseText.trim();

  console.log("🧪 CHECKING OVERRIDES FOR CLAUSE:\n", clauseText);

  if (
    lowerClause.includes("termination") &&
    (
      lowerClause.includes("penalty") ||
      lowerClause.includes("shall pay") ||
      lowerClause.includes("early termination") ||
      lowerClause.includes("liquidated damages") ||
      lowerClause.includes("termination charge")
    )
  ) {
    console.log("🚨 FORCED DELETE: Termination Penalty");
    return `
🔹 Clause Title: Early Termination Penalty  
❌ Original: "${original}"  
⚠️ Why It's Bad: This clause punishes the startup for leaving the deal.  
✅ Recommendation: DELETE THIS CLAUSE ENTIRELY. A startup should never pay to exit a contract.
`;
  }

  if (
    lowerClause.includes("exclusive") ||
    lowerClause.includes("exclusivity")
  ) {
    console.log("🚨 FORCED DELETE: Exclusivity");
    return `
🔹 Clause Title: Exclusivity  
❌ Original: "${original}"  
⚠️ Why It's Bad: This clause locks the startup into a single vendor or partner.  
✅ Recommendation: DELETE THIS CLAUSE or clearly define a short, limited term.
`;
  }

  if (
    lowerClause.includes("unlimited") &&
    lowerClause.includes("liability")
  ) {
    console.log("🚨 FORCED CAP: Unlimited Liability");
    return `
🔹 Clause Title: Liability  
❌ Original: "${original}"  
⚠️ Why It's Bad: Unlimited liability is a dealbreaker for startups.  
✅ Recommendation: Cap liability to total fees paid under this agreement.
`;
  }

  if (
  lowerClause.includes("penalty") ||
  lowerClause.includes("liquidated damages") ||
  lowerClause.includes("termination charge") ||
  lowerClause.includes("shall pay") ||
  lowerClause.includes("early termination")
)
 {
    console.log("🚨 FORCED REWRITE: Termination Without Cause");
    return `
🔹 Clause Title: Termination Conditions  
❌ Original: "${original}"  
⚠️ Why It's Bad: Termination should not depend on wrongdoing. Startups need freedom to exit.  
✅ Recommendation: Allow either party to terminate with or without cause, with 30 days’ written notice.
`;
  }

  // ✅ If no overrides, return GPT's output
  return gptOutput;
}

// 🔹 3. Main handler
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

      const rawOutput = data.choices[0].message?.content || "";
      console.log("🤖 GPT RETURNED:\n", rawOutput);

      const enforcedOutput = enforceStartupOverrides(clauseText, rawOutput);
      console.log("✅ FINAL OUTPUT SENT BACK:\n", enforcedOutput);

      return enforcedOutput;

    } catch (err) {
      console.error("❌ GPT call failed for clause:", clauseText, err);
      return `❌ Error processing this clause.`;
    }
  });

  try {
    const clauseAnalyses = await Promise.all(clauseAnalysisPromises);
    const finalAnalysis = clauseAnalyses.join("\n\n");
    res.status(200).json({ analysis: finalAnalysis });
  } catch (err) {
    console.error("❌ Final clause analysis failed:", err);
    res.status(500).json({ error: "AI analysis failed." });
  }
}

