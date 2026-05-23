import { io, type Socket } from "socket.io-client";

const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL ?? "http://localhost:5000";

export function createLiveSocket(): Socket {
  return io(`${SOCKET_URL}/live-session`, {
    transports: ["websocket"],
    autoConnect: true,
  });
}
