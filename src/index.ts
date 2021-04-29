export type OfferEvent = CustomEvent<RTCSessionDescription>
export type AnswerEvent = CustomEvent<RTCSessionDescription>
export type ICECandidateEvent = RTCPeerConnectionIceEvent
export type DataChannelEvent = RTCDataChannelEvent
export type TrackEvent = RTCTrackEvent

export default class Peer extends EventTarget {
  public readonly connection: RTCPeerConnection
  private readonly dataChannels: Map<number, RTCDataChannel> = new Map()

  public constructor (connection: RTCPeerConnection) {
    super()
    this.connection = connection

    this.handleNegotiationNeeded = this.handleNegotiationNeeded.bind(this)
    this.handleICECandidate = this.handleICECandidate.bind(this)
    this.handleICEConnectionStateChange = this.handleICEConnectionStateChange.bind(this)
    this.handleDataChannel = this.handleDataChannel.bind(this)
    this.handleTrack = this.handleTrack.bind(this)

    connection.addEventListener('negotiationneeded', this.handleNegotiationNeeded)
    connection.addEventListener('icecandidate', this.handleICECandidate)
    connection.addEventListener('iceconnectionstatechange', this.handleICEConnectionStateChange)
    connection.addEventListener('datachannel', this.handleDataChannel)
    connection.addEventListener('track', this.handleTrack)
  }

  /** Create a new data channel. */
  public createDataChannel (label: string, dataChannelDict?: RTCDataChannelInit): RTCDataChannel {
    const channel = this.connection.createDataChannel(label, dataChannelDict)

    const removeListeners = () => {
      channel.removeEventListener('open', handleOpen)
      channel.removeEventListener('error', handleErrorOrClose)
      channel.removeEventListener('close', handleErrorOrClose)
    }

    const handleOpen = () => {
      removeListeners()

      if (channel.id) {
        this.dataChannels.set(channel.id, channel)
      }
    }

    const handleErrorOrClose = () => {
      removeListeners()

      if (channel.id) {
        this.dataChannels.delete(channel.id)
      }
    }

    channel.addEventListener('open', handleOpen)
    channel.addEventListener('error', handleErrorOrClose)
    channel.addEventListener('close', handleErrorOrClose)

    return channel
  }

  /** Add a track to the peer connection. */
  public addTrack (track: MediaStreamTrack, ...streams: MediaStream[]) {
    this.connection.addTrack(track, ...streams)
  }

  /**
   * Handle an incoming offer.
   * @param offer The session description representing the offer
   */
  public async handleIncomingOffer (offer: RTCSessionDescription): Promise<void> {
    await this.connection.setRemoteDescription(offer)
    const answer = await this.connection.createAnswer()
    await this.connection.setLocalDescription(answer)

    this.dispatchEvent(new CustomEvent<RTCSessionDescription>('answer', {
      detail: this.connection.localDescription as RTCSessionDescription
    }))
  }

  /**
   * Handle an incoming answer.
   * @param answer The session description representing the answer
   */
  public async handleIncomingAnswer (answer: RTCSessionDescription): Promise<void> {
    return this.connection.setRemoteDescription(answer)
  }

  /**
   * Handle an incoming ICE candidate.
   * @param candidate The ICE candidate
   */
  public async handleIncomingICECandidate (candidate: RTCIceCandidate): Promise<void> {
    return this.connection.addIceCandidate(candidate)
  }

  private async handleNegotiationNeeded (): Promise<void> {
    const offer = await this.connection.createOffer()
    await this.connection.setLocalDescription(offer)

    this.dispatchEvent(new CustomEvent<RTCSessionDescription>('offer', {
      detail: this.connection.localDescription as RTCSessionDescription
    }))
  }

  private async handleICECandidate (ev: RTCPeerConnectionIceEvent): Promise<void> {
    if (!ev.candidate) {
      // ICE gathering has ended
      return
    }

    this.dispatchEvent(ev)
  }

  private handleICEConnectionStateChange (): void {
    switch (this.connection.iceConnectionState) {
      case 'failed':
      case 'closed':
        this.handleClose()
        break
    }
  }

  private handleDataChannel (ev: RTCDataChannelEvent) {
    this.dataChannels.set(ev.channel.id, ev.channel)

    ev.channel.addEventListener('close', () => {
      this.dataChannels.delete(ev.channel.id)
    }, { once: true })

    this.dispatchEvent(ev)
  }

  private handleTrack (ev: RTCTrackEvent) {
    this.dispatchEvent(ev)
  }

  private handleClose (): void {
    this.connection.removeEventListener('negotiationneeded', this.handleNegotiationNeeded)
    this.connection.removeEventListener('icecandidate', this.handleICECandidate)
    this.connection.removeEventListener('iceconnectionstatechange', this.handleICEConnectionStateChange)
    this.connection.removeEventListener('datachannel', this.handleDataChannel)
    this.connection.removeEventListener('track', this.handleTrack)

    this.dispatchEvent(new Event('close'))
  }
}
