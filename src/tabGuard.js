export function createTabGuard({ name, channelFactory, id = createTabId(), onPeerPresent = () => {}, onPeerSaved = () => {} }) {
  let channel = null;
  const peers = new Set();

  try {
    channel = channelFactory ? channelFactory(name) : null;
  } catch {
    channel = null;
  }

  function post(message) {
    try {
      channel?.postMessage({ ...message, from: id });
    } catch {
      return;
    }
  }

  if (channel) {
    channel.onmessage = (event) => {
      const message = event?.data;

      if (!message || typeof message !== "object" || message.from === id || typeof message.from !== "string") {
        return;
      }

      if (message.type === "hello") {
        const isNew = !peers.has(message.from);
        peers.add(message.from);
        post({ type: "here" });

        if (isNew) {
          onPeerPresent(message.from);
        }
      } else if (message.type === "here") {
        const isNew = !peers.has(message.from);
        peers.add(message.from);

        if (isNew) {
          onPeerPresent(message.from);
        }
      } else if (message.type === "saved") {
        peers.add(message.from);
        onPeerSaved(message.from, Number(message.at) || 0);
      } else if (message.type === "bye") {
        peers.delete(message.from);
      }
    };
  }

  return {
    id,
    supported: Boolean(channel),
    peerCount: () => peers.size,
    announce: () => post({ type: "hello" }),
    notifySaved: () => post({ type: "saved", at: Date.now() }),
    close() {
      post({ type: "bye" });

      try {
        channel?.close();
      } catch {
        return;
      }
    }
  };
}

export function createTabId() {
  const random = Math.random().toString(36).slice(2, 10);
  return `tab_${Date.now().toString(36)}_${random}`;
}
