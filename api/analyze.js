// 🔹 1. Smarter clause splitter with fallback support
function splitContractIntoClauses(contractText) {
  let clauses = contractText.split(/\n(?=(\d{1,2}\.|\bARTICLE\b|\bSection\b))/i);

  if (clauses.length < 8) {
    clauses = contractText.split(/\n{2,}/); // fallback by paragraph
  }

  return clauses
    .map(clause => clause.trim())
    .filter(clause => clause.length > 30); // filter out junk
}

// 🔹 2. Redline override logic to enforce small-business standards
function enforceStartupOverrides(clauseText, gptOutput) {
  const lowerClause = clauseText.toLowerCase();
  const lowerOutput = gptOutput.toLowerCase();

  const original = clauseText.trim();

  // 🚫 FORCE DELETE: Termination Penalties
  if (
    lowerClause.includes("termination") &&
    lowerClause.includes("penalty")
  ) {
    console.log("🚨 FORCED DELETE: Termination Penalty");
    return `
🔹 Clause Title: Early Termination Penalty  
❌ Original: "${original}"  
⚠️ Why It's Bad: This clause punishes the startup for exiting a bad deal.  
✅ Recommendation: DELETE THIS CLAUSE ENTIRELY.
`;
  }

  // 🚫 FORCE DELETE or LIMIT: Exclusivity
  if (
    lowerClause.includes("exclusive") ||
    lowerClause.includes("exclusivity")
  ) {
    console.log("🚨 FORCED DELETE: Exclusivity");
    return `
🔹 Clause Title: Exclusivity  
❌ Original: "${original}"  
⚠️ Why It's Bad: This clause locks the startup into one relationship and limits future opportunities.  
✅ Recommendation: DELETE THIS CLAUSE or strictly limit it to a short, project-specific scope.
`;
  }

  // 🚫 FORCE CAP: Unlimited Liability
  if (
    lowerClause.includes("unlimited") &&
    lowerClause.includes("liability")
  ) {
    console.log("🚨 FORCED CAP: Liability");
    // 🚫 FORCE REWRITE: Termination should be allowed with or without cause
if (
  lowerClause.includes("termination") &&
  (
    lowerClause.includes("material breach") ||
    lowerClause.includes("for cause") ||
    lowerClause.includes("only if") ||
    lowerClause.includes("failure to perform") ||
    lowerClause.includes("violation of this agreement")
  )
) {
  console.log("🚨 FORCED REWRITE: Termination clause requires breach — not acceptable");

  return `
🔹 Clause Title: Termination Conditions  
❌ Original: "${original}"  
⚠️ Why It's Bad: This clause only permits termination if one party violates the agreement. A startup must retain the right to exit an agreement at any time, for any reason.  
✅ Recommendation: Allow either party to terminate at will, with 30 days’ written notice, regardless of breach.
`;
}

    return `
🔹 Clause Title: Liability  
❌ Original: "${original}"  
⚠️ Why It's Bad: Unlimited liability is too risky for a small business.  
✅ Recommendation: Cap liability to the amount paid and clearly define the limits.
`;
  }

  // ✅ No override needed
  return gptOutput;
}

  if (additions) {
    console.log("✅ OVERRIDE TRIGGERED for clause:\n", clauseText);
  }

  return additions || gptOutput;
}

// 🔹 3. Your main handler
export default async function handler(req, res) {
  const { contract } = req.body;

  let clauses = splitContractIntoClauses(contract);

  // 🔧 Ensure at least 10 chunks
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

  // 🔹 5. Combine results (with catch)
  try {
    const clauseAnalyses = await Promise.all(clauseAnalysisPromises);
    const finalAnalysis = clauseAnalyses.join("\n\n");
    res.status(200).json({ analysis: finalAnalysis });
  } catch (err) {
    console.error("❌ Final clause analysis failed:", err);
    res.status(500).json({ error: "AI analysis failed." });
  }
}
