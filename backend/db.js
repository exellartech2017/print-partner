const mongoose = require("mongoose");

const TitleSchema = new mongoose.Schema(
  {
    identity: String,
    sharedSecret: String,
    sentDate: Date,
    companyCode: String,
    email: String,
    publisherCode: String,
    isbn: {
      type: String,
      unique: true,
      index: true,
    },
    title: String,
    author: String,
    bookType: String,
    sets: [String],
    batchWorkflowTitle: String,
    route: String,
    trimSize: {
      width: Number,
      height: Number,
      unit: String,
    },
    text: {
      pages: Number,
      origin: String,
      source: String,
      paperStock: String,
      halfToneImages: Boolean,
      colorPages: Number,
      pinCode: Boolean,
      pinCoordinates: {
        left: Number,
        bottom: Number,
        unit: String,
      },
      file: {
        url: String,
        size: Number,
        md5: String,
        downloaded: Boolean,
        localPath: String,
      },
    },
    cover: {
      lamination: String,
      origin: String,
      source: String,
      doubleSided: Boolean,
      file: {
        url: String,
        size: Number,
        md5: String,
        downloaded: Boolean,
        localPath: String,
      },
    },
    plate: {
      number: Number,
      colorPages: Number,
      origin: String,
      source: String,
      instructions: String,
      file: {
        url: String,
        size: Number,
        md5: String,
        downloaded: Boolean,
        localPath: String,
      },
    },
    setupStatus: {
      type: String,
      enum: [
        "received",
        "validating",
        "downloading",
        "waiting",
        "ready",
        "live",
        "failed",
      ],
      default: "received",
    },
    handshake: {
      sent: Boolean,
      sentAt: Date,
      code: Number,
      description: String,
      success: Boolean,
    },
    rawXml: String,
  },
  {
    timestamps: true,
  },
);

const OrderSchema = new mongoose.Schema(
  {
    customerRef: {
      type: String,
      unique: true,
      index: true,
    },
    companyCode: String,
    orderFor: String,
    orderSource: String,
    invoiceFile: String,
    shippingMethod: String,
    scheduleTypeId: Number,
    amazonReference: String,
    shippingAccount: String,
    shippingTo: {
      companyName: String,
      attentionTo: String,
      address1: String,
      extendedAddress: String,
      postCode: String,
      city: String,
      state: String,
      county: String,
      countryCode: String,
      phone: String,
      email: String,
    },
    consolidator: {
      companyName: String,
      attentionTo: String,
      address1: String,
      extendedAddress: String,
      postCode: String,
      city: String,
      state: String,
      county: String,
      countryCode: String,
      phone: String,
      email: String,
    },
    details: [
      {
        lineId: String,
        isbn: String,
        title: String,
        qty: Number,
        titleStatus: String,
      },
    ],
    status: {
      type: String,
      enum: [
        "received",
        "waiting_title",
        "released",
        "ack_sent",
        "manufacturing",
        "ready_to_ship",
        "shipped",
        "cancelled",
        "failed",
      ],
      default: "received",
    },
    ackSent: Boolean,
    ackSentAt: Date,
    atlasOrderReference: String,
    rawXml: String,
  },
  {
    timestamps: true,
  },
);

const ShipmentSchema = new mongoose.Schema(
  {
    customerRef: String,
    atlasOrderReference: String,
    carrier: String,
    tracking: String,
    bookingRef: String,
    deliveryCost: Number,
    currency: String,
    deliveryWeight: Number,
    weightUnit: String,
    dispatchDate: Date,
    asnSent: Boolean,
    asnSentAt: Date,
  },
  {
    timestamps: true,
  },
);

const AuditSchema = new mongoose.Schema(
  {
    direction: {
      type: String,
      enum: ["incoming", "outgoing"],
    },
    operation: String,
    payload: String,
    response: String,
    httpStatus: Number,
    success: Boolean,
    error: String,
  },
  {
    timestamps: true,
  },
);

module.exports = {
  Title: mongoose.model("Title", TitleSchema),
  Order: mongoose.model("Order", OrderSchema),
  Shipment: mongoose.model("Shipment", ShipmentSchema),
  Audit: mongoose.model("Audit", AuditSchema),
};
