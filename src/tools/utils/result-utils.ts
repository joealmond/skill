export type ToolResult<T = unknown> = {
  success: boolean;
  message?: string;
  data?: T;
};

export function ok<T>(data: T, message?: string): ToolResult<T> {
  return { success: true, data, message };
}

export function fail(message: string): ToolResult<null> {
  return { success: false, message, data: null };
}
