import { Constructor } from "@kaviar/core";
import {
  ValidateOptions,
  AnySchemaConstructor,
  TestContext,
  MixedSchema,
  string,
} from "yup";

export { ValidateOptions };

export interface IValidateOptions extends ValidateOptions {
  /**
   * This represents a schema model class created with @Schema decorator
   */
  model: any;
}

export interface IValidationMethod<T = any, V = any> {
  name: string;
  message?: string;
  parent?: AnySchemaConstructor;
  validate(value: V, config: T, yupContext: TestContext): Promise<void | V>;
}

export interface IValidationTransformer<
  C = any,
  V = any,
  Schema = MixedSchema
> {
  name: string;
  parent?: AnySchemaConstructor;
  transform(
    value: any | V,
    originalValue: any | V,
    config: C,
    schema: Schema
  ): V;
}

export interface IKaviarValidation<T = any> {
  type: Constructor<IValidationMethod>;
  options?: T;
}
