import { Server } from 'socket.io'
import * as Y from 'yjs'
import { setupWSConnection } from 'y-socket.io/bin/utils'

interface ProjectDoc {
  doc: Y.Doc
  connections: Set<any>
}

// Store Y.js documents for each project
const projectDocs = new Map<string, ProjectDoc>()

export function setupCollaboration(io: Server) {
  io.on('connection', (socket) => {
    // Handle Y.js collaboration
    socket.on('yjs-connect', (data: { projectId: string, filePath: string }) => {
      const { projectId, filePath } = data
      const docKey = `${projectId}:${filePath}`
      
      // Get or create Y.js document for this file
      if (!projectDocs.has(docKey)) {
        projectDocs.set(docKey, {
          doc: new Y.Doc(),
          connections: new Set()
        })
      }

      const projectDoc = projectDocs.get(docKey)!
      projectDoc.connections.add(socket)

      // Setup WebSocket-like connection for Y.js
      const conn = {
        send: (data: Uint8Array) => {
          socket.emit('yjs-update', data)
        },
        close: () => {
          projectDoc.connections.delete(socket)
          if (projectDoc.connections.size === 0) {
            // Clean up empty documents after 5 minutes
            setTimeout(() => {
              if (projectDoc.connections.size === 0) {
                projectDocs.delete(docKey)
              }
            }, 5 * 60 * 1000)
          }
        },
        doc: projectDoc.doc
      }

      // Handle incoming Y.js updates
      socket.on('yjs-update', (update: Uint8Array) => {
        // Apply update to document
        Y.applyUpdate(projectDoc.doc, update)
        
        // Broadcast to all other connections
        projectDoc.connections.forEach(conn => {
          if (conn !== socket) {
            conn.emit('yjs-update', update)
          }
        })
      })

      // Send current document state to new connection
      const stateVector = Y.encodeStateVector(projectDoc.doc)
      const docUpdate = Y.encodeStateAsUpdate(projectDoc.doc, stateVector)
      socket.emit('yjs-sync', docUpdate)

      // Handle awareness updates (cursor positions, selections)
      socket.on('yjs-awareness', (awarenessUpdate: Uint8Array) => {
        // Broadcast awareness update to other connections
        projectDoc.connections.forEach(conn => {
          if (conn !== socket) {
            conn.emit('yjs-awareness', awarenessUpdate)
          }
        })
      })

      // Cleanup on disconnect
      socket.on('disconnect', () => {
        conn.close()
      })

      socket.on('yjs-disconnect', () => {
        conn.close()
      })
    })
  })
}

// Persistence (optional) - save documents to database
export function persistDocument(projectId: string, filePath: string, content: string) {
  // This could save the document state to MongoDB
  // For now, we'll handle persistence through the regular file update API
}
