export const setupAlertHandlers = (io) => {
  io.on("connection", (socket) => {});

  const emitNewAlert = (userId, alert) => {
    io.to(`user:${userId}`).emit("newAlert", alert);
  };

  const emitAlertUpdate = (userId, alert) => {
    io.to(`user:${userId}`).emit("alertUpdate", alert);
  };

  return {
    emitNewAlert,
    emitAlertUpdate,
  };
};
