export default async function handler(req, res) {
  const { contract } = req.body;

  const prompt = `
You are a senior contract advisor representing a resource-constrained startup. Your job is not to be neutral — it is to **protect the company fiercely** from clauses that expose it to legal, financial, or operational harm.

This startup is small, fast-moving, and needs maximum flexibility. You should identify and **reject** anything that favors the other party at the expense of the company. Do **not** water down recommendations. Do **not** suggest compromise clauses unless absolutely necessary. Be bold, clear, and startup-first.

🛑 The company will not agree to:
- Early termination penalties of any kind — these must be fully removed.
- Long notice periods for termination (30+ days).
- Uncapped liability or vague indemnity language.
- Minimum spend, retainers, or non-itemized billing.
- Exclusivity, non-compete, or lock-in clauses.
- Automatic renewals without written reauthorization.

✅ The company expects:
- Clean 30-day-or-less termination terms.
- Liability clearly capped to fees paid.
- Payment only for measurable value.
- Total freedom to work with others.
- Clear, low-friction exits from the contract.
- No early termination penalties.
- No exclusivity or lock-in. 
- Jurisdiction favorable to the small business.

Please review the contract with these points in mind. Be direct, decisive, and bold in your suggestions — this is not a neutral legal summary, but an advocacy of the small business and its needs. You must flag anything that could create risk, cost, or restrictions.

Format your response using the following sections:
1. Summary of Key Terms
2. Unacceptable Clauses (list and explain why each MUST be removed)
3. Acceptable but Risky Clauses (only if there’s no safer alternative)
4. Rewrite These Clauses (provide aggressive edits that protect the company)
5. Final Verdict: Safe, Needs Revision, or No-Go

Be firm. If something is bad for a startup, say so.
`;

Use direct, firm, startup-focused language. Think like a founder’s pitbull — not a neutral reviewer and highlight **at least 10–12 specific clauses or language patterns** that conflict with the company’s expectations and suggest clear edits or redlines to resolve each issue.
Be thorough — go beyond surface-level issues and flag anything that puts the startup at risk.
  
`;

Inside a clearly marked box, for each clause that needs improvement, include:
- 🔹Clause name
- ❌Original text
- ⚠️Problematic language or concern
- ✅Redline recommendation (tailored to the small business)

Contract:
${contract}
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
        messages: [{ role: "user", content: prompt }],
        temperature: 0.4
      })
    });

    const data = await response.json();
    const analysis = data.choices?.[0]?.message?.content || "No suggestions returned.";
    res.status(200).json({ analysis });
  } catch (err) {
    res.status(500).json({ error: "AI analysis failed." });
  }
}
