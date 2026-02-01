export class CustomError {
  code: string;
  message: string;
  constructor(code: string, message: string) {
    this.code = code;
    this.message = message;
  }
  static empty(): CustomError {
    return new CustomError('', '');
  }
}
