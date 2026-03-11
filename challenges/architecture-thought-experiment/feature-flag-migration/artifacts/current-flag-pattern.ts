export function canAccessNewBillingFlow(userId: string, env: "prod" | "staging") {
  if (env !== "prod") {
    return true;
  }

  const allowList = new Set([
    "acct_102",
    "acct_481",
    "acct_922",
    "acct_1337",
  ]);

  return allowList.has(userId);
}

