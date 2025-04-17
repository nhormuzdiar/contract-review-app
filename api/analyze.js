// 🔹 1. At the top of your file
function splitContractIntoClauses(contractText) {
  return contractText
    .split(/\n(?=\d{1,2}\.\d{1,2} )/)  // splits at lines like "11.2", "12.1"
    .filter(clause => clause.trim().length > 0);
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
    return data.choices?.[0]?.message?.content || "";
  });

  // 🔹 4. Wait for all clause reviews to complete
  const clauseAnalyses = await Promise.all(clauseAnalysisPromises);

  // 🔹 5. Join them together into one response
  const finalAnalysis = clauseAnalyses.join("\n\n");

  // 🔹 6. Return the full redline result
  res.status(200).json({ analysis: finalAnalysis });
}


