import axios from "axios";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api",
});

export const getStats = () => api.get("/stats").then((r) => r.data);
export const getTitles = (params) =>
  api.get("/titles", { params }).then((r) => r.data);
export const getTitle = (id) => api.get(`/titles/${id}`).then((r) => r.data);
export const retryTitle = (id) =>
  api.post(`/titles/${id}/retry`).then((r) => r.data);
export const updateTitleStatus = (id, data) =>
  api.post(`/titles/${id}/status`, data).then((r) => r.data);
export const getOrders = (params) =>
  api.get("/orders", { params }).then((r) => r.data);
export const getOrder = (id) => api.get(`/orders/${id}`).then((r) => r.data);
export const sendAck = (id) =>
  api.post(`/orders/${id}/ack`).then((r) => r.data);
export const updateOrderStatus = (id, data) =>
  api.post(`/orders/${id}/status`, data).then((r) => r.data);
export const getShipments = () => api.get("/shipments").then((r) => r.data);
export const createShipment = (data) =>
  api.post("/shipments", data).then((r) => r.data);
export const getAudit = () => api.get("/audit").then((r) => r.data);
export const seedDatabase = () => api.post("/seed").then((r) => r.data);
export const resetDatabase = () => api.post("/reset").then((r) => r.data);
