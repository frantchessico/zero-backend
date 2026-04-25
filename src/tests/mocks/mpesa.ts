export class Client {
  async receive(_payload: {
    from: string;
    transaction: string;
    reference: string;
    amount: number;
  }) {
    return {
      status: 'SUCCESS',
      conversation: 'mock-conversation',
      transaction: 'mock-transaction',
      reference: 'mock-reference',
    };
  }
}
