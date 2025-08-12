export class IndexedDbMixin extends HTMLElement {
  constructor() {
    super();
    this.dbName = "BluetoothDevicesDB";
    this.storeName = "devices";
  }

  openDb() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, { keyPath: "deviceId" });
        }
      };

      request.onsuccess = (event) => resolve(event.target.result);
      request.onerror = (event) => reject(event.target.error);
    });
  }

  async saveOrUpdateDeviceRecord(deviceId, services) {
    const db = await this.openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.storeName, "readwrite");
      const store = tx.objectStore(this.storeName);

      const getRequest = store.get(deviceId);
      getRequest.onsuccess = () => {
        const existing = getRequest.result;
        const record = {
          deviceId,
          services,
          lastConnected: new Date().toISOString(),
        };
        if (existing) {
          store.put({ ...existing, ...record });
        } else {
          store.add(record);
        }
      };

      tx.oncomplete = () => resolve();
      tx.onerror = (event) => reject(event.target.error);
    });
  }

  // Add more reusable methods if needed, e.g., fetchDeviceRecord(), deleteDeviceRecord(), etc.
}
