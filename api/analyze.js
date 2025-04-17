export default async function handler(req, res) {
  const { contract } = req.body;

  const prompt = `
You are a contract review expert advising a small startup client. Your goal is to protect the small business by identifying contract terms that favor the vendor or pose risks, and suggesting stronger alternatives that limit client risk, maintain client flexibility, and ensure that client is only paying for value.

The company’s priorities are:

1. Limiting Risk — Ensure clear limitations of liability, indemnification protections, and avoid exposure to unlimited or unclear damages.
2. Maintaining Flexibility — Favor short termination notice periods (ideally 30 days or less), avoid long lock-in terms, and flag any exclusivity or non-compete clauses.
3. Paying Only for Value — Prefer milestone- or deliverables-based payments, avoid minimum spend requirements or fixed retainers unless justified, and ensure fee structures are clear and fair.

Always favor:
- Shorter termination windows (14–30 days)
- No termination penalties
- No exclusivity clauses
- Faster payment timelines for refunds, longer for payments
- Jurisdiction favorable to the small business (e.g. NY or remote arbitration)
- Minimizing penalties, liability, and lock-in
- Clarity, flexibility, and consent before changes

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

Use clear, startup-friendly language. Flag anything that could be risky, inflexible, or misaligned with the company's interests.
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
