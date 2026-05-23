import { Module } from "@nestjs/common";
import { SessionsModule } from "../sessions/sessions.module";
import { LiveSessionGateway } from "./live-session.gateway";

@Module({
  imports: [SessionsModule],
  providers: [LiveSessionGateway],
})
export class WebsocketModule {}

