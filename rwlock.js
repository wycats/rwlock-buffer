const BUFFERS = new WeakMap();

function bufferState(size) {
  return {
    shared: new SharedArrayBuffer(size),
    read: new Set(),
    write: null,
    transferred: false
  };
}

export class LockedBuffer {
  constructor(size) {
    BUFFERS.set(this, bufferState(size));
  }

  get transferred() {
    return BUFFERS.get(this).transferred;
  }

  /**
   * Acquire a read-lock
   */
  read() {
    let state = BUFFERS.get(this);

    assert(
      state.write === null && state.transferred === false,
      "Can only acquire a read like if a write-lock is not outstanding and the buffer wasn't transferred"
    );

    if (state.write === null && state.transferred === false) {
      let readView = view(state.shared);
      state.read.add(readView);

      return readView;
    }
  }

  /**
   * Acquire a write-lock
   */
  write() {
    let state = BUFFERS.get(this);

    assert(
      state.write === null &&
        state.transferred === false &&
        state.read.size === 0,
      "Can only acquire a write lock if no read-locks are outstanding and the buffer wasn't transferred"
    );

    state.write = view(state.shared);
    return state.write;
  }

  /**
   * Return the buffer you were given.
   *
   * @param {ArrayBuffer} buffer The buffer you were given in reed() or write()
   */
  unlock(buffer) {
    let state = BUFFERS.get(this);

    if (state.write) {
      assert(
        state.write === buffer,
        "Must unlock a write-lock with the same buffer"
      );

      buffer.transfer();
      state.write = null;
    } else if (state.read.size > 0) {
      assert(
        state.read.has(buffer),
        "Must unlock a read-lock with the same buffer"
      );
      buffer.transfer;
      state.read.delete(buffer);
    } else if (state.transfer) {
      throw new Error("Can't unlock an already-transferred locked buffer");
    }
  }

  transfer() {
    let state = BUFFERS.get(this);

    assert(
      state.write === null &&
        state.transferred === false &&
        state.read.size === 0,
      "Can only transfer a buffer with no outstanding locks"
    );

    state.transferred = true;
    state.shared = null;
  }
}

const SHARED_MAP = new WeakMap();

export class SharedView {
  constructor(buffer) {
    SHARED_MAP.set(this, buffer);
  }

  get byteLength() {
    return SHARED_MAP.get(this).byteLength;
  }

  isView() {
    return false;
  }

  get(index) {
    return SHARED_MAP.get(this)[index];
  }

  transfer() {
    SHARED_MAP.set(this, null);
  }
}

function view(shared) {
  return new SharedView(shared);
}

function assert(value, message) {
  if (!value) {
    throw new Error(`Assertion Error: ${message}`);
  }
}

const mc = new MessageChannel();

ArrayBuffer.prototype.transfer = function() {
  const result = this.slice();
  mc.port1.postMessage(this, [this]);
  return result;
};
