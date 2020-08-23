import {
  Schema,
  Is,
  a,
  an,
  ValidatorService,
  IValidationMethod,
  yup,
  IValidationTransformer,
} from "../";
import { ContainerInstance } from "@kaviar/core";
import { ValidationError, StringSchema } from "yup";
import { ITestStringSchema } from "./defs.test";

describe("ValidatorService", () => {
  it("should work with simple validation", async () => {
    @Schema()
    class User {
      @Is(a.string().max(10))
      name: string;
    }

    const container = new ContainerInstance(Math.random());
    const validator = new ValidatorService(container);

    const result = await validator.validate(
      {
        name: "123456789",
      },
      {
        model: User,
      }
    );

    expect(result.name).toBe("123456789");

    await expect(
      validator.validate(
        {
          name: "12345678910",
        },
        {
          model: User,
        }
      )
    ).rejects.toBeInstanceOf(ValidationError);

    const user = new User();
    user.name = "123456789";

    const result2 = await validator.validate(user);

    expect(result2).toBeInstanceOf(User);
    expect(result2.name).toBe("123456789");

    user.name = "12345678910";
    await expect(validator.validate(user)).rejects.toBeInstanceOf(
      ValidationError
    );
  });

  it("should be able to add a custom validator async, container aware", async () => {
    const container = new ContainerInstance(Math.random());
    const validator = new ValidatorService(container);

    class IsABomb implements IValidationMethod<string> {
      // What is your string like, which you want to validate?
      parent = yup.string; // optional, defaults to yup.mixed
      name = "isNotBomb";

      constructor() {
        // Note that you can inject any dependency in the constructor, in our case, a database or api service
      }

      async validate(value: string, suffix: string, yupContext) {
        return new Promise((resolve, reject) => {
          // to ensure async
          if (value === "bomb" + (suffix ? suffix : "")) {
            reject(yupContext.createError({ message: "boom!" }));
          }

          resolve("ok");
        });
      }
    }

    validator.addMethod(IsABomb);

    // And ensure typescript knows about this!
    // Unfortunately, there's no automated way to do this.
    interface StringSchema<T> {
      isNotBomb(count: number): StringSchema<T>;
    }

    @Schema()
    class Package {
      @Is(() => (a.string() as ITestStringSchema).isNotBomb())
      name: string;
    }

    const pack = new Package();
    pack.name = "bomb";

    await expect(validator.validate(pack)).rejects.toBeInstanceOf(
      ValidationError
    );

    pack.name = "notbomb";
    await validator.validate(pack);

    @Schema()
    class Package2 {
      @Is(() => (a.string() as ITestStringSchema).isNotBomb("zz"))
      name: string;
    }

    const pack2 = new Package2();
    pack2.name = "bombzz";

    await expect(validator.validate(pack2)).rejects.toBeInstanceOf(
      ValidationError
    );

    pack2.name = "bombzzz";
    await validator.validate(pack2);
  });

  it("should be able to add a custom transformer async", async () => {
    const container = new ContainerInstance(Math.random());
    const validator = new ValidatorService(container);

    class ReverseTransformer implements IValidationTransformer<string, string> {
      // What is your string like, which you want to validate?
      parent = yup.string; // optional, defaults to yup.mixed
      name = "reverse";

      transform(value: string, originalValue: string, suffix: string, schema) {
        return value.split("").reverse().join("");
      }
    }

    validator.addTransformer(ReverseTransformer);

    @Schema()
    class Package {
      @Is((a.string() as ITestStringSchema).reverse())
      name: string;
    }

    const pack = new Package();
    pack.name = "bomb";

    const pack2 = await validator.validate(pack);
    expect(pack2.name).toBe("bmob");
  });
});
