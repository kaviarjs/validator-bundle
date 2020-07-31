## Validator

Empowers you to:

- Validate objects seamlessly
- Create custom container-aware validation constraints which can be async
- It leverages popular package `yup`

```bash
npm install yup @types/yup @kaviar/validator
```

```typescript
import { a, an, Is, Schema, Nested } from "@kaviar/validator";

// a, an === yup basically
@Schema()
class UserRegistrationInput {
  @Is(a.string().email())
  email: string;

  @Is(a.number().lessThan(150).moreThan(18))
  age: number;

  @Nested()
  profile: ProfileRegistrationInput;
}

@Schema(an.object().required())
export class ProfileRegistrationInput {
  @Is(a.string())
  firstName: string;

  @Is(a.string())
  lastName: string;
}
```

```typescript
const validatorService = container.get(ValidatorService);

validatorService.validate(dataSet, {
  schema: UserRegistrationInput,
  ...ValidateOptions, // from yup
});

// Or simply validate the instance
// plainToClass from npm package "class-transformer", transforms a normal object into an instance
const instance = plainToClass(UserRegistrationInput, dataSet);

// If you use the instance, it'll know the constructor and you will not have to provide the schema model
await validatorService.validate(instance);
```

## Custom Validations

The validator is a class.

```typescript
import { yup, IValidationMethod } from "@kaviar/validator";

interface IUniqueFieldValidationConfig {
  message?: string;
  table: string;
  field: string;
}

class UniqueFieldValidationMethod
  implements IValidationMethod<IUniqueFieldValidationConfig> {
  // What is your string like, which you want to validate?
  parent = yup.string; // optional, defaults to yup.mixed, so to all
  name = "uniqueField";

  constructor() {
    // Note that you can inject any dependency in the constructor, in our case, a database or api service
  }

  async validate(
    value: string,
    config: IUniqueFieldValidationConfig,
    { createError, path }
  ) {
    // The 3d argument the context, can be found here:
    // https://github.com/jquense/yup#mixedtestname-string-message-string--function-test-function-schema

    const { table, field, message } = config;
    // search to see if that field exists

    if (valueAlreadyExists) {
      createError(message || `The field already exists`);
    }
  }
}

// And ensure typescript knows about this!
// Unfortunately, there's no automated way to do this.
// declarations.d.ts
import { yup } from "@kaviar/validator";

declare module "yup" {
  interface StringSchema<T> {
    uniqueField(config?: IUniqueFieldValidationConfig): StringSchema<T>;
  }
}
```

```typescript
const validatorService = container.get(ValidatorService);
validatorService.addMethod(UniqueFieldValidationMethod);
```

Now you could safely use it like this:

```typescript
@Schema()
class UserRegistrationInput {
  @Is(
    a.string().email().uniqueField({
      table: "users",
      field: "email",
    })
  )
  email: string;
}
```

## Transformer

Now let's say you receive from inputs a date, but not an object date, a string, "2018-12-04" you want to make it a date, so you would want to typecast it. That's done via transformers

```typescript
import { yup, IValidationMethod } from "@kaviar/validator";

type IDateTransformerConfig = string;

class DateTransformer implements IValidationMethod<IDateTransformerConfig, Date> {
  // What is your string like, which you want to validate?
  parent = yup.date, // optional, defaults to yup.mixed, so to all
  name = "format";

  // Note that this is not async
  // Transformers do not support async out of the box in yup
  transform(value: string, originalValue, format, schema) {
    if (value instanceof Date) {
      return value;
    }

    const date = moment(value, format || 'YYYY-MM-DD');

    return date.isValid() ? date.toDate() : new Date();
  }
}

declare module "yup" {
  interface DateSchema<T> {
    format(format?: string): DateSchema<T>
  }
}
```

```typescript
const validatorService = container.get(ValidatorService);
validatorService.addTransformer(DateTransformer);
```

Now you could safely use it like this:

```typescript
@Schema()
class PostCreateInput {
  @Is(a.date().format())
  publishAt: Date;
}

const input = {
  publishAt: "2050-12-31", // Remember this date.
};

const object = validatorService.validate(input, {
  schema: PostCreateInput,
});

// Casting has been doen automatically, if you want just casting: validatorService.cast(input)

object.publishAt; // instanceof Date now
```
