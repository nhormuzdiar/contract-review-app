// 🔹 1. Smarter clause splitter with fallback support
function splitContractIntoClauses(contractText) {
  // Try splitting by standard legal structure first
  let clauses = contractText.split(/\n(?=(\d{1,2}\.|\bARTICLE\b|\bSection\b))/i);

  // Fallback: if too few, split by double newlines (paragraph-style)
  if (clauses.length < 8) {
    clauses = contractText.split(/\n{2,}/); // paragraph-based splitting
  }

  return clauses
    .map(clause => clause.trim())
    .filter(clause => clause.length > 30); // remove short junk clauses
}

// 🔹 2. Redline override logic to enforce small-business standards
function enforceStartupOverrides(clauseText, gptOutput) {
  const lowerClause = clauseText.toLowerCase();
  const lowerOutput = gptOutput.toLowerCase();

  let additions = "";

  // 🚫 Early Termination Penalty
  if (
    lowerClause.includes("termination") &&
    lowerOutput.includes("penalty") &&
    !lowerOutput.includes("delete this clause")
  ) {
    additions += `
⚠️ Override: This clause imposes a termination penalty. Startups should never pay to exit a contract.
✅ Recommendation: DELETE THIS CLAUSE ENTIRELY.
`;
  }

  // 🚫 Exclusivity or Lock-in
  if (
    lowerClause.includes("exclusive") &&
    !lowerOutput.includes("delete this clause")
  ) {
    additions += `
⚠️ Override: This clause limits your freedom to work with other vendors or providers.
✅ Recommendation: DELETE THIS CLAUSE or revise it to be non-exclusive.
`;
  }

  // 🚫 Uncapped liability
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

  return gptOutput + additions;
}

// 🔹 3. Your main handler
export default async function handler(req, res) {
  const { contract } = req.body;

  let clauses = splitContractIntoClauses(contract);

  // 🔧 Ensure at least 10 chunks to analyze
  if (clauses.length < 10) {
    const fallbackChunks = contract.match(/.{300,600}[\s.]/g) || [];
    clauses = clauses.concat(fallbackChunks.slice(0, 10 - clauses.length));
  }

  console.log("📄 Clauses sent for review:", clauses.length);

  // 🔹 4. GPT prompt for each clause
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
    const rawOutput = data.choices?.[0]?.message?.content || "";
    const enforcedOutput = enforceStartupOverrides(clauseText, rawOutput);
    return enforcedOutput;
  });

  // 🔹 5. Wait for all clause reviews to complete
  const clauseAnalyses = await Promise.all(clauseAnalysisPromises);

  // 🔹 6. Combine all redlines into a single response
  const finalAnalysis = clauseAnalyses.join("\n\n");

  // 🔹 7. Return the full redline result
  res.status(200).json({ analysis: finalAnalysis });
}
