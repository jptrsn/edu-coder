import { IndexedDbMixin } from "/components/indexed-db-mixin.js";

// assets/components/ble-service-info.js
class BleServiceInfo extends IndexedDbMixin {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.shadowRoot.innerHTML = `
      <style>
        .service {
          border: 1px solid #ccc;
          padding: 0.8rem;
          margin-bottom: 1rem;
          border-radius: 6px;
          background: #f3f3f3;
        }
        .service-header {
          font-weight: bold;
          margin-bottom: 0.5rem;
        }
        table {
          width: 100%;
          border-collapse: collapse;
        }
        th, td {
          border: 1px solid #999;
          padding: 0.3rem 0.6rem;
          text-align: left;
        }
        th {
          background-color: #ddd;
        }
      </style>
      <div class="service">
        <div class="service-header"></div>
        <table>
          <thead>
            <tr><th>Characteristic UUID</th><th>Properties</th></tr>
          </thead>
          <tbody></tbody>
        </table>
      </div>
    `;

    this.service = null;
  }

  async connectedCallback() {
    if (!this.service) {
      console.warn("No service provided to <ble-service-info>");
      return;
    }
    this.render();
  }

  set serviceObject(service) {
    this.service = service;
    this.render();
  }

  async render() {
    if (!this.service) return;

    const header = this.shadowRoot.querySelector(".service-header");
    const tbody = this.shadowRoot.querySelector("tbody");

    header.textContent = `Service: ${this.service.uuid}`;

    // Clear previous rows
    tbody.innerHTML = "";

    try {
      const characteristics = await this.service.getCharacteristics();

      characteristics.forEach(char => {
        const tr = document.createElement("tr");

        const uuidTd = document.createElement("td");
        uuidTd.textContent = char.uuid;

        const propsTd = document.createElement("td");
        const props = [];
        if (char.properties.read) props.push("read");
        if (char.properties.write) props.push("write");
        if (char.properties.notify) props.push("notify");
        propsTd.textContent = props.join(", ");

        tr.appendChild(uuidTd);
        tr.appendChild(propsTd);
        tbody.appendChild(tr);
      });
    } catch (err) {
      console.error("Error getting characteristics for service", this.service.uuid, err);
      tbody.innerHTML = "<tr><td colspan='2'>Error loading characteristics</td></tr>";
    }
  }
}

customElements.define("ble-service-info", BleServiceInfo);
