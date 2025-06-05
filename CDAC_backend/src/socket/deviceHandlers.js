export const setupDeviceHandlers = (io) => {
  io.on("connection", (socket) => {
    // Issue 1: Add error handling for missing user data
    if (!socket.user || !socket.user.id) {
      console.error("Socket connection missing user data");
      socket.disconnect();
      return;
    }

    socket.on("subscribeToDevice", (deviceId) => {
      // Issue 2: Validate deviceId parameter
      if (!deviceId) {
        socket.emit("error", { message: "Device ID is required" });
        return;
      }

      console.log(`User ${socket.user.id} subscribed to device ${deviceId}`);
      socket.join(`device:${deviceId}`);

      socket.emit("subscribedToDevice", {
        deviceId,
        message: `Subscribed to device ${deviceId}`,
        timestamp: new Date().toISOString(),
      });
    });

    socket.on("unsubscribeFromDevice", (deviceId) => {
      // Issue 4: Add validation and confirmation for unsubscribe
      if (!deviceId) {
        socket.emit("error", { message: "Device ID is required" });
        return;
      }

      console.log(
        `User ${socket.user.id} unsubscribed from device ${deviceId}`
      );
      socket.leave(`device:${deviceId}`);

      // Issue 5: Send confirmation of unsubscription
      socket.emit("unsubscribedFromDevice", {
        deviceId,
        message: `Unsubscribed from device ${deviceId}`,
        timestamp: new Date().toISOString(),
      });
    });

    // Issue 6: Add cleanup on disconnect
    socket.on("disconnect", () => {
      console.log(`User ${socket.user.id} disconnected`);
      // Socket.IO automatically handles room cleanup, but we can log it
    });

    // Issue 7: Add error handling for socket errors
    socket.on("error", (error) => {
      console.error(`Socket error for user ${socket.user.id}:`, error);
    });
  });

  const emitDeviceStatusUpdate = (userId, deviceId, data) => {
    // Issue 8: Add validation for required parameters
    if (!userId || !deviceId || !data) {
      console.error("Missing required parameters for device status update");
      return;
    }

    // Issue 9: Add timestamp to the data
    const updateData = {
      deviceId,
      timestamp: new Date().toISOString(),
      ...data,
    };

    io.to(`user:${userId}`)
      .to(`device:${deviceId}`)
      .emit("deviceStatusUpdate", updateData);
  };

  const emitNewSensorReading = (userId, deviceId, data) => {
    // Issue 10: Add validation for required parameters
    if (!userId || !deviceId || !data) {
      console.error("Missing required parameters for sensor reading");
      return;
    }

    // Issue 11: Add timestamp to the data
    const sensorData = {
      deviceId,
      timestamp: new Date().toISOString(),
      ...data,
    };

    return io
      .to(`user:${userId}`)
      .to(`device:${deviceId}`)
      .emit("newSensorReading", sensorData);
  };

  // Issue 12: Add utility function to check if user is subscribed to device
  const isUserSubscribedToDevice = (userId, deviceId) => {
    const userSockets = io.sockets.adapter.rooms.get(`user:${userId}`);
    const deviceRoom = io.sockets.adapter.rooms.get(`device:${deviceId}`);

    if (!userSockets || !deviceRoom) return false;

    // Check if any user socket is in the device room
    for (let socketId of userSockets) {
      if (deviceRoom.has(socketId)) {
        return true;
      }
    }
    return false;
  };

  return {
    emitDeviceStatusUpdate,
    emitNewSensorReading,
    isUserSubscribedToDevice, // Issue 13: Export utility function
  };
};
