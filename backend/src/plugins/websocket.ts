import fp from 'fastify-plugin';
import { FastifyPluginAsync } from 'fastify';
import websocket from '@fastify/websocket';
import { WebSocket } from 'ws';

declare module 'fastify' {
  interface FastifyInstance {
    websocketClients: Map<string, Set<WebSocket>>;
    broadcastToBill: (billId: string, message: unknown) => void;
  }
}

const websocketPlugin: FastifyPluginAsync = async (fastify) => {
  await fastify.register(websocket);

  // Store WebSocket connections by bill ID
  const websocketClients = new Map<string, Set<WebSocket>>();

  fastify.decorate('websocketClients', websocketClients);
  fastify.decorate('broadcastToBill', (billId: string, message: unknown) => {
    const clients = websocketClients.get(billId);
    if (clients) {
      const messageStr = JSON.stringify(message);
      clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(messageStr);
        }
      });
    }
  });

  fastify.register(async function (innerFastify) {
    innerFastify.get('/ws/bills/:billId', { websocket: true }, async (socket, req) => {
      const billId = (req.params as Record<string, string>).billId as string;

      // Verify user has access to this bill
      try {
        const query = req.query as Record<string, string | undefined>;
        const token = query.token;
        if (!token) {
          socket.close(1008, 'Authentication required');
          return;
        }

        const decoded = innerFastify.jwt.verify(token) as Record<string, string | undefined>;
        const userId = decoded.userId;
        if (!userId) {
          socket.close(1008, 'Invalid token');
          return;
        }

        // Check if user is a member of this bill
        const userParticipant = await innerFastify.prisma.userParticipantLink.findUnique({
          where: { userId },
        });

        if (!userParticipant) {
          socket.close(1008, 'User not found');
          return;
        }

        const member = await innerFastify.prisma.billMember.findFirst({
          where: {
            billId,
            participantId: userParticipant.participantId,
          },
        });

        if (!member) {
          socket.close(1008, 'Access denied');
          return;
        }

        // Add client to bill room
        if (!websocketClients.has(billId)) {
          websocketClients.set(billId, new Set());
        }

        const clients = websocketClients.get(billId)!;
        clients.add(socket);

        innerFastify.log.info(`WebSocket connected to bill ${billId}, total clients: ${clients.size}`);

        // Send initial changelog
        const recentChangelog = await innerFastify.prisma.billChangelog.findMany({
          where: { billId },
          include: {
            user: {
              select: { fullName: true },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        });

        socket.send(JSON.stringify({
          type: 'INITIAL_CHANGELOG',
          data: recentChangelog,
        }));

        // Handle client disconnect
        socket.on('close', () => {
          clients.delete(socket);
          if (clients.size === 0) {
            websocketClients.delete(billId);
          }
          innerFastify.log.info(`WebSocket disconnected from bill ${billId}, remaining clients: ${clients.size}`);
        });

        // Handle client messages (ping/pong for keepalive)
        socket.on('message', (message: Buffer) => {
          try {
            const data = JSON.parse(message.toString()) as Record<string, string>;
            if (data.type === 'ping') {
              socket.send(JSON.stringify({ type: 'pong' }));
            }
          } catch (error) {
            innerFastify.log.error({ err: error }, 'Invalid WebSocket message');
          }
        });

      } catch (error) {
        innerFastify.log.error({ err: error }, 'WebSocket authentication error');
        socket.close(1008, 'Authentication failed');
      }
    });
  });
};

export default fp(websocketPlugin, {
  name: 'websocket',
  dependencies: ['prisma', 'auth'],
});

export { websocketPlugin };
