export default abstract class StatusError extends Error {
    public readonly status: number;
    public readonly message: string;
    public details?: any;

    constructor(status: number, message: string) {
      super(message);
      this.status = status;
      this.message = message;
    }
}