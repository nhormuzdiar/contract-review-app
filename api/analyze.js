export default async function handler(req, res) {
  const { contract } = req.body;

 const prompt = `
You are an expert legal advocate representing a startup. Your goal is to **protect the business fiercely**. Do not act as a neutral reviewer — be assertive, direct, and always on the side of the small business.

This startup will walk away from contracts that:
- Penalize them for ending an agreement.
- Restrict their freedom to work with others.
- Include unclear or uncapped risk.
- Make them pay for vague, unmeasurable value.

You must:
- Recommend **full deletion** of early termination penalties.
- Flag all lock-in terms (auto-renewals, exclusivity, etc.)
- Reject uncapped or vague indemnity/liability language.
- Require termination within 30 days or less.
- Reject minimum spend or fixed retainers unless **clearly justified**.

---

Use the following format and tone for each issue:

Example:

🔹 Clause Name: Early Termination Penalty  
❌ Original: "If the client terminates early, they shall pay a penalty of 50% of the remaining balance."  
⚠️ Why: This clause punishes the startup for leaving a deal. No small business should ever accept this — it's unfair and risky.  
✅ Recommendation: **DELETE THIS CLAUSE ENTIRELY.** A startup should never pay to exit a contract. This is a deal-breaker.

---

Now repeat this format for at least 10 redlines based on the uploaded contract.

   Important:
   - **Do not suggest compromise** for bad clauses.
   - A penalty clause? ➤ “✅ Recommendation: DELETE this clause entirely.”
   - A vague indemnity clause? ➤ “✅ Recommendation: Cap liability to amount paid, and clarify scope.”

---

🔁 Output all 10+ issues clearly — if there are more, include them. Do not summarize vaguely. This is a startup’s only shot at avoiding a bad deal.
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
    temperature: 0.4,
    max_tokens: 3000  // 👈 Ensures longer, more complete responses
  })
});

    const data = await response.json();
    const analysis = data.choices?.[0]?.message?.content || "No suggestions returned.";
    res.status(200).json({ analysis });
  } catch (err) {
    res.status(500).json({ error: "AI analysis failed." });
  }
}

