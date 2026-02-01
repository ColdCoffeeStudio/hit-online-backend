export class Card {
  dots: number;
  constructor(dots: number) {
    this.dots = dots;
  }
  static empty(): Card {
    return new Card(0);
  }
}
