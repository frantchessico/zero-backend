declare module '@paymentsds/mpesa' {
  export class Client {
    constructor(config: {
      apiKey: string;
      publicKey: string;
      serviceProviderCode: string;
      host?: string;
    });
    receive(payload: {
      from: string;
      transaction: string;
      reference: string;
      amount: number;
    }): Promise<Record<string, any>>;
  }
}
