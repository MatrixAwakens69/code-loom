import { useState, useEffect, useRef, useCallback } from 'react'
import { Mic, MicOff, Phone, PhoneOff, Volume2, VolumeX, X, Users } from 'lucide-react'
import { useSocket } from '../contexts/SocketContext'
import toast from 'react-hot-toast'

interface User {
  id: string
  email: string
  name: string
  avatar?: string
}

interface VoiceChatProps {
  projectId: string
  currentUser: User
  onClose: () => void
}

interface PeerConnection {
  pc: RTCPeerConnection
  stream?: MediaStream
  userId: string
  userName: string
  isMuted: boolean
  isConnected: boolean
}

const iceServers = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
]

export default function VoiceChat({ projectId, currentUser, onClose }: VoiceChatProps) {
  const { socket } = useSocket()
  const [isConnected, setIsConnected] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [isDeafened, setIsDeafened] = useState(false)
  const [peers, setPeers] = useState<Map<string, PeerConnection>>(new Map())
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [isInitializing, setIsInitializing] = useState(false)

  const localAudioRef = useRef<HTMLAudioElement>(null)
  const peersRef = useRef<Map<string, PeerConnection>>(new Map())

  // Update refs when state changes
  useEffect(() => {
    peersRef.current = peers
  }, [peers])

  const createPeerConnection = useCallback((userId: string, userName: string) => {
    const pc = new RTCPeerConnection({ iceServers })
    
    pc.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit('webrtc-ice-candidate', {
          to: userId,
          candidate: event.candidate
        })
      }
    }

    pc.ontrack = (event) => {
      const remoteStream = event.streams[0]
      
      setPeers(prev => {
        const newPeers = new Map(prev)
        const peerConn = newPeers.get(userId)
        if (peerConn) {
          peerConn.stream = remoteStream
          peerConn.isConnected = true
        }
        return newPeers
      })

      // Create audio element for remote stream
      const audioElement = new Audio()
      audioElement.srcObject = remoteStream
      audioElement.play().catch(console.error)
    }

    pc.onconnectionstatechange = () => {
      console.log(`Connection state with ${userName}:`, pc.connectionState)
      
      setPeers(prev => {
        const newPeers = new Map(prev)
        const peerConn = newPeers.get(userId)
        if (peerConn) {
          peerConn.isConnected = pc.connectionState === 'connected'
        }
        return newPeers
      })

      if (pc.connectionState === 'failed') {
        toast.error(`Connection failed with ${userName}`)
      }
    }

    return pc
  }, [socket])

  const initializeVoiceChat = async () => {
    if (isInitializing) return
    
    setIsInitializing(true)
    try {
      // Get user media
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000,
          channelCount: 1
        }
      })
      
      setLocalStream(stream)
      
      // Set up local audio element
      if (localAudioRef.current) {
        localAudioRef.current.srcObject = stream
        localAudioRef.current.muted = true // Don't hear yourself
      }

      setIsConnected(true)
      toast.success('Connected to voice chat')
    } catch (error) {
      console.error('Failed to initialize voice chat:', error)
      toast.error('Failed to access microphone')
    } finally {
      setIsInitializing(false)
    }
  }

  const disconnectVoiceChat = () => {
    // Stop local stream
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop())
      setLocalStream(null)
    }

    // Close all peer connections
    peers.forEach(peer => {
      peer.pc.close()
    })
    setPeers(new Map())

    setIsConnected(false)
    toast('Disconnected from voice chat', { icon: '📞' })
  }

  const toggleMute = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0]
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled
        setIsMuted(!audioTrack.enabled)
        toast(audioTrack.enabled ? 'Microphone unmuted' : 'Microphone muted', {
          icon: audioTrack.enabled ? '🎤' : '🔇'
        })
      }
    }
  }

  const toggleDeafen = () => {
    setIsDeafened(!isDeafened)
    toast(isDeafened ? 'Audio enabled' : 'Audio disabled', {
      icon: isDeafened ? '🔊' : '🔇'
    })
  }

  // Socket event handlers
  useEffect(() => {
    if (!socket || !isConnected) return

    const handleWebRTCOffer = async (data: { from: string, offer: RTCSessionDescriptionInit }) => {
      try {
        const pc = createPeerConnection(data.from, 'Unknown User')
        
        if (localStream) {
          localStream.getTracks().forEach(track => {
            pc.addTrack(track, localStream)
          })
        }

        await pc.setRemoteDescription(data.offer)
        const answer = await pc.createAnswer()
        await pc.setLocalDescription(answer)

        socket.emit('webrtc-answer', {
          to: data.from,
          answer
        })

        setPeers(prev => new Map(prev).set(data.from, {
          pc,
          userId: data.from,
          userName: 'Unknown User',
          isMuted: false,
          isConnected: false
        }))
      } catch (error) {
        console.error('Error handling WebRTC offer:', error)
      }
    }

    const handleWebRTCAnswer = async (data: { from: string, answer: RTCSessionDescriptionInit }) => {
      try {
        const peer = peersRef.current.get(data.from)
        if (peer) {
          await peer.pc.setRemoteDescription(data.answer)
        }
      } catch (error) {
        console.error('Error handling WebRTC answer:', error)
      }
    }

    const handleWebRTCIceCandidate = async (data: { from: string, candidate: RTCIceCandidateInit }) => {
      try {
        const peer = peersRef.current.get(data.from)
        if (peer) {
          await peer.pc.addIceCandidate(data.candidate)
        }
      } catch (error) {
        console.error('Error handling ICE candidate:', error)
      }
    }

    socket.on('webrtc-offer', handleWebRTCOffer)
    socket.on('webrtc-answer', handleWebRTCAnswer)
    socket.on('webrtc-ice-candidate', handleWebRTCIceCandidate)

    return () => {
      socket.off('webrtc-offer', handleWebRTCOffer)
      socket.off('webrtc-answer', handleWebRTCAnswer)
      socket.off('webrtc-ice-candidate', handleWebRTCIceCandidate)
    }
  }, [socket, isConnected, localStream, createPeerConnection])

  // Initialize offer to new users
  const createOffer = async (userId: string, userName: string) => {
    if (!localStream || !socket) return

    try {
      const pc = createPeerConnection(userId, userName)
      
      localStream.getTracks().forEach(track => {
        pc.addTrack(track, localStream)
      })

      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)

      socket.emit('webrtc-offer', {
        projectId,
        to: userId,
        offer
      })

      setPeers(prev => new Map(prev).set(userId, {
        pc,
        userId,
        userName,
        isMuted: false,
        isConnected: false
      }))
    } catch (error) {
      console.error('Error creating offer:', error)
    }
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnectVoiceChat()
    }
  }, [])

  const handleJoinVoiceChat = async () => {
    await initializeVoiceChat()
    if (localStream) {
      // Create offer to all existing peers
      peers.forEach(async (peer) => {
        await createOffer(peer.userId, peer.userName)
      })
    }
  }

  const handleLeaveVoiceChat = () => {
    disconnectVoiceChat()
  }

  return (
    <div className="fixed bottom-4 right-4 w-80 bg-editor-sidebar rounded-lg border border-editor-border shadow-lg z-50">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-editor-border">
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          <h3 className="text-sm font-semibold text-white">Voice Chat</h3>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Content */}
      <div className="p-4">
        {!isConnected ? (
          <div className="text-center">
            <div className="flex justify-center mb-3">
              <Users className="h-12 w-12 text-gray-400" />
            </div>
            <p className="text-gray-300 text-sm mb-4">
              Join voice chat to talk with your team members
            </p>
            <button
              onClick={handleJoinVoiceChat}
              disabled={isInitializing}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:cursor-not-allowed"
            >
              {isInitializing ? 'Connecting...' : 'Join Voice Chat'}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Local Controls */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-300">You</span>
                <div className={`w-2 h-2 rounded-full ${isMuted ? 'bg-red-500' : 'bg-green-500'}`} />
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className={`p-2 rounded transition-colors ${
                    isMuted ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-600 hover:bg-gray-700'
                  }`}
                >
                  {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </button>
                <button
                  onClick={() => setIsDeafened(!isDeafened)}
                  className={`p-2 rounded transition-colors ${
                    isDeafened ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-600 hover:bg-gray-700'
                  }`}
                >
                  {isDeafened ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Connected Peers */}
            {peers.size > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-300 mb-2">Connected Users</h4>
                <div className="space-y-2">
                  {Array.from(peers.values()).map((peer) => (
                    <div key={peer.userId} className="flex items-center justify-between p-2 bg-editor-bg rounded">
                      <span className="text-sm text-gray-300">{peer.userName}</span>
                      <div className="flex items-center space-x-2">
                        <div className={`w-2 h-2 rounded-full ${peer.isConnected ? 'bg-green-500' : 'bg-gray-500'}`} />
                        <span className={`text-xs ${peer.isMuted ? 'text-red-400' : 'text-green-400'}`}>
                          {peer.isMuted ? 'Muted' : 'Active'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Disconnect Button */}
            <button
              onClick={handleLeaveVoiceChat}
              className="w-full bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              Leave Voice Chat
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
