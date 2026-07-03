const xml2js = require("xml2js");

const parser = new xml2js.Parser({
  explicitArray: false,
  mergeAttrs: true,
  attrkey: "$",
});

const builder = new xml2js.Builder({
  headless: false,
  xmldec: { version: "1.0", encoding: "utf-8" },
});

exports.parseXml = async (xml) => {
  return await parser.parseStringPromise(xml);
};

// Escape XML special characters in any interpolated text so free-text values
// (error messages, titles, authors, etc.) can never produce malformed XML.
const escapeXml = (value) => {
  if (value === undefined || value === null) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
};
exports.escapeXml = escapeXml;

// Build Initial Response for Title/Order
// Matches: "Order initial reponse.xml" / "title setup initial response" samples
exports.buildInitialResponse = (items) => {
  const statuses = items
    .map(
      (item) =>
        `<status ID="${escapeXml(item.id || "1")}" isbn="${escapeXml(item.isbn || "")}" customerref="${escapeXml(item.customerRef || "")}" error="${escapeXml(item.error)}" description="${escapeXml(item.description)}" />`,
    )
    .join("\n");
  return `<?xml version="1.0" encoding="utf-8"?>\n<metadata>\n${statuses}\n</metadata>`;
};

// Build Title Setup Handshake.
//
// SOURCE-OF-TRUTH NOTE: The PDF spec (page 7) shows this as a bare
// <titleStatus> root with no <metadata> wrapper. The provided sample file
// wraps it in <metadata><titleStatus>...</titleStatus></metadata>.
// Per instruction, XML samples > WSDL > PDF, so we wrap in <metadata> by
// default. This is controlled by TITLE_HANDSHAKE_WRAP_METADATA in .env
// ("false" to switch to the bare PDF-style root) so it can be flipped
// without touching business logic if CPI's test endpoint disagrees.
exports.buildTitleHandshake = (creds, isbn, code, description, success) => {
  const dateStr = new Date().toISOString().split("T")[0];
  const inner = `<titleStatus>
  <credentials identity="${escapeXml(creds.identity || "ARE")}" SharedSecret="${escapeXml(creds.secret || "test")}" />
  <statusDate>${dateStr}</statusDate>
  <titleStatusDetail ISBN="${escapeXml(isbn)}">
    <titleStatusInfo>
      <titleStatusCode>${code}</titleStatusCode>
      <description>${escapeXml(description)}</description>
      <success>${success}</success>
    </titleStatusInfo>
  </titleStatusDetail>
</titleStatus>`;

  const wrapInMetadata = process.env.TITLE_HANDSHAKE_WRAP_METADATA !== "false";
  const body = wrapInMetadata ? `<metadata>\n${inner}\n</metadata>` : inner;

  return `<?xml version="1.0" encoding="utf-8"?>\n${body}`;
};

// Build Order Acknowledgment — matches "orderack.xml" sample exactly
exports.buildOrderAck = (creds, order, status = "OK") => {
  const dateStr = new Date().toISOString().split("T")[0];
  const detailsList = Array.isArray(order.details) ? order.details : [];
  const details = detailsList
    .map(
      (item) =>
        `<detail ID="${escapeXml(item.lineId || "1")}" isbn="${escapeXml(item.isbn || "")}" title="${escapeXml(item.title || "")}" Qty="${escapeXml(item.qty || 1)}" Status="${escapeXml(status)}" />`,
    )
    .join("\n");

  return `<?xml version="1.0" encoding="utf-8"?>
<metadata>
<credentials identity="${escapeXml(creds.identity || "ARE")}" sharedSecret="${escapeXml(creds.secret || "test")}" />
<order>
<ack_date>${dateStr}</ack_date>
<companycode>${escapeXml(order.companyCode || "ARE")}</companycode>
<customerref>${escapeXml(order.customerRef || "")}</customerref>
<ack_details>
${details}
</ack_details>
</order>
</metadata>`;
};

// Build ASN (Shipping Notification) — matches "ASN.xml" sample exactly
exports.buildASN = (creds, order, shipment) => {
  const dateStr = shipment.dispatchDate
    ? new Date(shipment.dispatchDate).toISOString().split("T")[0]
    : new Date().toISOString().split("T")[0];
  const detailsList = Array.isArray(order.details) ? order.details : [];
  const notes = detailsList
    .map(
      (item) =>
        `<despatchNote GPorderRef="${escapeXml(shipment.atlasOrderReference || order.atlasOrderReference || "")}" customerref="${escapeXml(order.customerRef || "")}" ID="${escapeXml(item.lineId || "1")}" isbn="${escapeXml(item.isbn || "")}" carrier="${escapeXml(shipment.carrier || "DHL")}" tracking="${escapeXml(shipment.tracking || "")}" bookingref="${escapeXml(shipment.bookingRef || "")}" deliverycost="${escapeXml(shipment.deliveryCost || 0)}" currency="${escapeXml(shipment.currency || "GBP")}" deliveryweight="${escapeXml(shipment.deliveryWeight || 0)}" weightunit="${escapeXml(shipment.weightUnit || "kg")}" date="${dateStr}" />`,
    )
    .join("\n");

  return `<?xml version="1.0" encoding="utf-8"?>
<metadata>
<credentials identity="${escapeXml(creds.identity || "ARE")}" sharedSecret="${escapeXml(creds.secret || "test")}" />
${notes}
</metadata>`;
};
