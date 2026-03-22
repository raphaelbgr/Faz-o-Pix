import { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { zodToJsonSchema } from 'zod-to-json-schema'

const searchParticipantsSchema = z.object({
  pixKey: z.string().min(1).describe('PIX key to search for (CPF, email, phone)')
})

interface SearchParticipantsQuery {
  pixKey: string
}

interface GetParticipantParams {
  id: string
}

const participantRoutes: FastifyPluginAsync = async (fastify) => {
  console.log('🔍 Loading participants routes...')
  
  // Search participants by PIX key
  fastify.get<{ Querystring: SearchParticipantsQuery }>('/search', {
    schema: {
      querystring: zodToJsonSchema(searchParticipantsSchema),
      response: {
        200: zodToJsonSchema(z.array(z.object({
          id: z.string(),
          displayName: z.string().nullable(),
          pixKey: z.string(),
          type: z.string()
        })))
      }
    }
  }, async (request, reply) => {
    const { pixKey } = request.query

    try {
      // Search in participant_identifiers table for the PIX key
      const participantIdentifiers = await fastify.prisma.participantIdentifier.findMany({
        where: {
          value: {
            contains: pixKey,
            mode: 'insensitive'
          }
        },
        take: 10 // Limit results
      })

      if (participantIdentifiers.length === 0) {
        return reply.send([])
      }

      // Get participant details for found identifiers
      const participantIds = participantIdentifiers.map(pi => pi.participantId)
      const participants = await fastify.prisma.participant.findMany({
        where: {
          id: {
            in: participantIds
          }
        }
      })

      // Combine participant data with their PIX keys
      const results = participants.map(participant => {
        const identifier = participantIdentifiers.find(pi => pi.participantId === participant.id)
        return {
          id: participant.id,
          displayName: participant.displayName,
          pixKey: identifier?.value || '',
          type: identifier?.type || 'UNKNOWN'
        }
      })

      return reply.send(results)
    } catch (error) {
      fastify.log.error('Error searching participants:', error)
      return reply.status(500).send({ error: 'Internal server error' })
    }
  })

  // Get participant by ID
  fastify.get<{ Params: GetParticipantParams }>('/:id', {
    schema: {
      params: zodToJsonSchema(z.object({
        id: z.string().uuid()
      })),
      response: {
        200: zodToJsonSchema(z.object({
          id: z.string(),
          displayName: z.string().nullable(),
          identifiers: z.array(z.object({
            type: z.string(),
            value: z.string()
          }))
        })),
        404: zodToJsonSchema(z.object({
          error: z.string()
        }))
      }
    }
  }, async (request, reply) => {
    const { id } = request.params

    try {
      const participant = await fastify.prisma.participant.findUnique({
        where: { id }
      })

      if (!participant) {
        return reply.status(404).send({ error: 'Participant not found' })
      }

      // Get all identifiers for this participant
      const identifiers = await fastify.prisma.participantIdentifier.findMany({
        where: { participantId: id }
      })

      return reply.send({
        id: participant.id,
        displayName: participant.displayName,
        identifiers: identifiers.map(identifier => ({
          type: identifier.type,
          value: identifier.value
        }))
      })
    } catch (error) {
      fastify.log.error('Error getting participant:', error)
      return reply.status(500).send({ error: 'Internal server error' })
    }
  })
}

export default participantRoutes