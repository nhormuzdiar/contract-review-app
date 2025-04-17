export default async function handler(req, res) {
  const { contract } = req.body;

  const prompt = `
You are a contract review expert advising a small fastmoving startup. Your job is to protect the company’s interests aggressively. Assume the startup has limited legal resources and needs contracts that are clear, fair, and flexible. Your tone should be confident and practical — speak like a trusted advisor who prioritizes speed, fairness, and value.

The company’s priorities are:

1. Limiting Risk — Ensure clear limitations of liability, indemnification protections, and avoid exposure to unlimited or unclear damages.
2. Maintaining Flexibility — Favor short termination notice periods (ideally 30 days or less), avoid long lock-in terms, and flag any exclusivity or non-compete clauses.
3. Paying Only for Value — Prefer milestone- or deliverables-based payments, avoid minimum spend requirements or fixed retainers unless justified, and ensure fee structures are clear and fair.

Here are the company’s non-negotiables:
- **No early termination penalties.** A small business should never be punished for ending an agreement.
- **Short, simple exit options.** Termination should be possible with 30 days’ notice or less.
- **Clear liability limits.** The company should not be on the hook for unlimited or unclear damages.
- **No exclusivity or lock-in.** The business must remain free to work with others or pivot quickly.
- **Only pay for real value.** Avoid minimums, retainers, or vague fees unless the benefit is obvious and documented.
- **Jurisdiction favorable to the small business (e.g. NY or remote arbitration)

Please review the contract with these points in mind. Be direct and bold in your suggestions — this is not a neutral legal summary. You are advocating for the small business and must flag anything that could create unfair risk, cost, or restrictions.
Please review the contract in detail and provide an analysis broken into the following sections:

1. **Summary of Key Terms**
2. **Termination & Exit Options**
3. **Payment Structure & Value Alignment**
4. **Liability & Indemnification**
5. **Exclusivity / Non-Compete Clauses**
6. **Automatic Renewal & Lock-in Risk**
7. **Intellectual Property & Confidentiality**
8. **Governing Law & Jurisdiction**
9. **Ambiguities or Vague Language**
10. **Risks / Red Flags**
11. **Suggested Revisions**
12. **Overall Alignment with Startup Priorities**

Be firm. If something is bad for a startup, say so.
`;

Flag anything that could be risky, inflexible, or misaligned with the company's interests. Highlight **at least 10–12 specific clauses or language patterns** that conflict with the company’s priorities and suggest clear edits or redlines to resolve each issue.
Be thorough — go beyond surface-level issues and flag anything that puts the startup at risk.


`;

Provide redline-style suggestions for improvement, including:
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
