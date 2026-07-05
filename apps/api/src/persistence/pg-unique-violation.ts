// Postgres unique-violation detection, shared by the TypeORM repositories.
// TypeORM wraps driver errors in `QueryFailedError`, but importing that class
// here would couple us to TypeORM's error hierarchy; duck-typing the shape we
// need keeps this decoupled and easy to unit test with plain object fixtures.
const UNIQUE_VIOLATION_SQLSTATE = '23505';

type PossiblePgError = {
  driverError?: { code?: string; constraint?: string };
};

/** True when `error` is a Postgres unique-violation (23505) on `constraint`. */
export function isUniqueViolation(error: unknown, constraint: string): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const driverError = (error as PossiblePgError).driverError;
  return driverError?.code === UNIQUE_VIOLATION_SQLSTATE && driverError?.constraint === constraint;
}
