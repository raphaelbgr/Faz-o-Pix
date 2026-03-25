import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('WebSocket broadcast functionality', () => {
  let websocketClients: Map<string, Set<any>>;
  let broadcastToBill: (billId: string, message: unknown) => void;

  beforeEach(() => {
    websocketClients = new Map();
    broadcastToBill = (billId: string, message: unknown) => {
      const clients = websocketClients.get(billId);
      if (clients) {
        const messageStr = JSON.stringify(message);
        clients.forEach((client) => {
          if (client.readyState === 1) { // WebSocket.OPEN
            client.send(messageStr);
          }
        });
      }
    };
  });

  it('should broadcast message to all connected clients', () => {
    const mockClient1 = { readyState: 1, send: vi.fn() };
    const mockClient2 = { readyState: 1, send: vi.fn() };

    websocketClients.set('bill-1', new Set([mockClient1, mockClient2]));

    broadcastToBill('bill-1', { type: 'BILL_UPDATED', data: { action: 'EXPENSE_ADDED' } });

    expect(mockClient1.send).toHaveBeenCalledOnce();
    expect(mockClient2.send).toHaveBeenCalledOnce();

    const sentMessage = JSON.parse(mockClient1.send.mock.calls[0][0]);
    expect(sentMessage.type).toBe('BILL_UPDATED');
    expect(sentMessage.data.action).toBe('EXPENSE_ADDED');
  });

  it('should not send to clients with closed connections', () => {
    const openClient = { readyState: 1, send: vi.fn() };
    const closedClient = { readyState: 3, send: vi.fn() }; // WebSocket.CLOSED

    websocketClients.set('bill-1', new Set([openClient, closedClient]));

    broadcastToBill('bill-1', { type: 'BILL_UPDATED' });

    expect(openClient.send).toHaveBeenCalledOnce();
    expect(closedClient.send).not.toHaveBeenCalled();
  });

  it('should not fail when broadcasting to non-existent bill', () => {
    expect(() => broadcastToBill('nonexistent', { type: 'test' })).not.toThrow();
  });

  it('should not fail when broadcasting to bill with no clients', () => {
    websocketClients.set('bill-1', new Set());
    expect(() => broadcastToBill('bill-1', { type: 'test' })).not.toThrow();
  });

  it('should handle multiple bills independently', () => {
    const client1 = { readyState: 1, send: vi.fn() };
    const client2 = { readyState: 1, send: vi.fn() };

    websocketClients.set('bill-1', new Set([client1]));
    websocketClients.set('bill-2', new Set([client2]));

    broadcastToBill('bill-1', { type: 'BILL_UPDATED', billId: 'bill-1' });

    expect(client1.send).toHaveBeenCalledOnce();
    expect(client2.send).not.toHaveBeenCalled();
  });

  it('should serialize message as JSON', () => {
    const client = { readyState: 1, send: vi.fn() };
    websocketClients.set('bill-1', new Set([client]));

    const message = {
      type: 'BILL_UPDATED',
      action: 'SETTLEMENT_ADDED',
      data: {
        id: 'settlement-1',
        amountCents: 5000,
        method: 'PIX',
      },
    };

    broadcastToBill('bill-1', message);

    const sent = JSON.parse(client.send.mock.calls[0][0]);
    expect(sent).toEqual(message);
  });
});

describe('WebSocket message handling', () => {
  it('should parse ping message and respond with pong', () => {
    const handler = (message: Buffer) => {
      try {
        const data = JSON.parse(message.toString()) as Record<string, string>;
        if (data.type === 'ping') {
          return { type: 'pong' };
        }
      } catch {
        return null;
      }
      return null;
    };

    const pingBuffer = Buffer.from(JSON.stringify({ type: 'ping' }));
    expect(handler(pingBuffer)).toEqual({ type: 'pong' });
  });

  it('should handle invalid JSON gracefully', () => {
    const handler = (message: Buffer) => {
      try {
        const data = JSON.parse(message.toString());
        return data;
      } catch {
        return null;
      }
    };

    const invalidBuffer = Buffer.from('not json');
    expect(handler(invalidBuffer)).toBeNull();
  });

  it('should ignore non-ping messages', () => {
    const handler = (message: Buffer) => {
      try {
        const data = JSON.parse(message.toString()) as Record<string, string>;
        if (data.type === 'ping') {
          return { type: 'pong' };
        }
      } catch {
        return null;
      }
      return null;
    };

    const otherBuffer = Buffer.from(JSON.stringify({ type: 'other' }));
    expect(handler(otherBuffer)).toBeNull();
  });
});
