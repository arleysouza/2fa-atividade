import axios, { AxiosHeaders, type AxiosRequestHeaders } from "axios";
import {
  decryptTransportPayload,
  encryptTransportPayload,
  isEncryptedResponse,
  parseDecryptedPayload,
} from "../utils/transportEncryption";

const apiClient = axios.create({
  baseURL: "/api",
});

const withHeaders = (
  headers: AxiosRequestHeaders | undefined,
  additions: Record<string, string>,
): AxiosHeaders => {
  const resolved = AxiosHeaders.from(headers ?? {});
  Object.entries(additions).forEach(([key, value]) => {
    resolved.set(key, value);
  });
  return resolved;
};

apiClient.interceptors.request.use(async (config) => {
  config.headers = withHeaders(config.headers, {
    "X-Transport-Accept-Encrypted": "true",
  });

  if (config.data !== undefined) {
    config.headers = withHeaders(config.headers, {
      "X-Transport-Encrypted": "true",
    });
    const encryptedPayload = await encryptTransportPayload(config.data);
    config.data = encryptedPayload;
  }

  return config;
});

apiClient.interceptors.response.use(
  async (response) => {
    if (isEncryptedResponse(response.data)) {
      const plaintext = await decryptTransportPayload(response.data.payload);
      response.data = parseDecryptedPayload(plaintext);
    }
    return response;
  },
  async (error) => {
    if (error.response && isEncryptedResponse(error.response.data)) {
      try {
        const plaintext = await decryptTransportPayload(
          error.response.data.payload,
        );
        error.response.data = parseDecryptedPayload(plaintext);
      } catch {
        // ignore decryption errors for error payloads
      }
    }
    return Promise.reject(error);
  },
);

export default apiClient;
