const mqtt = require("mqtt");
console.log("Starting MQTT client...");

const options = {
  username: "Prashant178",
  password: "Prashant178",
};

const client = mqtt.connect("mqtt://localhost:1883", options);

client.on("connect", () => {
  console.log("Connected to MQTT broker");

  setInterval(() => {
    const payload = JSON.stringify({
      sensorType: "pressure",
      primaryMetric: {
        name: "pressure",
        value: 4.96,
        unit: "bar",
        min: 0,
        max: 10,
      },
      secondaryMetrics: [
        {
          name: "flow_rate",
          value: 17.2,
          unit: "L/min",
          min: 0,
          max: 50,
        },
        {
          name: "temperature",
          value: 24.8,
          unit: "celsius",
          min: -10,
          max: 80,
        },
      ],
      status: "active",
      batteryLevel: 91,
      signalStrength: 92,
      metadata: {
        location: "Pipeline Section B",
        notes: "Monitoring hydraulic system",
        calibrationDate: "2025-05-20T00:00:00Z",
        firmware: "v1.3.2",
      },
    });

    client.publish(
      "iot/bf034754-ebc5-48d9-9ec2-d400fba64bf5/8bf4fe46-245b-4b30-851b-d218ee838bef/data",
      payload,
      { qos: 1 },
      (err) => {
        if (err) console.error("MQTT publish error:", err);
        else console.log("MQTT data sent:", payload);
      }
    );
  }, 5000);
});
