const soap = require("soap");
const { Audit } = require("./db");
require("dotenv").config();

const creds = {
  identity: process.env.ATLAS_IDENTITY || "ARE",
  secret: process.env.ATLAS_SECRET || "test",
};

let clientPromise;
const getClient = () => {
  if (!clientPromise && process.env.CPI_WSDL) {
    clientPromise = soap.createClientAsync(process.env.CPI_WSDL);
  }
  return clientPromise;
};

const callCPI = async (operation, xml) => {
  const audit = await Audit.create({
    direction: "outgoing",
    operation,
    payload: xml,
    httpStatus: 0,
    success: false,
  });

  try {
    if (!process.env.CPI_WSDL || process.env.MOCK_CPI === "true") {
      // Mock response for testing in sandboxed / offline environment
      const mockResult = {
        [`${operation}Result`]: `<?xml version="1.0"?><metadata><response>OK</response></metadata>`,
      };
      audit.response = JSON.stringify(mockResult);
      audit.httpStatus = 200;
      audit.success = true;
      await audit.save();
      console.log(`📡 [MOCK CPI] Outgoing ${operation} successful.`);
      return mockResult;
    }

    const client = await getClient();
    const [result] = await client[`${operation}Async`]({ xml });
    audit.response =
      typeof result === "string" ? result : JSON.stringify(result);
    audit.httpStatus = 200;
    audit.success = true;
    await audit.save();
    return result;
  } catch (err) {
    audit.httpStatus = err.response?.status || 500;
    audit.success = false;
    audit.error = err.message;
    await audit.save();
    console.error(`❌ [CPI Client Error] ${operation}:`, err.message);
    throw err;
  }
};

module.exports = {
  creds,
  submitTitleStatus: (xml) => callCPI("GPSSubmitTitleStatus", xml),
  submitOrderAck: (xml) => callCPI("GPSSubmitOrderAck", xml),
  submitASN: (xml) => callCPI("GPSSubmitASN", xml),
};
