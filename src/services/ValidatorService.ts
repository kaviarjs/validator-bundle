import { ContainerInstance, Constructor } from "@kaviar/core";
import { IValidationMethod, IValidateOptions } from "../defs";
import { getSchemaByType } from "yup-decorator";
import { SchemaNotIdentifiedException } from "../exceptions";
import { Schema, addMethod, mixed as MixedSchema } from "yup";
import { IValidationTransformer } from "../defs";

export class ValidatorService {
  constructor(protected readonly container: ContainerInstance) {}

  async validate<T = any>(object: any, options?: IValidateOptions) {
    return this.getSchema(object, options).validate(object, options);
  }

  async isValid(object: any, options?: IValidateOptions) {
    return this.getSchema(object, options).isValid(object, options);
  }

  async validateAt(path: string, object: any, options?: IValidateOptions) {
    return this.getSchema(object, options).validateAt(path, object, options);
  }

  cast(object: any, options?: any) {
    return this.getSchema(object, options).cast(object, options);
  }

  getSchema(object: any, options?: IValidateOptions): Schema<any> {
    // try to get the sc
    let model;
    if (options?.model) {
      model = options.model;
    } else {
      model = object.constructor;
    }

    if (!model) {
      throw new SchemaNotIdentifiedException();
    }

    const schema = getSchemaByType(model);

    if (!schema) {
      throw new SchemaNotIdentifiedException();
    }

    return schema;
  }

  addMethod(methodClass: Constructor<IValidationMethod>) {
    const method = this.container.get<IValidationMethod>(methodClass);

    let { parent, name } = method;

    if (!parent) {
      parent = MixedSchema;
    }

    addMethod<any>(parent, name, function (config?: any) {
      return this.test({
        name: name,
        message: config?.message || method.message,
        params: config,
        async test(value) {
          return method.validate(value, config, this);
        },
      });
    });
  }

  addTransformer(transformerClass: { new (): IValidationTransformer }) {
    const transformer = this.container.get<IValidationTransformer>(
      transformerClass
    );
    let { parent, name } = transformer;

    if (!parent) {
      parent = MixedSchema;
    }

    addMethod<any>(parent, name, function (config?: any) {
      return this.transform(function (value, originalValue) {
        return transformer.transform(value, originalValue, config, this);
      });
    });
  }
}
