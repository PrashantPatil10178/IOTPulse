const mqtt = require("mqtt");
console.log("Starting MQTT client...");

const options = {
  username: "Prashant178",
  password: "0e82e608-bccc-4e47-9edf-aa1878a66e3f",
};

const client = mqtt.connect("mqtt://mqtt.webfuze.in", options);

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
    });

    client.publish(
      "iot/bf034754-ebc5-48d9-9ec2-d400fba64bf5/0e82e608-bccc-4e47-9edf-aa1878a66e3f/data",
      payload,
      { qos: 1 },
      (err) => {
        if (err) console.error("MQTT publish error:", err);
        else console.log("MQTT data sent:", payload);
      }
    );
  }, 500);
});
