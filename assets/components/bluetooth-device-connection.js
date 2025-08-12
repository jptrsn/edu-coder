import { IndexedDbMixin } from "/components/indexed-db-mixin.js";

// assets/components/bluetooth-device-connection.js
class BluetoothDeviceConnection extends IndexedDbMixin {

  static BLE_SERVICES = {
      "00001800-0000-1000-8000-00805f9b34fb": "Generic Access",
      "00001801-0000-1000-8000-00805f9b34fb": "Generic Attribute",
      "0000180a-0000-1000-8000-00805f9b34fb": "Device Information",
      "0000180f-0000-1000-8000-00805f9b34fb": "Battery Service",
      '00010203-0405-0607-0809-0A0B0C0D1912': "OTA Service",
      "1011123E-8535-B5A0-7140-A304D2495CB7": "Session Preset?"
      // add more as needed
    };

    // static BLE_CHARACTERISTICS = {
    //   "00002a00-0000-1000-8000-00805f9b34fb": "Device Name",
    //   "00002a01-0000-1000-8000-00805f9b34fb": "Appearance",
    //   "00002a04-0000-1000-8000-00805f9b34fb": "Peripheral Preferred Connection Parameters",
    //   "00002a19-0000-1000-8000-00805f9b34fb": "Battery Level",
    //   "00002a29-0000-1000-8000-00805f9b34fb": "Manufacturer Name",
    //   "00010203-0405-0607-0809-0A0B0C0D2B12": "OTA Write Characteristic",
    //   "1011123E-8535-B5A0-7140-A304D2495CB8": "Session preset read?",
    //   "1011123E-8535-B5A0-7140-A304D2495CB9": "Session preset write?",
    //   "00002a24-0000-1000-8000-00805f9b34fb": "Model Number",
    //   "00002a25-0000-1000-8000-00805f9b34fb": "Serial Number",
    //   "00002a27-0000-1000-8000-00805f9b34fb": "Hardware Revision",
    //   "00002a28-0000-1000-8000-00805f9b34fb": "Software Revision",
    //   "00002a50-0000-1000-8000-00805f9b34fb": "PnP ID"
    //   // add more as needed
    // };

    // static BLE_CHAR_FORMATTERS = {
    //   "00002a24-0000-1000-8000-00805f9b34fb": this.formatBufferToText,
    //   "00002a27-0000-1000-8000-00805f9b34fb": this.formatBufferToText,
    //   "00002a28-0000-1000-8000-00805f9b34fb": this.formatBufferToText,
    //   "00002a25-0000-1000-8000-00805f9b34fb": this.formatBufferToText,
    //   "00002a29-0000-1000-8000-00805f9b34fb": this.formatBufferToText,
    //   "00002a50-0000-1000-8000-00805f9b34fb": this.parsePnPId,
    // }

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.shadowRoot.innerHTML = `
      <style>
        label {
          display: block;
          margin: 0.3rem 0;
          cursor: pointer;
          user-select: none;
        }
        input[type="text"] {
          width: 100%;
          margin-bottom: 1rem;
          font-family: monospace;
          padding: 0.3rem;
          box-sizing: border-box;
        }
        button {
          padding: 0.5rem 1rem;
          font-size: 1rem;
          cursor: pointer;
          margin-top: 0.5rem;
        }
        #info {
          margin-top: 1rem;
          font-family: monospace;
          white-space: pre-wrap;
        }
      </style>

      <div id="servicesCheckboxesContainer">
        <label><input type="checkbox" value="0000180f-0000-1000-8000-00805f9b34fb" checked /> Battery Service (0x180F)</label>
        <label><input type="checkbox" value="0000180a-0000-1000-8000-00805f9b34fb" checked /> Device Information (0x180A)</label>
        <label><input type="checkbox" value="00001801-0000-1000-8000-00805f9b34fb" /> Generic Attribute (0x1801)</label>
        <label><input type="checkbox" value="00001800-0000-1000-8000-00805f9b34fb" /> Generic Access (0x1800)</label>
        <!-- Add more services here -->
      </div>

      <label for="customUUID">Add custom service UUID (optional):</label>
      <input type="text" id="customUUID" placeholder="e.g. 1011123e-8535-b5a0-7140-a304d2495cb7" />

      <button id="connectBtn">Connect to Bluetooth Device</button>
      <button id="disconnectBtn" disabled>Disconnect</button>

      <div id="info"></div>
    `;
  }

  connectedCallback() {
    this.renderServiceCheckboxes();
    this.connectBtn = this.shadowRoot.querySelector("#connectBtn");
    this.disconnectBtn = this.shadowRoot.querySelector("#disconnectBtn");
    this.infoDiv = this.shadowRoot.querySelector("#info");

    this.connectBtn.addEventListener("click", () => this.connectDevice());
    this.disconnectBtn.addEventListener("click", () => this.disconnectDevice());
  }


async connectDevice() {
    try {
      // Get selected service UUIDs from checkboxes
      const checkboxes = this.shadowRoot.querySelectorAll("#servicesCheckboxesContainer input[type=checkbox]:checked");
      const customUUIDInput = this.shadowRoot.querySelector("#customUUID");

      const selectedUUIDs = Array.from(checkboxes).map(cb => cb.value);
      const customUUID = customUUIDInput.value.trim();
      if (customUUID) selectedUUIDs.push(customUUID);

      // Request device with optional services
      this.device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: selectedUUIDs,
      });

      await this.device.gatt.connect();

      // Save or update device info in IndexedDB
      console.log('save device', this.device, selectedUUIDs)
      await this.saveOrUpdateDeviceRecord(this.device.id, selectedUUIDs);

      // Update UI with device info
      this.renderDeviceInfo();

      // Fetch and show services (existing code)
      this.renderServices();

      // Disable connect button, enable disconnect button (update UI accordingly)
      this.updateButtons(true);

    } catch (err) {
      console.error("Bluetooth connection failed:", err);
      this.shadowRoot.querySelector("#info").textContent = "Connection failed: " + err;
    }
  }

  renderDeviceInfo() {
    const infoContainer = this.shadowRoot.querySelector("#info");
    infoContainer.innerHTML = `
      <div class="device-info">
        <div><span class="label">Name:</span> ${this.device.name || "Unnamed Device"}</div>
        <div><span class="label">ID:</span> ${this.device.id}</div>
        <div><span class="label">GATT Connected:</span> ${this.device.gatt.connected ? "Yes" : "No"}</div>
      </div>
      <div id="services-container"></div>
    `;
  }

  async renderServices() {
    const servicesContainer = this.shadowRoot.querySelector("#services-container");
    const services = await this.device.gatt.getPrimaryServices();
    servicesContainer.innerHTML = ""; // clear old

    services.forEach(service => {
      const serviceElem = document.createElement("ble-service-info");
      serviceElem.serviceObject = service;
      servicesContainer.appendChild(serviceElem);
    });
  }

  updateButtons(connected) {
    const connectBtn = this.shadowRoot.querySelector("#connectBtn");
    const disconnectBtn = this.shadowRoot.querySelector("#disconnectBtn");
    if (connectBtn && disconnectBtn) {
      connectBtn.disabled = connected;
      disconnectBtn.disabled = !connected;
    }
  }

  disconnectDevice() {
    if (!this.device) return;
    if (this.device.gatt.connected) {
      this.device.gatt.disconnect();
    }
    this._onDisconnected();
  }

  renderServiceCheckboxes() {
    const container = this.shadowRoot.querySelector("#servicesCheckboxesContainer");
    container.innerHTML = ""; // Clear existing content

    const services = this.constructor.BLE_SERVICES;
    for (const [uuid, label] of Object.entries(services)) {
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.value = uuid.toLowerCase();
      checkbox.id = `chk-${uuid}`;
      checkbox.checked = true;

      // Append checkbox
      container.appendChild(checkbox);

      // Append text node with a space before label
      container.appendChild(document.createTextNode(" " + label));

      // Add a line break after each checkbox + label
      container.appendChild(document.createElement("br"));
    }
  }



  _onDisconnected() {
    this.infoDiv.textContent = "Device disconnected.";
    this.updateButtons(false);
    this.device = null;
  }

}

customElements.define("bluetooth-device-connection", BluetoothDeviceConnection);
