export class RecommendationValidationError extends Error {
  constructor(errors) {
    super("Recommendation request validation failed.");
    this.name = "RecommendationValidationError";
    this.errors = errors;
  }
}

export const validateRecommendationRequest = (payload) => {
  const errors = [];

  if (!payload || typeof payload !== "object") {
    throw new RecommendationValidationError(["Request body must be a JSON object."]);
  }

  const { impactId, ftirNumber } = payload;

  if (typeof impactId !== "string" || impactId.trim() === "") {
    errors.push("impactId must be a non-empty string.");
  }

  
  if (ftirNumber !== undefined && ftirNumber !== null && (typeof ftirNumber !== "string" || ftirNumber.length > 100)) {
    errors.push("ftirNumber, when given, must be a string of at most 100 characters.");
  }

  if (errors.length > 0) {
    throw new RecommendationValidationError(errors);
  }

  return {
    impactId: impactId.trim(),
    ftirNumber: typeof ftirNumber === "string" && ftirNumber.trim() ? ftirNumber.trim() : null,
  };
};