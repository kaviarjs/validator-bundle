import { IValidationMethod } from "../defs";
import { mixed, TestContext, AnySchemaConstructor } from "yup";

// export abstract class ValidationMethod implements IValidationMethod<T> {
//   name: string;
//   message?: string;
//   parent?: AnySchemaConstructor = mixed;

//   validate(value: any, config: T, yupContext: TestContext): Promise<any> {
//     throw new Error("Method not implemented.");
//   }
// }

// .kaviar(GitHubUsername.validator())
