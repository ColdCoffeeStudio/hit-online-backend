import { CustomError } from './customError';

export class Result {
  succeeded: boolean;
  error: CustomError;
  constructor(succeeded: boolean, error: CustomError) {
    this.succeeded = succeeded;
    this.error = error;
  }
}
