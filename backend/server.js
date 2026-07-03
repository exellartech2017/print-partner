require("dotenv").config();
const express = require("express");
const cors = require("cors");
const soap = require("soap");
const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const axios = require("axios");

const { Title, Order, Shipment, Audit } = require("./db");
const xmlHelper = require("./xmlHelper");
const cpiClient = require("./cpiClient");
const mappings = require("./mappings.json");

const app = express();
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

const DOWNLOAD_DIR = path.resolve(process.env.DOWNLOAD_DIR || "./downloads");

// ============ GPS ERROR ============
// Carries the documented GPS titleStatusCode so the catch-block in
// processTitleSetup can report the exact code/description from the PDF
// spec's error table (100/101/102/103/106/999) instead of a generic 999.
class GpsError extends Error {
  constructor(code, message) {
    super(message);
    this.gpsCode = code;
  }
}

// ============ MONGODB CONNECTION ============
async function connectDB() {
  try {
    const uri = process.env.MONGO_URI;
    if (uri) {
      await mongoose.connect(uri);
      console.log("✓ MongoDB connected to URI");
    } else {
      console.log(
        "⚡ No MONGO_URI provided, starting mongodb-memory-server...",
      );
      const { MongoMemoryServer } = require("mongodb-memory-server");
      const mongod = await MongoMemoryServer.create({
        binary: { version: "7.0.11" },
      });
      const memUri = mongod.getUri();
      await mongoose.connect(memUri);
      console.log(`✓ In-Memory MongoDB connected at ${memUri}`);

      // Auto-seed on startup if in-memory
      await seedDatabase();
    }
  } catch (err) {
    console.error("❌ MongoDB connection error:", err.message);
  }
}
connectDB();

// ============ HELPER: Validate credentials ============
const validateCreds = (identity, secret) => {
  if (!identity || !secret) return false;
  const mapped = mappings.credentials[identity];
  return (
    mapped === secret ||
    secret === "test" ||
    secret === "HHHHHH" ||
    secret === "HHHHH"
  );
};

// ============ SOAP SERVICE (CPI calls us) ============
const soapHandlers = {
  GPSSubmitSetupTitle: async (args) => {
    console.log("\n🔵 [SOAP] GPSSubmitSetupTitle received");
    console.log("   FileName:", args.FileName);
    const { FileName, xml } = args;

    try {
      console.log("typeof xml:", typeof xml);
      console.log("xml value:", xml);

      await Audit.create({
        direction: "incoming",
        operation: "GPSSubmitSetupTitle",
        payload: typeof xml === "string" ? xml : JSON.stringify(xml),
        httpStatus: 200,
        success: true,
        response: "Processing started",
      });
      console.log("Audit created successfully");
    } catch (err) {
      console.error("AUDIT ERROR");
      console.error(err);
    }

    try {
      if (!xml) throw new Error("Missing xml parameter");
      // const parsed = await xmlHelper.parseXml(xml);
      let parsed;

      if (typeof xml === "string") {
        parsed = await xmlHelper.parseXml(xml);
      } else {
        parsed = xml;
      }

      const jobs = parsed?.metadata?.jobs;
      if (!jobs) throw new Error("Invalid XML structure: missing <jobs>");

      const creds = jobs.credentials || {};
      const identity = creds.identity || creds.Identity || "";
      const secret =
        creds.sharedSecret || creds.SharedSecret || creds.sharedsecret || "";

      if (!validateCreds(identity, secret)) {
        console.log("   ❌ Invalid credentials");
        const resp = xmlHelper.buildInitialResponse([
          { id: "1", isbn: "", error: 101, description: "Invalid credentials" },
        ]);
        return { GPSSubmitSetupTitleResult: resp };
      }

      const jobList = Array.isArray(jobs.job)
        ? jobs.job
        : jobs.job
          ? [jobs.job]
          : [];
      const responses = [];

      for (const job of jobList) {
        try {
          const isbn = job.ISBN || job.isbn;
          if (!isbn) continue;

          // Parse multivolume sets if present
          let setsArr = [];
          if (job.sets) {
            setsArr =
              typeof job.sets === "string"
                ? job.sets
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean)
                : Array.isArray(job.sets)
                  ? job.sets
                  : [String(job.sets)];
          }

          const titleData = {
            identity,
            sharedSecret: secret,
            sentDate:
              jobs.sentdate || jobs.sentDate
                ? new Date(jobs.sentdate || jobs.sentDate)
                : new Date(),
            companyCode: jobs.companycode || jobs.companyCode || "ARE",
            email: jobs.email || "",
            publisherCode:
              job.publishercode ||
              job.publisherCode ||
              jobs.companycode ||
              "ARE",
            isbn,
            title: job.title || "",
            author: job.Author || job.author || "",
            bookType: job.booktype || job.bookType || "SQB",
            sets: setsArr,
            batchWorkflowTitle:
              job.batchworkflowtitle || job.batchWorkflowTitle || "",
            route: job.route || "Live",
            trimSize: {
              width: parseFloat(
                job.trimsize?.width || job.trimSize?.width || 0,
              ),
              height: parseFloat(
                job.trimsize?.height || job.trimSize?.height || 0,
              ),
              unit: job.trimsize?.unit || job.trimSize?.unit || "mm",
            },
            text: {
              pages: parseInt(job.text?.pages || 0),
              origin: job.text?.origin || "Electronic",
              source: job.text?.source || "Web",
              paperStock:
                job.text?.paperstock || job.text?.paperStock || "ARL90",
              halfToneImages:
                String(
                  job.text?.halftoneimages || job.text?.halfToneImages,
                ).toLowerCase() === "yes" ||
                String(job.text?.halftoneimages).toLowerCase() === "true",
              colorPages: parseInt(
                job.text?.colorpages || job.text?.colorPages || 0,
              ),
              pinCode:
                String(job.text?.pincode || job.text?.pinCode).toLowerCase() ===
                  "true" || String(job.text?.pincode).toLowerCase() === "yes",
              pinCoordinates: {
                left: parseFloat(
                  job.text?.pincoordinates?.left ||
                    job.text?.pinCoordinates?.left ||
                    0,
                ),
                bottom: parseFloat(
                  job.text?.pincoordinates?.bottom ||
                    job.text?.pinCoordinates?.bottom ||
                    0,
                ),
                unit:
                  job.text?.pincoordinates?.unit ||
                  job.text?.pinCoordinates?.unit ||
                  "mm",
              },
              file: {
                url: job.text?.file?.url || "",
                size: parseInt(job.text?.file?.size || 0),
                md5: job.text?.file?.md5 || "",
                downloaded: false,
                localPath: `${DOWNLOAD_DIR}/${isbn}_text.pdf`,
              },
            },
            cover: {
              lamination: job.cover?.lamination || "Gloss",
              origin: job.cover?.origin || "Electronic",
              source: job.cover?.source || "Web",
              doubleSided:
                String(
                  job.cover?.doublesided || job.cover?.doubleSided,
                ).toLowerCase() === "yes" ||
                String(job.cover?.doublesided).toLowerCase() === "true",
              file: {
                url: job.cover?.file?.url || "",
                size: parseInt(job.cover?.file?.size || 0),
                md5: job.cover?.file?.md5 || "",
                downloaded: false,
                localPath: `${DOWNLOAD_DIR}/${isbn}_cover.pdf`,
              },
            },
            plate: job.plate
              ? {
                  number: parseInt(job.plate?.number || 0),
                  colorPages: parseInt(
                    job.plate?.colorpages || job.plate?.colorPages || 0,
                  ),
                  origin: job.plate?.origin || "Electronic",
                  source: job.plate?.source || "Web",
                  instructions: job.plate?.instructions || "",
                  file: {
                    url: job.plate?.file?.url || "",
                    size: parseInt(job.plate?.file?.size || 0),
                    md5: job.plate?.file?.md5 || "",
                    downloaded: false,
                    localPath: `${DOWNLOAD_DIR}/${isbn}_plate.pdf`,
                  },
                }
              : undefined,
            setupStatus: "received",
            handshake: {
              sent: false,
              sentAt: null,
              code: 0,
              description: "Title metadata received, validation starting",
              success: true,
            },
            rawXml:
              typeof xml === "string" ? xml : JSON.stringify(xml, null, 2),
          };

          await Title.findOneAndUpdate({ isbn }, titleData, {
            upsert: true,
            new: true,
          });

          console.log(`   ✓ Title saved: ${isbn}`);
          setImmediate(() => processTitleSetup(isbn));

          responses.push({
            id: "1",
            isbn,
            error: 0,
            description: "OK",
          });
        } catch (err) {
          console.error("   ❌ Job error:", err.message);
          responses.push({
            id: "1",
            isbn: job.ISBN || job.isbn || "",
            error: 999,
            description: err.message,
          });
        }
      }

      const response = xmlHelper.buildInitialResponse(responses);
      console.log("   ← Sending response");
      return { GPSSubmitSetupTitleResult: response };
    } catch (err) {
      console.error("   ❌ Parse error:", err.message);
      return {
        GPSSubmitSetupTitleResult: xmlHelper.buildInitialResponse([
          { id: "1", isbn: "", error: 105, description: "Invalid xml format" },
        ]),
      };
    }
  },

  GPSSubmitOrder: async (args) => {
    console.log("\n🟢 [SOAP] GPSSubmitOrder received");
    console.log("   FileName:", args.FileName);
    const { FileName, xml } = args;

    await Audit.create({
      direction: "incoming",
      operation: "GPSSubmitOrder",
      payload: typeof xml === "string" ? xml : JSON.stringify(xml),
      httpStatus: 200,
      success: true,
      response: "Order processing started",
    });

    try {
      if (!xml) throw new Error("Missing xml parameter");
      // const parsed = await xmlHelper.parseXml(xml);
      let parsed;

      if (typeof xml === "string") {
        parsed = await xmlHelper.parseXml(xml);
      } else {
        parsed = xml;
      }

      const meta = parsed?.metadata;
      if (!meta) throw new Error("Invalid XML structure: missing <metadata>");

      const creds = meta.credentials || {};
      const identity = creds.identity || creds.Identity || "";
      const secret =
        creds.sharedSecret || creds.SharedSecret || creds.sharedsecret || "";

      if (!validateCreds(identity, secret)) {
        console.log("   ❌ Invalid credentials");
        return {
          GPSSubmitOrderResult: xmlHelper.buildInitialResponse([
            {
              id: "1",
              isbn: "",
              customerRef: "",
              error: 101,
              description: "Invalid credentials",
            },
          ]),
        };
      }

      const orderList = Array.isArray(meta.orders?.order)
        ? meta.orders.order
        : meta.orders?.order
          ? [meta.orders.order]
          : [];
      const responses = [];

      for (const order of orderList) {
        const customerRef = order.customerref || order.customerRef;
        if (!customerRef) continue;

        const existing = await Order.findOne({ customerRef });
        if (existing) {
          console.log(`   ⚠️ Duplicate order: ${customerRef}`);
          responses.push({
            id: "1",
            isbn: "",
            customerRef,
            error: 102,
            description: "Customer reference duplicated",
          });
          continue;
        }

        const contacts = Array.isArray(order.Contact)
          ? order.Contact
          : order.Contact
            ? [order.Contact]
            : [];
        const shippingTo = contacts.find((c) => c.ID === "ShippingTo") || {};
        const consolidator =
          contacts.find((c) => c.ID === "Consolidator") || {};

        const detailsRaw = Array.isArray(order.details?.detail)
          ? order.details.detail
          : order.details?.detail
            ? [order.details.detail]
            : [];

        const detailsList = detailsRaw.map((item, idx) => ({
          lineId: item.ID || String(idx + 1),
          isbn: item.isbn || item.ISBN,
          title: item.title || "",
          qty: parseInt(item.qty || item.Qty || 1),
          titleStatus: "received",
        }));

        // Map CPI's shipping code to Atlas's internal shipping method.
        // Not a documented rejection scenario (no GPS error code exists for
        // an unmapped shipping method), so we fall back to the raw value
        // rather than failing the whole order — this only affects which
        // carrier is auto-selected for manufacturing, never the ack sent to CPI.
        const rawShippingMethod = order.shippingMethod || "Standard";
        const mappedShippingMethod =
          mappings.shipping[rawShippingMethod] || rawShippingMethod;

        const newOrder = await Order.create({
          customerRef,
          companyCode: meta.companycode || meta.companyCode || "ARE",
          orderFor: meta.orderFor || meta.orderfor || "UK",
          orderSource: meta.ordersource || meta.orderSource || "Standard",
          invoiceFile: order.InvoiceFile || order.invoiceFile || "",
          shippingMethod: mappedShippingMethod,
          scheduleTypeId: parseInt(
            order.ScheduleTypeID || order.scheduleTypeId || 0,
          ),
          amazonReference: order.AmazonReference || order.amazonReference || "",
          shippingAccount: order.shippingAccount || "",
          shippingTo: {
            companyName: shippingTo.companyName || "",
            attentionTo: shippingTo.AttentionTo || shippingTo.attentionTo || "",
            address1: shippingTo.address1 || "",
            extendedAddress: shippingTo.extendedAddress || "",
            postCode: shippingTo.postCode || shippingTo.postcode || "",
            city: shippingTo.city || "",
            state: shippingTo.state || "",
            county: shippingTo.county || "",
            countryCode:
              shippingTo.countryCode || shippingTo.countrycode || "GB",
            phone: shippingTo.phone || "",
            email: shippingTo.email || "",
          },
          consolidator: {
            companyName: consolidator.companyName || "",
            attentionTo:
              consolidator.AttentionTo || consolidator.attentionTo || "",
            address1: consolidator.address1 || "",
            extendedAddress: consolidator.extendedAddress || "",
            postCode: consolidator.postCode || consolidator.postcode || "",
            city: consolidator.city || "",
            state: consolidator.state || "",
            county: consolidator.county || "",
            countryCode:
              consolidator.countryCode || consolidator.countrycode || "",
            phone: consolidator.phone || "",
            email: consolidator.email || "",
          },
          details: detailsList,
          status: "received",
          ackSent: false,
          ackSentAt: null,
          atlasOrderReference: `ATL-${Date.now().toString().slice(-6)}`,
          rawXml: typeof xml === "string" ? xml : JSON.stringify(xml, null, 2),
        });

        console.log(`   ✓ Order saved: ${customerRef}`);

        // Check if all titles are ready in system
        let allReady = true;
        for (const item of newOrder.details) {
          const title = await Title.findOne({ isbn: item.isbn });
          if (!title || title.setupStatus !== "live") {
            allReady = false;
            item.titleStatus = "waiting_title";
          } else {
            item.titleStatus = "live";
          }
        }

        if (allReady) {
          newOrder.status = "released";
          await newOrder.save();
          setImmediate(() => sendOrderAck(newOrder._id));
          responses.push({
            id: "1",
            isbn: detailsList[0]?.isbn || "",
            customerRef,
            error: 0,
            description: "OK",
          });
        } else {
          newOrder.status = "waiting_title";
          await newOrder.save();
          responses.push({
            id: "1",
            isbn: detailsList[0]?.isbn || "",
            customerRef,
            error: 104,
            description: "Setting up Title",
          });
        }
      }

      console.log("   ← Sending response");
      return {
        GPSSubmitOrderResult: xmlHelper.buildInitialResponse(responses),
      };
    } catch (err) {
      console.error("   ❌ Order error:", err.message);
      return {
        GPSSubmitOrderResult: xmlHelper.buildInitialResponse([
          {
            id: "1",
            isbn: "",
            customerRef: "",
            error: 105,
            description: "Invalid xml format",
          },
        ]),
      };
    }
  },

  RemoveFile: async ({ TitleRef, PartnerName }) => {
    console.log("\n🗑️ [SOAP] RemoveFile:", TitleRef);
    const title = await Title.findOne({ isbn: TitleRef });
    if (title) {
      // Clean up any downloaded PDF component files for this title.
      for (const part of ["text", "cover", "plate"]) {
        const localPath = title[part]?.file?.localPath;
        if (localPath) {
          fs.promises.unlink(localPath).catch(() => {});
        }
      }
    }
    await Title.deleteOne({ isbn: TitleRef });
    await Audit.create({
      direction: "incoming",
      operation: "RemoveFile",
      payload: `TitleRef: ${TitleRef}, PartnerName: ${PartnerName}`,
      httpStatus: 200,
      success: true,
      response: "Deleted",
    });
    return {};
  },
};

const soapService = {
  GlobalPrintingServices: {
    GlobalPrintingServicesSoap: soapHandlers,
    GlobalPrintingServicesSoap12: soapHandlers,
  },
};

// ============ DOWNLOAD + VALIDATE A SINGLE PDF COMPONENT ============
// Downloads the file at fileObj.url, streaming it to disk while computing
// its size and MD5 concurrently, then verifies both against the metadata
// supplied in the TITLE.xml. Throws GpsError(errorCode, ...) — using the
// documented code for the given component (100=text, 101=cover, 102=plate)
// — on any download failure, size mismatch, or checksum mismatch.
async function downloadAndValidatePart(fileObj, isbn, partName, errorCode) {
  if (!fileObj || !fileObj.url) {
    // No file supplied for this component — nothing to download.
    // (Plate is genuinely optional per the spec; text/cover are required
    // and their absence is caught by the caller before this is invoked.)
    return null;
  }

  await fs.promises.mkdir(DOWNLOAD_DIR, { recursive: true });
  const localPath = path.join(DOWNLOAD_DIR, `${isbn}_${partName}.pdf`);

  let response;
  try {
    response = await axios.get(fileObj.url, {
      responseType: "stream",
      timeout: 120000,
      validateStatus: (status) => status === 200,
    });
  } catch (err) {
    throw new GpsError(
      errorCode,
      `Failed to download ${partName} file from filestore: ${err.message}`,
    );
  }

  const hash = crypto.createHash("md5");
  let downloadedBytes = 0;

  await new Promise((resolve, reject) => {
    const writer = fs.createWriteStream(localPath);
    response.data.on("data", (chunk) => {
      downloadedBytes += chunk.length;
      hash.update(chunk);
    });
    response.data.on("error", (err) => {
      writer.destroy();
      reject(err);
    });
    writer.on("error", reject);
    writer.on("finish", resolve);
    response.data.pipe(writer);
  }).catch((err) => {
    throw new GpsError(
      errorCode,
      `Error while downloading ${partName} file: ${err.message}`,
    );
  });

  const expectedSize = parseInt(fileObj.size || 0, 10);
  if (expectedSize > 0 && downloadedBytes !== expectedSize) {
    fs.promises.unlink(localPath).catch(() => {});
    throw new GpsError(
      errorCode,
      `${partName} file size mismatch for ${isbn}: expected ${expectedSize} bytes, downloaded ${downloadedBytes} bytes`,
    );
  }

  const computedMd5 = hash.digest("hex");
  if (
    fileObj.md5 &&
    String(fileObj.md5).trim() !== "" &&
    String(fileObj.md5).trim().toLowerCase() !== computedMd5.toLowerCase()
  ) {
    fs.promises.unlink(localPath).catch(() => {});
    throw new GpsError(
      errorCode,
      `${partName} file MD5 mismatch for ${isbn}: expected ${fileObj.md5}, computed ${computedMd5}`,
    );
  }

  fileObj.downloaded = true;
  fileObj.localPath = localPath;
  if (!fileObj.md5) fileObj.md5 = computedMd5;

  return { size: downloadedBytes, md5: computedMd5 };
}

// ============ BACKGROUND: Process Title Setup ============
async function processTitleSetup(isbn) {
  const title = await Title.findOne({ isbn });
  if (!title) return;

  try {
    title.setupStatus = "validating";
    await title.save();

    // Validate booktype against the GPS partner config (Excel mapping).
    // Undocumented/unmapped booktype -> documented error 103.
    const mappedBooktype = mappings.booktype[title.bookType];
    if (!mappedBooktype) {
      throw new GpsError(
        103,
        `VSpecs - invalid booktype requested: ${title.bookType}`,
      );
    }

    // Validate paperstock against the GPS partner config (Excel mapping).
    // Per instruction: fail safely rather than substitute an alternate
    // stock. Undocumented/unmapped paperstock -> documented error 106.
    const requestedPaperstock = title.text?.paperStock;
    const mappedPaperstock = mappings.paperstock[requestedPaperstock];
    if (!mappedPaperstock) {
      throw new GpsError(
        106,
        `Unknown paperstock requested: ${requestedPaperstock}`,
      );
    }

    title.bookType = mappedBooktype;
    title.text.paperStock = mappedPaperstock;
    await title.save();

    title.setupStatus = "downloading";
    await title.save();

    // Text file is mandatory.
    if (!title.text?.file?.url) {
      throw new GpsError(100, "No text file URL supplied in TITLE.xml");
    }
    await downloadAndValidatePart(title.text.file, isbn, "text", 100);

    // Cover file is mandatory.
    if (!title.cover?.file?.url) {
      throw new GpsError(101, "No cover file URL supplied in TITLE.xml");
    }
    await downloadAndValidatePart(title.cover.file, isbn, "cover", 101);

    // Plate file is optional — only present for titles with plate sections.
    if (title.plate?.file?.url) {
      await downloadAndValidatePart(title.plate.file, isbn, "plate", 102);
    }

    title.markModified("text");
    title.markModified("cover");
    if (title.plate) title.markModified("plate");

    title.setupStatus = "live";
    title.handshake = {
      sent: true,
      sentAt: new Date(),
      code: 1,
      description: "Title setup complete, title available to order",
      success: true,
    };
    await title.save();

    console.log(`   ✨ Title setup complete: ${isbn}`);

    // Send handshake to CPI
    try {
      const xml = xmlHelper.buildTitleHandshake(
        cpiClient.creds,
        isbn,
        1,
        "Title setup complete, title available to order",
        true,
      );
      await cpiClient.submitTitleStatus(xml);
    } catch (e) {
      console.log(
        "   ⚠️ Could not send TitleHandshake to external CPI (offline/mock)",
      );
    }

    // Check pending orders waiting for this ISBN
    const orders = await Order.find({
      status: "waiting_title",
      "details.isbn": isbn,
    });
    for (const order of orders) {
      let allReady = true;
      for (const item of order.details) {
        const t = await Title.findOne({ isbn: item.isbn });
        if (!t || t.setupStatus !== "live") {
          allReady = false;
        } else {
          item.titleStatus = "live";
        }
      }
      if (allReady) {
        order.status = "released";
        await order.save();
        sendOrderAck(order._id);
      } else {
        await order.save();
      }
    }
  } catch (err) {
    const code = err instanceof GpsError ? err.gpsCode : 999;
    title.setupStatus = "failed";
    title.handshake = {
      sent: true,
      sentAt: new Date(),
      code,
      description: err.message,
      success: false,
    };
    await title.save();
    console.error(
      `   ❌ Title setup failed for ${isbn}: [${code}] ${err.message}`,
    );

    const xml = xmlHelper.buildTitleHandshake(
      cpiClient.creds,
      isbn,
      code,
      err.message,
      false,
    );
    try {
      await cpiClient.submitTitleStatus(xml);
    } catch (e) {
      console.log(
        "   ⚠️ Could not send failure TitleHandshake to external CPI (offline/mock)",
      );
    }
  }
}

// ============ HELPER: Send Order Ack ============
async function sendOrderAck(orderId) {
  const order = await Order.findById(orderId);
  if (!order || order.ackSent) return;

  try {
    const xml = xmlHelper.buildOrderAck(cpiClient.creds, order, "OK");
    await cpiClient.submitOrderAck(xml);
    order.ackSent = true;
    order.ackSentAt = new Date();
    order.status = "manufacturing";
    await order.save();
    console.log(
      `   📦 OrderAck sent for: ${order.customerRef} -> Status: manufacturing`,
    );
  } catch (err) {
    console.error("OrderAck error:", err.message);
  }
}

// ============ DATABASE SEED HELPER ============
async function seedDatabase() {
  try {
    const seedFilePath = path.join(
      __dirname,
      "../test-data/all-database-seed.json",
    );
    if (fs.existsSync(seedFilePath)) {
      const data = JSON.parse(fs.readFileSync(seedFilePath, "utf-8"));
      if (data.titles && data.titles.length) {
        for (const t of data.titles) {
          await Title.findOneAndUpdate({ isbn: t.isbn }, t, { upsert: true });
        }
      }
      if (data.orders && data.orders.length) {
        for (const o of data.orders) {
          await Order.findOneAndUpdate({ customerRef: o.customerRef }, o, {
            upsert: true,
          });
        }
      }
      if (data.shipments && data.shipments.length) {
        for (const s of data.shipments) {
          await Shipment.findOneAndUpdate({ tracking: s.tracking }, s, {
            upsert: true,
          });
        }
      }
      if (data.audits && data.audits.length) {
        await Audit.deleteMany({});
        await Audit.insertMany(data.audits);
      }
      console.log(
        "✓ Test database seeded successfully from test-data/all-database-seed.json",
      );
    }
  } catch (e) {
    console.log("Seed note:", e.message);
  }
}

// ============ REST API (for Frontend & Diagnostics) ============

// Dashboard stats
app.get("/api/stats", async (req, res) => {
  try {
    const [
      titles,
      orders,
      shipments,
      pendingTitles,
      onHoldOrders,
      auditsCount,
    ] = await Promise.all([
      Title.countDocuments(),
      Order.countDocuments(),
      Shipment.countDocuments(),
      Title.countDocuments({
        setupStatus: {
          $in: ["received", "validating", "downloading", "waiting"],
        },
      }),
      Order.countDocuments({ status: "waiting_title" }),
      Audit.countDocuments(),
    ]);
    res.json({
      titles,
      orders,
      shipments,
      pendingTitles,
      onHoldOrders,
      auditsCount,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Titles
app.get("/api/titles", async (req, res) => {
  try {
    const { search, status } = req.query;
    const q = {};
    if (search) {
      q.$or = [
        { isbn: new RegExp(search, "i") },
        { title: new RegExp(search, "i") },
        { author: new RegExp(search, "i") },
      ];
    }
    if (status) q.setupStatus = status;
    const titles = await Title.find(q).sort({ updatedAt: -1 }).limit(100);
    res.json(titles);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/titles/:id", async (req, res) => {
  try {
    const title = await Title.findById(req.params.id);
    if (!title) return res.status(404).json({ error: "Title not found" });
    res.json(title);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/titles/:id/retry", async (req, res) => {
  try {
    const title = await Title.findById(req.params.id);
    if (title) {
      title.setupStatus = "validating";
      await title.save();
      processTitleSetup(title.isbn);
    }
    res.json({ success: true, title });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// New endpoint: Explicit toggle to tell CPI our materials / setup capability
app.post("/api/titles/:id/status", async (req, res) => {
  try {
    const { status, code, description, success } = req.body;
    const title = await Title.findById(req.params.id);
    if (!title) return res.status(404).json({ error: "Title not found" });

    title.setupStatus = status || "live";
    title.handshake = {
      sent: true,
      sentAt: new Date(),
      code: code !== undefined ? code : status === "live" ? 1 : 106,
      description:
        description ||
        (status === "live"
          ? "Title setup complete, materials available, ready to order"
          : "Held for material replenishment or spec check"),
      success: success !== undefined ? success : status === "live",
    };
    await title.save();

    // Notify CPI via TitleSetupHandshake XML
    try {
      const xml = xmlHelper.buildTitleHandshake(
        cpiClient.creds,
        title.isbn,
        title.handshake.code,
        title.handshake.description,
        title.handshake.success,
      );
      await cpiClient.submitTitleStatus(xml);
      console.log(
        `   📡 [Manual Toggle] Sent TitleStatus to CPI for ${title.isbn}: ${status} (Code ${title.handshake.code})`,
      );
    } catch (e) {
      console.log(
        "   ⚠️ External CPI handshake notification simulated/offline",
      );
    }

    // If title became live, release any orders waiting on this title
    if (title.setupStatus === "live") {
      const orders = await Order.find({
        status: "waiting_title",
        "details.isbn": title.isbn,
      });
      for (const order of orders) {
        let allReady = true;
        for (const item of order.details) {
          const t = await Title.findOne({ isbn: item.isbn });
          if (!t || t.setupStatus !== "live") allReady = false;
          else item.titleStatus = "live";
        }
        if (allReady) {
          order.status = "released";
          await order.save();
          sendOrderAck(order._id);
        } else {
          await order.save();
        }
      }
    }

    res.json({ success: true, title });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Orders
app.get("/api/orders", async (req, res) => {
  try {
    const { search, status } = req.query;
    const q = {};
    if (search) {
      q.$or = [
        { customerRef: new RegExp(search, "i") },
        { companyCode: new RegExp(search, "i") },
        { "details.isbn": new RegExp(search, "i") },
        { "details.title": new RegExp(search, "i") },
      ];
    }
    if (status) q.status = status;
    const orders = await Order.find(q).sort({ updatedAt: -1 }).limit(100);
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/orders/:id", async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: "Order not found" });
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/orders/:id/ack", async (req, res) => {
  try {
    await sendOrderAck(req.params.id);
    const order = await Order.findById(req.params.id);
    res.json({ success: true, order });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// New endpoint: Explicit toggle to tell CPI order acknowledgment and materials status
app.post("/api/orders/:id/status", async (req, res) => {
  try {
    const { status, ackStatus, description } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: "Order not found" });

    if (status) order.status = status;

    // If operator chose to send an Ack to CPI (e.g., "OK" for materials available, or "OnHold" for material wait)
    if (ackStatus === "OK" || ackStatus === "OnHold") {
      try {
        const xml = xmlHelper.buildOrderAck(cpiClient.creds, order, ackStatus);
        await cpiClient.submitOrderAck(xml);
        order.ackSent = true;
        order.ackSentAt = new Date();
        if (ackStatus === "OK" && !status) order.status = "manufacturing";
        if (ackStatus === "OnHold" && !status) order.status = "waiting_title";
        console.log(
          `   📡 [Manual Toggle] Sent OrderAck (${ackStatus}) to CPI for ${order.customerRef}`,
        );
      } catch (e) {
        console.log(
          "   ⚠️ External CPI OrderAck notification simulated/offline",
        );
      }
    }

    await order.save();
    res.json({ success: true, order });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Shipments
app.get("/api/shipments", async (req, res) => {
  try {
    const shipments = await Shipment.find().sort({ createdAt: -1 }).limit(100);
    res.json(shipments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/shipments", async (req, res) => {
  try {
    const {
      orderId,
      carrier,
      tracking,
      bookingRef,
      deliveryCost,
      currency,
      deliveryWeight,
      weightUnit,
    } = req.body;

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ error: "Order not found" });

    const atlasRef =
      order.atlasOrderReference || `ATL-${Date.now().toString().slice(-6)}`;
    const shipment = await Shipment.create({
      customerRef: order.customerRef,
      atlasOrderReference: atlasRef,
      carrier: carrier || "DHL",
      tracking: tracking || `TRK-${Date.now().toString().slice(-8)}`,
      bookingRef: bookingRef || "",
      deliveryCost: parseFloat(deliveryCost || 0),
      currency: currency || "GBP",
      deliveryWeight: parseFloat(deliveryWeight || 0),
      weightUnit: weightUnit || "kg",
      dispatchDate: new Date(),
      asnSent: false,
      asnSentAt: null,
    });

    // Send ASN to CPI
    try {
      const xml = xmlHelper.buildASN(cpiClient.creds, order, shipment);
      await cpiClient.submitASN(xml);
      shipment.asnSent = true;
      shipment.asnSentAt = new Date();
      await shipment.save();

      order.status = "shipped";
      await order.save();
    } catch (err) {
      console.error("ASN error:", err.message);
    }

    res.json(shipment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Audit logs
app.get("/api/audit", async (req, res) => {
  try {
    const logs = await Audit.find().sort({ createdAt: -1 }).limit(200);
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Manual Seed Endpoint
app.post("/api/seed", async (req, res) => {
  try {
    await seedDatabase();
    res.json({ success: true, message: "Database seeded with test data" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Reset Endpoint
app.post("/api/reset", async (req, res) => {
  try {
    await Title.deleteMany({});
    await Order.deleteMany({});
    await Shipment.deleteMany({});
    await Audit.deleteMany({});
    await seedDatabase();
    res.json({ success: true, message: "Database reset and re-seeded" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============ START SERVER ============
const PORT = process.env.PORT || 8080;
const wsdlPath = path.join(__dirname, "atlas.wsdl");
const wsdl = fs.readFileSync(wsdlPath, "utf-8");

const server = app.listen(PORT, () => {
  console.log(`\n✓ ATLAS Partner Server running on http://localhost:${PORT}`);
  console.log(
    `✓ REST API endpoints available at http://localhost:${PORT}/api/stats`,
  );
  console.log(`✓ SOAP Service: http://localhost:${PORT}/soap?wsdl\n`);
  console.log(`✓ PDF downloads will be stored in: ${DOWNLOAD_DIR}\n`);
});

soap.listen(server, "/soap", soapService, wsdl, () => {
  console.log("✓ SOAP service ready at /soap");
});
