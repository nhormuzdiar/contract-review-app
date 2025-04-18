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

  let enforcedOutput = gptOutput;

  // 🚫 EARLY TERMINATION PENALTIES
  if (
    lowerClause.includes("penalty") &&
    (lowerClause.includes("termination") || lowerClause.includes("early termination"))
  ) {
    console.log("🚫 FORCING DELETION of penalty clause");
    enforcedOutput = `
🔹 Clause Title: Early Termination Penalty  
❌ Original: "${clauseText.trim()}"  
⚠️ Why It's Bad: This clause imposes a financial penalty on the startup for exiting early. Startups should never pay to leave a bad deal.  
✅ Recommendation: DELETE THIS CLAUSE ENTIRELY.
`;
  }

  // 🚫 EXCLUSIVITY / LOCK-IN
  else if (
    lowerClause.includes("exclusive") ||
    lowerClause.includes("exclusivity")
  ) {
    console.log("🚫 FORCING DELETION of exclusivity clause");
    enforcedOutput = `
🔹 Clause Title: Exclusivity  
❌ Original: "${clauseText.trim()}"  
⚠️ Why It's Bad: This clause limits the startup's ability to work with other clients or vendors.  
✅ Recommendation: DELETE THIS CLAUSE or clearly limit its scope to specific, short-term projects.
`;
  }

  // 🚫 UNLIMITED LIABILITY
  else if (
    lowerClause.includes("unlimited") &&
    lowerClause.includes("liability")
  ) {
    console.log("🚫 FORCING CAP on liability clause");
    enforcedOutput = `
🔹 Clause Title: Liability  
❌ Original: "${clauseText.trim()}"  
⚠️ Why It's Bad: Unlimited liability is unfair and dangerous for a startup.  
✅ Recommendation: Cap liability to the total fees paid under this agreement, and clearly limit scope.
`;
  }

  return enforcedOutput;
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
