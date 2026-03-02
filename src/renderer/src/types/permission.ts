export interface PermissionRequest {
  requestID: string;
  tool?: string;
  filename?: string;
  reason?: string;
  sessionID?: string;
}
