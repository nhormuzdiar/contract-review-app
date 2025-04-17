// 🔹 1. At the top of your file
function splitContractIntoClauses(contractText) {
  return contractText
    .split(/\n(?=(\d{1,2}\.|\bARTICLE\b|\bSection\b))/i)  // Matches "11.", "ARTICLE", "Section"
    .map(clause => clause.trim())
    .filter(clause => clause.length > 30); // remove empty or meaningless chunks
}
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


// 🔹 2. Your main handler
export default async function handler(req, res) {
  const { contract } = req.body;

  const clauses = splitContractIntoClauses(contract);

  // 🔹 3. GPT prompt for each clause
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

  // 🔹 4. Wait for all clause reviews to complete
  const clauseAnalyses = await Promise.all(clauseAnalysisPromises);

  // 🔹 5. Join them together into one response
  const finalAnalysis = clauseAnalyses.join("\n\n");

  // 🔹 6. Return the full redline result
  res.status(200).json({ analysis: finalAnalysis });
}


