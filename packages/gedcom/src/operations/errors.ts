export class TreeOperationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TreeOperationError";
  }
}
