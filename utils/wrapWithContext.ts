import config from "@config/config";

export const withOakContext = <T extends (...args: any[]) => any>(fn: T) => {
  return ((args: any) => {
    const context = {
      ...args.context,
      oakConfig: config,
    };
    return fn({ ...args, context });
  }) as T;
};