
export const QueueValidators = {
  validate(item: any) {
    if (!item.id) return false;
    if (!item.type) return false; // ex: "mission", "review", "asset", "generic"
    if (!item.userId) return false;
    return true;
  },

  validatePriority(priority: string) {
    const valid = ["low", "normal", "high", "urgent"];
    return valid.includes(priority);
  }
};
