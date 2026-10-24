export class VirtualCanBus {
  constructor({ clock, vehicleState, logger }) {
    this.clock = clock;
    this.vehicleState = vehicleState;
    this.logger = logger;
    this.subscribers = new Map();
    this.messageSequence = 0;
  }

  subscribe(ecuName, handler) {
    if (typeof handler !== "function") {
      throw new Error("Virtual CAN Bus subscriber must provide a handler function.");
    }

    this.subscribers.set(ecuName, handler);

    return () => {
      this.subscribers.delete(ecuName);
    };
  }

  transmit({
    sourceEcu,
    targetEcu = null,
    messageType,
    priority = "NORMAL",
    data = {},
    isAnomalous = false,
    anomalyReason = null,
    delivery = "DELIVERED",
    delayedByMs = 0,
  }) {
    if (!sourceEcu || !messageType) {
      throw new Error("sourceEcu and messageType are required for a virtual CAN message.");
    }

    this.messageSequence += 1;
    this.vehicleState.network.messageCount += 1;

    const message = {
      messageId: `virtual-can-${this.messageSequence}`,
      timestampMs: this.clock.timeMs,
      sourceEcu,
      targetEcu,
      messageType,
      priority,
      data,
      isAnomalous,
      anomalyReason,
      delivery,
      delayedByMs,
    };

    if (delivery === "DROPPED") {
      this.vehicleState.network.droppedMessageCount += 1;
      this.logger.log({
        timeMs: this.clock.timeMs,
        eventType: "CAN_MESSAGE_DROPPED",
        sourceEcu,
        targetEcu,
        message: `${messageType} was dropped by the virtual CAN Bus.`,
        severity: "HIGH",
        isAnomalous: true,
        data: message,
      });
      return message;
    }

    if (delayedByMs > 0 || delivery === "DELAYED") {
      this.vehicleState.network.delayedMessageCount += 1;
      this.logger.log({
        timeMs: this.clock.timeMs,
        eventType: "CAN_MESSAGE_DELAYED",
        sourceEcu,
        targetEcu,
        message: `${messageType} was delayed by ${delayedByMs} ms in the virtual CAN Bus.`,
        severity: "MEDIUM",
        isAnomalous: true,
        data: message,
      });
    }

    this.logger.log({
      timeMs: this.clock.timeMs,
      eventType: "CAN_MESSAGE_TRANSMITTED",
      sourceEcu,
      targetEcu,
      message: `${sourceEcu} transmitted ${messageType}.`,
      severity: isAnomalous ? "HIGH" : "INFO",
      isAnomalous,
      data: message,
    });

    const recipients = targetEcu
      ? [[targetEcu, this.subscribers.get(targetEcu)]]
      : [...this.subscribers.entries()].filter(([ecuName]) => ecuName !== sourceEcu);

    for (const [ecuName, handler] of recipients) {
      if (!handler) continue;

      handler(message, this.vehicleState);

      this.logger.log({
        timeMs: this.clock.timeMs,
        eventType: "CAN_MESSAGE_DELIVERED",
        sourceEcu,
        targetEcu: ecuName,
        message: `${messageType} was delivered to ${ecuName}.`,
        severity: "INFO",
        isAnomalous,
        data: {
          messageId: message.messageId,
          messageType,
        },
      });
    }

    return message;
  }

  getSubscriberNames() {
    return [...this.subscribers.keys()];
  }
}