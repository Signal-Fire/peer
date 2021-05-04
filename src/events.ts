export class SessionDescriptionEvent extends Event {
  public readonly description: RTCSessionDescription

  public constructor (description: RTCSessionDescription) {
    super('description')
    this.description = description
  }
}

export type IceCandidateEvent = RTCPeerConnectionIceEvent
export type DataChannelEvent = RTCDataChannelEvent
export type TrackEvent = RTCTrackEvent
