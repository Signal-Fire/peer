# Signal Fire Peer

Wrapper for the native `RTCPeerConnection` to make life a little easier.

> This is a work in progress and as such is not published to npm yet.

## Example

```typescript
import Peer from './index'
import type { OfferEvent, AnswerEvent, ICECandidateEvent, DataChannelEvent } from './index'

const connection = new RTCPeerConnection()
const peer = new Peer(connection)

peer.addEventListener('offer', ({ detail: offer }: OfferEvent) => {
  // send the offer to the remote peer through the signaling server
})

peer.addEventListener('answer', ({ detail: answer }: AnswerEvent) => {
  // send the answer to the remote peer through the signaling server
})

peer.addEventListener('icecandidate', ({ candidate }: ICECandidateEvent) => {
  if (candidate) {
    // send the ICE candidate to the remote peer through the signaling server
  }
})

peer.addEventListener('datachannel', ({ channel }: DataChannelEvent) => {
  // do something with the channel
})

// Gotten an offer through the signaling server
await peer.handleIncomingOffer(offer)

// Gotten an answer through the signaling server
await peer.handleIncomingAnswer(answer)

// Gotten an ICE candidate through the signaling server
await peer.handleIncomingICECandidate(candidate)
```

## License

Copyright 2021 Michiel van der Velde.

This software is licensed under [the MIT License](LICENSE).
