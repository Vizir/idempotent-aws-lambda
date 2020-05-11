export interface Provider {
  fetch: (messageId: string) => Promise<any>;
  isProcessing: (messageId: string) => Promise<boolean>;
  update: (messageId: string, result: any) => Promise<void>;
}
