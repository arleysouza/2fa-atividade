import twilio from "twilio";

let client: ReturnType<typeof twilio> | null = null;

const getClient = () => {
  if (client) {
    return client;
  }

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!accountSid || !authToken) {
    throw new Error("Twilio credentials are not configured");
  }

  client = twilio(accountSid, authToken);
  return client;
};

export const sendSms = async (to: string, body: string): Promise<void> => {
  const from = process.env.TWILIO_FROM_NUMBER;

  if (!from) {
    throw new Error("Twilio sender number (TWILIO_FROM_NUMBER) is not configured");
  }

  await getClient().messages.create({
    from,
    to,
    body,
  });
};
