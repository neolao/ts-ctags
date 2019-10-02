export default class SimpleClass {
  private foo: string;

  public constructor() {
    this.foo = "bar";
  }

  public getFoo(): string {
    return this.foo;
  }
}
