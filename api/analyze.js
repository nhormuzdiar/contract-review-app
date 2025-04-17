export default async function handler(req, res) {
  const { contract } = req.body;

  const prompt = `
You are a contract reviewer working for a small startup. Your job is to be an **aggressive advocate**, not a neutral party. You must identify and push back against any contract language that puts the company at risk, limits its flexibility, or forces it to pay for things it doesn’t clearly benefit from.

This startup cannot afford bad deals, and it expects YOU to protect it. Do NOT hedge. Be bold, direct, and decisive.

---

🛑 Automatically reject clauses that:
- Impose early termination penalties. These must be removed — no exceptions.
- Require 30+ days notice to terminate.
- Include exclusivity or non-competes.
- Introduce uncapped liability or vague indemnity terms.
- Have minimum spend, fixed retainers, or auto-renewal traps.

✅ The company requires:
- Termination with 30 days or less, no penalties.
- Clear, capped liability (ideally limited to fees paid).
- Freedom to engage with other vendors.
- Only paying for measurable value.

---

### Format your analysis in 3 parts:

1. 🔍 **Summary of Key Terms**
   - Summarize the structure and major obligations.
2. 🚨 **Red Flags (at least 10 issues)**
   - Identify **at least 10 specific clauses or lines** that violate the startup’s values.
   - Use 🔹 **Clause Name**, ❌ **Original**, ⚠️ **Why It’s a Problem**, ✅ **Startup-Friendly Rewrite**
   - If the clause should be deleted entirely, say so directly.
3. ✅ **Final Verdict**
   - Is this contract startup-safe? Use bold language. If it’s a bad deal, say: **This contract is not startup-safe. Do not sign until all major risks are removed.**

DO NOT stop at 3–5 suggestions. Find **at least 10**. If there are more problems, include them all.

  
`;

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
