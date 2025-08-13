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

  return (
    <div className="fixed bottom-4 right-4 bg-editor-sidebar border border-editor-border rounded-lg shadow-lg w-80 max-h-96 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-editor-border">
        <div className="flex items-center justify-between">
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
      </div>

      {/* Content */}
      <div className="flex-1 p-4">
        {!isConnected ? (
          <div className="text-center">
            <Users className="h-8 w-8 text-gray-400 mx-auto mb-3" />
            <p className="text-sm text-gray-300 mb-4">
              Join voice chat to talk with your team
            </p>
            <button
              onClick={initializeVoiceChat}
              disabled={isInitializing}
              className="w-full bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
            >
              {isInitializing ? 'Connecting...' : 'Join Voice Chat'}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Current User */}
            <div className="flex items-center space-x-3 p-2 bg-editor-tab rounded-lg">
              <img
                src={currentUser.avatar || `https://ui-avatars.com/api/?name=${currentUser.name}&background=3b82f6&color=fff`}
                alt={currentUser.name}
                className="h-8 w-8 rounded-full"
              />
              <div className="flex-1">
                <p className="text-sm font-medium text-white">{currentUser.name} (You)</p>
                <p className="text-xs text-gray-400">
                  {isMuted ? 'Muted' : 'Speaking'}
                </p>
              </div>
              <div className={`w-2 h-2 rounded-full ${isMuted ? 'bg-red-500' : 'bg-green-500'}`} />
            </div>

            {/* Connected Peers */}
            {Array.from(peers.values()).map(peer => (
              <div key={peer.userId} className="flex items-center space-x-3 p-2 bg-editor-tab rounded-lg">
                <div className="h-8 w-8 bg-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-xs text-white font-medium">
                    {peer.userName.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-white">{peer.userName}</p>
                  <p className="text-xs text-gray-400">
                    {peer.isConnected ? 'Connected' : 'Connecting...'}
                  </p>
                </div>
                <div className={`w-2 h-2 rounded-full ${peer.isConnected ? 'bg-green-500' : 'bg-yellow-500'}`} />
              </div>
            ))}

            {peers.size === 0 && (
              <div className="text-center py-4">
                <p className="text-sm text-gray-400">No other users in voice chat</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Controls */}
      {isConnected && (
        <div className="p-4 border-t border-editor-border">
          <div className="flex items-center justify-center space-x-2">
            <button
              onClick={toggleMute}
              className={`p-2 rounded-lg transition-colors ${
                isMuted ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-600 hover:bg-gray-700'
              }`}
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <MicOff className="h-4 w-4 text-white" /> : <Mic className="h-4 w-4 text-white" />}
            </button>

            <button
              onClick={toggleDeafen}
              className={`p-2 rounded-lg transition-colors ${
                isDeafened ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-600 hover:bg-gray-700'
              }`}
              title={isDeafened ? 'Enable Audio' : 'Disable Audio'}
            >
              {isDeafened ? <VolumeX className="h-4 w-4 text-white" /> : <Volume2 className="h-4 w-4 text-white" />}
            </button>

            <button
              onClick={disconnectVoiceChat}
              className="p-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
              title="Leave Voice Chat"
            >
              <PhoneOff className="h-4 w-4 text-white" />
            </button>
          </div>
        </div>
      )}

      {/* Hidden audio element for local stream */}
      <audio ref={localAudioRef} autoPlay muted />
    </div>
  )
}
