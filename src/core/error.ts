
export class AWError extends Error {
  code: number;
  
  constructor(message: string, code = 500) {
    super(message);
    this.code = code;
    this.name = "AWError";
  }
}
