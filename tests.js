import { LockedBuffer, SharedView } from "./rwlock.js";

const locked = new LockedBuffer(1024);

let read = locked.read();

debugAssert(
  read instanceof SharedView && read.byteLength === 1024,
  "Read lock should have acquired an ArrayBuffer with 1024 bytes"
);

assertThrows(
  () => {
    locked.write();
  },
  /acquire/,
  "cannot acquire a write lock while the read lock is outstanding"
);

locked.unlock(read);

let write = locked.write();

debugAssert(
  write instanceof SharedView && read.byteLength === 1024,
  "Write lock should have acquired an ArrayBuffer with 1024 bytes"
);

assertThrows(
  () => locked.write(),
  /acquire/,
  "Cannot acquire a second write lock"
);

assertThrows(
  () => locked.read(),
  /acquire/,
  "Cannot acquire a read lock while the write lock was outstanding"
);

assertThrows(
  () => locked.transfer(),
  /transfer/,
  "Cannot transfer a lock with a write lock outstanding"
);

locked.unlock(write);

read = locked.read();
let read2 = locked.read();

debugAssert(
  read instanceof SharedView && read.byteLength === 1024,
  "New read lock should have acquired an ArrayBuffer with 1024 bytes"
);

debugAssert(
  read2 instanceof SharedView && read.byteLength === 1024,
  "Another read lock should have acquired an ArrayBuffer with 1024 bytes"
);

assertThrows(
  () => locked.transfer(),
  /transfer/,
  "Cannot transfer a lock with read locks outstanding"
);

locked.unlock(read);

assertThrows(
  () => locked.write(),
  /acquire/,
  "Cannot acquire a write lock if only one read buffer was unlocked"
);

locked.unlock(read2);

locked.transfer();

debugAssert(locked.transferred, "The buffer should now be transferred");

assertThrows(
  () => locked.read(),
  /acquire/,
  "Cannot acquire a read lock once the buffer is transferred"
);

assertThrows(
  () => locked.write(),
  /acquire/,
  "Cannot acquire a write lock once the buffer is transferred"
);

function debugAssert(value, message) {
  if (!value) {
    console.error(`Assertion Error: ${message}`);
  } else {
    console.info(`%c✔ %c${message}`, "color: #6f6", "color: #060");
  }
}

function assertThrows(callback, regex, message) {
  try {
    callback();
  } catch (e) {
    debugAssert(regex.test(e.message), message);
  }
}
