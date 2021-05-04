export {
  SessionDescriptionEvent,
  IceCandidateEvent,
  DataChannelEvent,
  TrackEvent
} from './events'

import {
  SessionDescriptionEvent
} from './events'

export default class Peer extends EventTarget {
  public readonly connection: RTCPeerConnection
  private readonly dataChannels: Map<number, RTCDataChannel> = new Map()

  public constructor (connection: RTCPeerConnection) {
    super()
    this.connection = connection

    this.handleNegotiationNeeded = this.handleNegotiationNeeded.bind(this)
    this.handleIceCandidate = this.handleIceCandidate.bind(this)
    this.handleIceConnectionStateChange = this.handleIceConnectionStateChange.bind(this)
    this.handleDataChannel = this.handleDataChannel.bind(this)
    this.handleTrack = this.handleTrack.bind(this)

    connection.addEventListener('negotiationneeded', this.handleNegotiationNeeded)
    connection.addEventListener('icecandidate', this.handleIceCandidate)
    connection.addEventListener('iceconnectionstatechange', this.handleIceConnectionStateChange)
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

        channel.addEventListener('close', () => {
          this.dataChannels.delete(channel.id as number)
        }, { once: true })
      }
    }

    const handleErrorOrClose = () => {
      removeListeners()

      if (channel.id) {
        this.dataChannels.delete(channel.id)
      }
    }

    if (channel.readyState === 'open') {
      handleOpen()
    } else {
      channel.addEventListener('open', handleOpen)
      channel.addEventListener('error', handleErrorOrClose)
      channel.addEventListener('close', handleErrorOrClose)
    }

    return channel
  }

  /** Add a track to the peer connection. */
  public addTrack (track: MediaStreamTrack, ...streams: MediaStream[]) {
    this.connection.addTrack(track, ...streams)
  }

  public close (): void {
    this.connection.close()
  }

  /**
   * Set a session description.
   * @param description The session description
   */
  public async setSessionDescription (description: RTCSessionDescription): Promise<void> {
    if (![ 'offer', 'answer' ].includes(description.type)) {
      throw new Error(`unsupported description type: ${description.type}`)
    }

    if (description.type === 'offer') {
      return this.handleOffer(description)
    } else if (description.type === 'answer') {
      return this.handleAnswer(description)
    }
  }

  /**
   * Add an ICE candidate.
   * @param candidate The ICE candidate
   */
  public async addIceCandidate (candidate: RTCIceCandidate): Promise<void> {
    return this.connection.addIceCandidate(candidate)
  }

  private async handleOffer (offer: RTCSessionDescription): Promise<void> {
    await this.connection.setRemoteDescription(offer)
    const answer = await this.connection.createAnswer()
    await this.connection.setLocalDescription(answer)

    this.dispatchEvent(
      new SessionDescriptionEvent(this.connection.localDescription as RTCSessionDescription)
    )
  }

  private async handleAnswer (answer: RTCSessionDescription): Promise<void> {
    return this.connection.setRemoteDescription(answer)
  }

  private async handleNegotiationNeeded (): Promise<void> {
    const offer = await this.connection.createOffer()
    await this.connection.setLocalDescription(offer)

    this.dispatchEvent(
      new SessionDescriptionEvent(this.connection.localDescription as RTCSessionDescription)
    )
  }

  private async handleIceCandidate (ev: RTCPeerConnectionIceEvent): Promise<void> {
    this.dispatchEvent(ev)
  }

  private handleIceConnectionStateChange (): void {
    switch (this.connection.iceConnectionState) {
      case 'failed':
      case 'closed':
        this.handleClose()
        break
    }
  }

  private handleDataChannel (ev: RTCDataChannelEvent) {
    this.dataChannels.set(ev.channel.id as number, ev.channel)

    ev.channel.addEventListener('close', () => {
      this.dataChannels.delete(ev.channel.id as number)
    }, { once: true })

    this.dispatchEvent(ev)
  }

  private handleTrack (ev: RTCTrackEvent) {
    this.dispatchEvent(ev)
  }

  private handleClose (): void {
    this.connection.removeEventListener('negotiationneeded', this.handleNegotiationNeeded)
    this.connection.removeEventListener('icecandidate', this.handleIceCandidate)
    this.connection.removeEventListener('iceconnectionstatechange', this.handleIceConnectionStateChange)
    this.connection.removeEventListener('datachannel', this.handleDataChannel)
    this.connection.removeEventListener('track', this.handleTrack)

    this.dispatchEvent(new Event('close'))
  }
}
