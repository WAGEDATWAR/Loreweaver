import assert from "node:assert/strict";
import test from "node:test";
import { createTabGuard } from "../src/tabGuard.js";

function createBus() {
  const channels = [];

  return (name) => {
    const channel = {
      name,
      onmessage: null,
      postMessage(data) {
        for (const other of channels) {
          if (other !== channel && other.name === name && !other.closed) {
            other.onmessage?.({ data: structuredClone(data) });
          }
        }
      },
      close() {
        channel.closed = true;
      },
      closed: false
    };

    channels.push(channel);
    return channel;
  };
}

test("two tabs discover each other once", () => {
  const factory = createBus();
  const seenA = [];
  const seenB = [];
  const a = createTabGuard({ name: "p", channelFactory: factory, id: "a", onPeerPresent: (id) => seenA.push(id) });
  const b = createTabGuard({ name: "p", channelFactory: factory, id: "b", onPeerPresent: (id) => seenB.push(id) });

  b.announce();
  b.announce();

  assert.deepEqual(seenA, ["b"]);
  assert.deepEqual(seenB, ["a"]);
  assert.equal(a.peerCount(), 1);
  assert.equal(b.peerCount(), 1);
});

test("a save in one tab is reported to the other", () => {
  const factory = createBus();
  const saved = [];
  const a = createTabGuard({ name: "p", channelFactory: factory, id: "a" });
  createTabGuard({ name: "p", channelFactory: factory, id: "b", onPeerSaved: (id, at) => saved.push([id, at > 0]) });

  a.notifySaved();

  assert.deepEqual(saved, [["a", true]]);
});

test("a tab ignores its own messages and other projects", () => {
  const factory = createBus();
  const heard = [];
  const a = createTabGuard({ name: "p", channelFactory: factory, id: "a", onPeerSaved: () => heard.push("self") });
  createTabGuard({ name: "other", channelFactory: factory, id: "c", onPeerSaved: () => heard.push("other") });

  a.notifySaved();

  assert.deepEqual(heard, []);
});

test("closing removes the peer", () => {
  const factory = createBus();
  const a = createTabGuard({ name: "p", channelFactory: factory, id: "a" });
  const b = createTabGuard({ name: "p", channelFactory: factory, id: "b" });

  b.announce();
  assert.equal(a.peerCount(), 1);
  b.close();
  assert.equal(a.peerCount(), 0);
});

test("degrades quietly without BroadcastChannel", () => {
  const guard = createTabGuard({ name: "p", channelFactory: null });

  assert.equal(guard.supported, false);
  guard.announce();
  guard.notifySaved();
  guard.close();
  assert.equal(guard.peerCount(), 0);
});
