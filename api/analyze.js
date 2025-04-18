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
  const original = clauseText.trim();

  // 🚫 Force delete: Early termination penalties
  if (
    lowerClause.includes("termination") &&
    (
      lowerClause.includes("penalty") ||
      lowerClause.includes("liquidated damages") ||
      lowerClause.includes("fee for early termination") ||
      lowerClause.includes("termination charge") ||
      lowerClause.includes("must pay") ||
      lowerClause.includes("shall pay") ||
      lowerClause.includes("remaining balance")
    )
  ) {
    console.log("🚨 FORCED DELETE: Termination Penalty");
    return `
🔹 Clause Title: Early Termination Penalty  
❌ Original: "${original}"  
⚠️ Why It's Bad: This clause financially punishes the startup for leaving the deal.  
✅ Recommendation: DELETE THIS CLAUSE ENTIRELY. A startup should never pay to exit a contract.
`;
  }

  // 🚫 Force delete: Exclusivity clauses
  if (
    lowerClause.includes("exclusive") ||
    lowerClause.includes("exclusivity")
  ) {
    console.log("🚨 FORCED DELETE: Exclusivity Clause");
    return `
🔹 Clause Title: Exclusivity  
❌ Original: "${original}"  
⚠️ Why It's Bad: This locks the startup into one provider or relationship and limits future opportunities.  
✅ Recommendation: DELETE THIS CLAUSE or strictly narrow its scope and timeline.
`;
  }

  // 🚫 Force cap: Unlimited liability
  if (
    lowerClause.includes("unlimited") &&
    lowerClause.includes("liability")
  ) {
    console.log("🚨 FORCED CAP: Unlimited Liability");
    return `
🔹 Clause Title: Unlimited Liability  
❌ Original: "${original}"  
⚠️ Why It's Bad: This clause creates uncapped risk, which is unacceptable for any startup.  
✅ Recommendation: Cap liability to the total fees paid under the contract.
`;
  }

  // 🚫 Force rewrite: Termination only on breach
  if (
    lowerClause.includes("termination") &&
    (
      lowerClause.includes("material breach") ||
      lowerClause.includes("violation") ||
      lowerClause.includes("for cause") ||
      lowerClause.includes("failure to perform")
    )
  ) {
    console.log("🚨 FORCED REWRITE: Termination Without Cause");
    return `
🔹 Clause Title: Termination Conditions  
❌ Original: "${original}"  
⚠️ Why It's Bad: Termination should not depend on wrongdoing. A startup must retain the right to exit cleanly.  
✅ Recommendation: Either party should be able to terminate with or without cause, with 30 days’ notice.
`;
  }

  // ✅ No override triggered — return GPT's result
  return gptOutput;
}
