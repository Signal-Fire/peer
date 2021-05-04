# Signal Fire Peer

Wrapper for the native `RTCPeerConnection` to make life a little easier.

## Install

```
> npm i @signal-fire/peer
```

## Example

```typescript
import Peer, {
  SessionDescriptionEvent
  IceCandidateEvent,
  DataChannelEvent
} from '@signal-fire/peer'

// Create a new RTCPeerConnection to wrap
const connection = new RTCPeerConnection()
// Create a new peer from the connection
const peer = new Peer(connection)

peer.addEventListener('description', ({ description }: SessionDescriptionEvent) => {
  // send the description to the remote peer through the signaling server
})

peer.addEventListener('icecandidate', ({ candidate }: ICECandidateEvent) => {
  if (candidate) {
    // send the ICE candidate to the remote peer through the signaling server
  }
})

// When we get a session description from the remote peer...
await peer.setSessionDescription(description)

// When we get an ICE candidate from the remote peer...
await peer.addIceCandidate(candidate)
```

## License

Copyright 2021 Michiel van der Velde.

This software is licensed under [the MIT License](LICENSE).
