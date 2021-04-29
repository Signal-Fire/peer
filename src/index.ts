export type OfferEvent = CustomEvent<RTCSessionDescription>
export type AnswerEvent = CustomEvent<RTCSessionDescription>
export type ICECandidateEvent = CustomEvent<RTCIceCandidate>
export type DataChannelEvent = CustomEvent<RTCDataChannel>

export default class Peer extends EventTarget {
  public readonly id: string
  public readonly connection: RTCPeerConnection
  private readonly dataChannels: Map<number, RTCDataChannel> = new Map()

  public constructor (id: string, connection: RTCPeerConnection) {
    super()
    this.id = id
    this.connection = connection

    this.handleNegotiationNeeded = this.handleNegotiationNeeded.bind(this)
    this.handleICECandidate = this.handleICECandidate.bind(this)
    this.handleICEConnectionStateChange = this.handleICEConnectionStateChange.bind(this)
    this.handleDataChannel = this.handleDataChannel.bind(this)

    connection.addEventListener('negotiationneeded', this.handleNegotiationNeeded)
    connection.addEventListener('icecandidate', this.handleICECandidate)
    connection.addEventListener('iceconnectionstatechange', this.handleICEConnectionStateChange)
    connection.addEventListener('datachannel', this.handleDataChannel)
  }

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

  public async handleIncomingOffer (offer: RTCSessionDescription): Promise<void> {
    try {
      await this.connection.setRemoteDescription(offer)
      const answer = await this.connection.createAnswer()
      await this.connection.setLocalDescription(answer)

      this.dispatchEvent(new CustomEvent<RTCSessionDescription>('answer', {
        detail: this.connection.localDescription as RTCSessionDescription
      }))
    } catch (e) {
      this.dispatchEvent(new CustomEvent<Error>('error', {
        detail: e
      }))
    }
  }

  public async handleIncomingAnswer (answer: RTCSessionDescription): Promise<void> {
    try {
      await this.connection.setRemoteDescription(answer)
    } catch (e) {
      this.dispatchEvent(new CustomEvent<Error>('error', {
        detail: e
      }))
    }
  }

  public async handleIncomingICECandidate (candidate: RTCIceCandidate): Promise<void> {
    try {
      await this.connection.addIceCandidate(candidate)
    } catch (e) {
      this.dispatchEvent(new CustomEvent<Error>('error', {
        detail: e
      }))
    }
  }

  private async handleNegotiationNeeded (): Promise<void> {
    try {
      const offer = await this.connection.createOffer()
      this.connection.setLocalDescription(offer)
      this.dispatchEvent(new CustomEvent<RTCSessionDescription>('offer', {
        detail: this.connection.localDescription as RTCSessionDescription
      }))
    } catch (e) {
      this.dispatchEvent(new CustomEvent<Error>('error', {
        detail: e
      }))
    }
  }

  private async handleICECandidate ({ candidate }: RTCPeerConnectionIceEvent): Promise<void> {
    if (!candidate) {
      // ICE gathering has ended
      return
    }

    this.dispatchEvent(new CustomEvent<RTCIceCandidate>('ice', {
      detail: candidate
    }))
  }

  private handleICEConnectionStateChange (): void {
    switch (this.connection.iceConnectionState) {
      case 'failed':
      case 'closed':
        this.handleClose()
        break
    }
  }

  private handleDataChannel ({ channel }: RTCDataChannelEvent) {
    this.dataChannels.set(channel.id, channel)

    channel.addEventListener('close', () => {
      this.dataChannels.delete(channel.id)
    }, { once: true })

    this.dispatchEvent(new CustomEvent<RTCDataChannel>('data-channel', {
      detail: channel
    }))
  }

  private handleClose (): void {
    this.connection.removeEventListener('negotiationneeded', this.handleNegotiationNeeded)
    this.connection.removeEventListener('icecandidate', this.handleICECandidate)
    this.connection.removeEventListener('iceconnectionstatechange', this.handleICEConnectionStateChange)
    this.connection.removeEventListener('datachannel', this.handleDataChannel)

    this.dispatchEvent(new Event('close'))
  }
}
