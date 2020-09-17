import { ObjectSchema, Schema, ValidateOptions } from "yup";
import * as yup from "yup";

export type SchemaOrSchemaCreator = Schema<any> | (() => Schema<any>);

/**
 *
 */
export class MetadataStorage {
  private _metadataMap = new Map<
    Function,
    Map<string, SchemaOrSchemaCreator>
  >();

  addSchemaMetadata({ target, schema, property }) {
    let schemaMap = this._metadataMap.get(target);
    if (!schemaMap) {
      schemaMap = new Map<string, SchemaOrSchemaCreator>();
      this._metadataMap.set(target, schemaMap);
    }
    schemaMap.set(property, schema);
  }

  findSchemaMetadata(target) {
    return this._metadataMap.get(target);
  }
}

const metadataStorage = new MetadataStorage();

const YupSchemaCreator = Symbol("YupSchemaCreator");
const YupSchema = Symbol("YupSchema");

/**
 * Get the schema by type
 * @param target the object's type (class)
 * @returns The yup schema
 */
export function getSchemaByType(target: Object) {
  const constructor = target instanceof Function ? target : target.constructor;
  let schema = constructor[YupSchema];

  if (!schema) {
    schema = createAndStoreSchema(constructor);
  }

  return schema;
}

/**
 * Register a schema
 * @param objectSchema The initial schema
 */
export function schema(
  objectSchema: ObjectSchema = yup.object()
): ClassDecorator {
  return (target) => {
    // The idea is that we don't generate the schema on the fly
    // We get the schema via SchemaStorage service which is responsible of
    target[YupSchemaCreator] = () => defineSchema(target, objectSchema);
  };
}

function createAndStoreSchema(model: Function) {
  const creator = model[YupSchemaCreator];
  if (!creator) {
    throw new Error(`No schema creator attached to this model`);
  }

  const schema = model[YupSchemaCreator]();
  model[YupSchema] = schema;

  return schema;
}

/**
 * Register a schema to the given property
 * @param schema the schema to register
 */
export function is(schema: SchemaOrSchemaCreator): PropertyDecorator {
  return (target: Object, property: string | symbol) => {
    metadataStorage.addSchemaMetadata({
      target: target instanceof Function ? target : target.constructor,
      property,
      schema,
    });
  };
}

/**
 * Register an object schema to the given property
 */
export function nested(): PropertyDecorator {
  return (target: Object, property: string | symbol) => {
    const nestedType = (Reflect as any).getMetadata(
      "design:type",
      target,
      property
    );
    let registeredSchema = getSchemaByType(nestedType);
    if (!registeredSchema) {
      const savedSchema = metadataStorage.findSchemaMetadata(nestedType);
      if (!savedSchema) {
        return;
      }
      // if the schema was not registered via @schema, build one for it automatically
      registeredSchema = defineSchema(nestedType, yup.object());
    }
    metadataStorage.addSchemaMetadata({
      target: target instanceof Function ? target : target.constructor,
      property,
      schema: registeredSchema,
    });
  };
}

export interface IValidateArguments {
  object: object;
  options?: ValidateOptions;
}

export interface IValidatePathArguments {
  object: object;
  options?: ValidateOptions;
  path: string;
}

function getSchema({ object }) {
  if (object === null || typeof object !== "object") {
    throw new Error("Cannot validate non object types");
  }

  return getSchemaByType(object.constructor);
}

export const a = yup;
export const an = yup;

function defineSchema(target, objectSchema: ObjectSchema) {
  const schemaMap = metadataStorage.findSchemaMetadata(target);

  if (!schemaMap) {
    return;
  }
  const objectShape = Array.from(schemaMap.entries()).reduce(
    (currentShape, [property, schema]) => {
      if (schema instanceof Function) {
        currentShape[property] = schema();
      } else {
        currentShape[property] = schema;
      }
      return currentShape;
    },
    {}
  );
  objectSchema = objectSchema.shape(objectShape);
  return objectSchema;
}
