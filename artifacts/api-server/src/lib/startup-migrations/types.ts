export interface SqlClient {
  query: (sql: string) => Promise<unknown>;
}

export type SqlStep = {
  name: string;
  sql: string;
};
