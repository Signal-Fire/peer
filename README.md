# Signal Fire Peer

Wrapper for the native `RTCPeerConnection` to make life a little easier.

> This is a work in progress and as such is not published to npm yet.

```typescript
import Peer from './index'
import type { OfferEvent, AnswerEvent, ICECandidateEvent } from './index'

const connection = new RTCPeerConnection()
const peer = new Peer('<id>', connection)

peer.addEventListener('offer', ({ detail }: OfferEvent) => {
  // send the offer to the remote peer through the signaling server
  // for example:
  await socket.send(JSON.stringify({
    cmd: 'offer',
    target: peer.id,
    data: { sdp: detail }
  }))
})

peer.addEventListener('answer', ({ detail }: AnswerEvent) => {
  // send the answer to the remote peer through the signaling server
  // for example:
  await socket.send(JSON.stringify({
    cmd: 'answer',
    target: peer.id,
    data: { sdp: detail }
  }))
})

peer.addEventListener('ice', ({ detail }: ICECandidateEvent) => {
  // send the ICE candidate to the remote peer through the signaling server
  // for example:
  await socket.send(JSON.stringify({
    cmd: 'ice',
    target: peer.id,
    data: { candidate: detail }
  }))
})
```
