(() => {
  const instanceOf = (x, y) => {
    try {
      return x instanceof y;
    } catch {
      return false;
    }
  };
  if (instanceOf(self, self.SharedWorkerGlobalScope)) {
    (() => {
      const store = new Map();
      onconnect = (event) => {
        const port = [...event.ports].shift();
        (port ?? {}).onmessage = (e) => {
          const { requestId, type, key, value } = e.data;
          const respond = {
            SET: () => port.postMessage({
              requestId, type: 'SET_RESULT',
              success: store.set(key, value)
            }),
            GET: () => port.postMessage({
              requestId,
              type: 'GET_RESULT',
              key,
              value: store.get(key)
            }),
            DELETE: () => port.postMessage({
              requestId,
              type: 'DELETE_RESULT',
              key,
              value: store.delete(key)
            })
          };
          respond[type]();
        };
      };
    })();
  } else {
    (() => {
      const sharedWorker = new SharedWorker(document.currentScript.src);
      sharedWorker.port.start();
      class SharedWorkerStorage {
        constructor(port) {
          this.port = port;
          this.pendingRequests = new Map();
          this.port.onmessage = (e) => this.onMessage(e);
        }
        onMessage(e) {
          const { requestId, type, key, value, success } = e.data;
          this.pendingRequests.get(requestId)?.({ type, key, value, success });
          this.pendingRequests.delete(requestId);
        }
        generateId() {
          return crypto.randomUUID?.() || Math.random().toString(36).slice(2);
        }
        setItem(key, value) {
          return new Promise((resolve) => {
            const requestId = this.generateId();
            this.pendingRequests.set(requestId, resolve);
            this.port.postMessage({ requestId, type: 'SET', key, value });
          });
        }
        getItem(key) {
          return new Promise((resolve) => {
            const requestId = this.generateId();
            this.pendingRequests.set(requestId, (msg) => resolve(msg.value));
            this.port.postMessage({ requestId, type: 'GET', key });
          });
        }
        removeItem(key) {
          return new Promise((resolve) => {
            const requestId = this.generateId();
            this.pendingRequests.set(requestId, (msg) => resolve(msg.value));
            this.port.postMessage({ requestId, type: 'DELETE', key });
          });
        }
      }
      self.sharedWorkerStorage = new SharedWorkerStorage(sharedWorker.port);
    })();
  }
})();

(async () => {
  try {
    console.log(sharedWorkerStorage);
    // Example usage
    await sharedWorkerStorage.setItem('favoriteColor', 'blue');
    const color = await sharedWorkerStorage.getItem('favoriteColor');
    console.log('color', color); // "blue"
  } catch (e) {
    console.log(self, e);
  }
})();