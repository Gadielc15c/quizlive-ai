import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { SessionsService } from "../sessions/sessions.service";

@WebSocketGateway({
  namespace: "/live-session",
  cors: { origin: "*" },
})
export class LiveSessionGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  constructor(private readonly sessionsService: SessionsService) {}

  handleConnection(client: Socket) {
    client.emit("session:connected", { ok: true, socketId: client.id });
  }

  handleDisconnect(client: Socket) {
    client.broadcast.emit("session:participant_left", { socketId: client.id });
  }

  @SubscribeMessage("participant:join")
  async onParticipantJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { sessionId: string; participantId: string },
  ) {
    client.join(body.sessionId);
    this.server.to(body.sessionId).emit("session:participant_joined", body);
  }

  @SubscribeMessage("participant:answer_update")
  onAnswerUpdate(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    body: { sessionId: string; participantId: string; questionId: string },
  ) {
    client.to(body.sessionId).emit("session:answer_received", body);
  }

  @SubscribeMessage("participant:answer_submit")
  onAnswerSubmit(
    @MessageBody() body: { sessionId: string; participantId: string },
  ) {
    this.server.to(body.sessionId).emit("session:participant_submitted", body);
  }

  @SubscribeMessage("participant:heartbeat")
  onHeartbeat(@MessageBody() body: { sessionId: string; participantId: string }) {
    this.server.to(body.sessionId).emit("session:progress_updated", body);
  }

  @SubscribeMessage("teacher:start_session")
  async onTeacherStart(@MessageBody() body: { sessionId: string }) {
    await this.sessionsService.start(body.sessionId);
    this.server.to(body.sessionId).emit("session:started", body);
  }

  @SubscribeMessage("teacher:pause_session")
  async onTeacherPause(@MessageBody() body: { sessionId: string }) {
    await this.sessionsService.pause(body.sessionId);
    this.server.to(body.sessionId).emit("session:paused", body);
  }

  @SubscribeMessage("teacher:end_session")
  async onTeacherEnd(@MessageBody() body: { sessionId: string }) {
    await this.sessionsService.end(body.sessionId);
    this.server.to(body.sessionId).emit("session:ended", body);
  }

  @SubscribeMessage("teacher:next_question")
  onNextQuestion(
    @MessageBody() body: { sessionId: string; questionId: string; index: number },
  ) {
    this.server.to(body.sessionId).emit("question:changed", body);
  }

  @SubscribeMessage("teacher:extend_time")
  onExtendTime(@MessageBody() body: { sessionId: string; seconds: number }) {
    this.server.to(body.sessionId).emit("timer:updated", body);
  }

  @SubscribeMessage("teacher:send_announcement")
  onAnnouncement(@MessageBody() body: { sessionId: string; message: string }) {
    this.server.to(body.sessionId).emit("announcement:received", body);
  }
}

