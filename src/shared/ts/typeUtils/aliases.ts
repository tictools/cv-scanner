export type Maybe<T> = T | undefined;
export type NonEmptyArray<T> = [T, ...T[]];
export type Nullable<T> = T | null;
export type PromiseOr<T> = T | Promise<T>;
export type ValueOf<T> = T[keyof T];
