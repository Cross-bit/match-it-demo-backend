import * as amqp from 'amqplib';
import EventEmitter from "events";
import logger from '../../../logger';

/** Manages connections to rabbit MQ Queue
 * NOTE: This service was intended for communication between recommendation service and the activity-data-management service.
 * But since we currently don't use this model, this client is prepared here for future expansions over rabbit MQ
 */
export default class ActivityQueuesManager<DataT>
{

  private connection: amqp.Connection | null = null;
  private channel: amqp.Channel | null = null;

  private qPort: number
  private qUser: string
  private qPass: string

  public onDataEmitter = new EventEmitter();

  constructor() {
    this.qPort = +(process.env.RABBITMQ_AMQP_PORT ||  5672);
    this.qUser = process.env.RABBITMQ_USER || "root";
    this.qPass = process.env.RABBITMQ_PASS || "toor";
  }

  async connect() : Promise<void> {
    try {
      const amqpConenctionURL = `amqp://${this.qUser}:${this.qPass}@rabbitmq:${this.qPort}`;

      this.connection = await amqp.connect(amqpConenctionURL);
      this.channel = await this.connection.createChannel();

    }
    catch(err) {
      logger.error("[Rabbit MQ Client]: Connection to rabbit mq failed.");
      console.warn(err);
      await this.disconnect();
    }
  }

  /** Creates new queue in rabbit mq server.
   *
   * @param queueId Name of the queue, has to be unique.
   */
  async createQueue(queueId: string) : Promise<void> {

    try {
        await this.channel?.assertQueue(queueId, {durable: true});
    }
    catch (err) {
      logger.info(`[Rabbit MQ Client]: Queue ${queueId} creation failed!`);
      console.warn(err);
    }

    logger.info(`[Rabbit MQ Client]: Queue ${queueId} created.`);
  }

  /** Starts consumming messagis from the queue.
   *
   * @param queueId
   * @param count
   * @returns consuming tag
   */
  public async startConsuming(queueId: string, count: number) : Promise<string> {

    const consumerTag = (await this.channel?.consume(
        queueId,
        async (message) => {
          try {
              if (message) {
                  const recievedData = JSON.parse(message.content.toString()) as DataT;
                  this.onNewDataReceived(recievedData);
              }
          }
          catch(error) {
              logger.info(error);
              logger.error("[Rabbit MQ Client]: Data recieved from queue are invalid");
          }
        },
        { noAck: true }
    ))?.consumerTag as string;

    return consumerTag;
  }

  async stopConsuming(consumerTag: string) {
    await this.channel?.cancel(consumerTag);
  }

  /** Consumes only a specified amount of messages from the queue at max.
   *
   * @param queueId
   * @param count
   */
  public async consumeAmount(queueId: string, count: number) {

    let totalConsumedMsgCtr = 0;

    const consumerTag = (await this.channel?.consume(
        queueId,
        async (message) => {
          try {

              if (totalConsumedMsgCtr == count) {
                await this.channel?.cancel(consumerTag);
              }

              if (message) {
                  const recievedData = JSON.parse(message.content.toString());
                  this.onNewDataReceived(recievedData);
              }

              totalConsumedMsgCtr++;
          }
          catch(error) {
              logger.error(error);
              logger.error("[Rabbit MQ Client]: Data recieved from queue are invalid");
          }
        },
        { noAck: true }
    ))?.consumerTag as string;

  }

  onNewDataReceived(recievedData: DataT) {
    this.onDataEmitter.emit("recieved", recievedData);
  }

  async disconnect() : Promise<void> {
    await this.channel?.close();
    await this.connection?.close();

    logger.info('[Rabbit MQ Client]: Connection closed.');
  }
}