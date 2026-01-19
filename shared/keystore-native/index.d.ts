export interface NapiKeystoreError {
  code: string;
  message: string;
}

export class NapiKeystore {
  constructor();
  
  setPassword(service: string, account: string, value: string): void;
  getPassword(service: string, account: string): string;
  deletePassword(service: string, account: string): void;
  isAvailable(): boolean;
}