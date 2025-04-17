export default async function handler(req, res) {
  const { contract } = req.body;

  const prompt = `
You are a contract review expert advising a small startup client. Your goal is to protect the small business by identifying contract terms that favor the vendor or pose risks, and suggesting stronger alternatives that limit client risk, maintain client flexibility, and ensure that client is only paying for value.

Always favor:
- Shorter termination windows (14–30 days)
- No termination penalties
- No exclusivity clauses
- Faster payment timelines for refunds, longer for payments
- Jurisdiction favorable to the small business (e.g. NY or remote arbitration)
- Minimizing penalties, liability, and lock-in
- Clarity, flexibility, and consent before changes

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
