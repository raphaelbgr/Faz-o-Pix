import fp from 'fastify-plugin';
import { FastifyPluginAsync } from 'fastify';
import websocket from '@fastify/websocket';

declare module 'fastify' {
  interface FastifyInstance {
    websocketClients: Map<string, Set<any>>;
    broadcastToBill: (billId: string, message: any) => void;
  }
}

const websocketPlugin: FastifyPluginAsync = async (fastify) => {
  await fastify.register(websocket);

  // Store WebSocket connections by bill ID
  const websocketClients = new Map<string, Set<any>>();
  
  fastify.decorate('websocketClients', websocketClients);
  fastify.decorate('broadcastToBill', (billId: string, message: any) => {
    const clients = websocketClients.get(billId);
    if (clients) {
      const messageStr = JSON.stringify(message);
      clients.forEach((client) => {
        if (client.readyState === 1) { // WebSocket.OPEN
          client.send(messageStr);
        }
      });
    }
  });

  fastify.register(async function (fastify) {
    fastify.get('/ws/bills/:billId', { websocket: true }, async (connection, req) => {
      const billId = (req.params as any).billId;
      
      // Verify user has access to this bill
      try {
        const token = req.query.token as string;
        if (!token) {
          connection.socket.close(1008, 'Authentication required');
          return;
        }

        const decoded = fastify.jwt.verify(token) as any;
        const userId = decoded.userId;

        // Check if user is a member of this bill
        const userParticipant = await fastify.prisma.userParticipantLink.findUnique({
          where: { userId },
        });

        if (!userParticipant) {
          connection.socket.close(1008, 'User not found');
          return;
        }

        const member = await fastify.prisma.billMember.findFirst({
          where: {
            billId,
            participantId: userParticipant.participantId,
          },
        });

        if (!member) {
          connection.socket.close(1008, 'Access denied');
          return;
        }

        // Add client to bill room
        if (!websocketClients.has(billId)) {
          websocketClients.set(billId, new Set());
        }
        
        const clients = websocketClients.get(billId)!;
        clients.add(connection.socket);

        fastify.log.info(`WebSocket connected to bill ${billId}, total clients: ${clients.size}`);

        // Send initial changelog
        const recentChangelog = await fastify.prisma.billChangelog.findMany({
          where: { billId },
          orderBy: { createdAt: 'desc' },
          take: 10,
        });

        // Get user details separately
        const changelogWithUsers = await Promise.all(
          recentChangelog.map(async (changelog) => {
            const user = await fastify.prisma.user.findUnique({
              where: { id: changelog.userId },
              select: { fullName: true },
            });
            return {
              ...changelog,
              user,
            };
          })
        );

        connection.socket.send(JSON.stringify({
          type: 'INITIAL_CHANGELOG',
          data: changelogWithUsers,
        }));

        // Handle client disconnect
        connection.socket.on('close', () => {
          clients.delete(connection.socket);
          if (clients.size === 0) {
            websocketClients.delete(billId);
          }
          fastify.log.info(`WebSocket disconnected from bill ${billId}, remaining clients: ${clients.size}`);
        });

        // Handle client messages (ping/pong for keepalive)
        connection.socket.on('message', (message) => {
          try {
            const data = JSON.parse(message.toString());
            if (data.type === 'ping') {
              connection.socket.send(JSON.stringify({ type: 'pong' }));
            }
          } catch (error) {
            fastify.log.error('Invalid WebSocket message:', error);
          }
        });

      } catch (error) {
        fastify.log.error('WebSocket authentication error:', error);
        connection.socket.close(1008, 'Authentication failed');
      }
    });
  });
};

export default fp(websocketPlugin, {
  name: 'websocket',
  dependencies: ['prisma', 'auth'],
});

export { websocketPlugin };