import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { AuthUser } from "../auth.types";

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context
      .switchToHttp()
      .getRequest<{ headers: Record<string, string | string[] | undefined>; user?: AuthUser }>();
    const authHeader = request.headers.authorization;

    if (typeof authHeader !== "string" || !authHeader.startsWith("Bearer ")) {
      throw new UnauthorizedException("Token faltante");
    }

    const token = authHeader.replace("Bearer ", "").trim();
    try {
      const payload = this.jwtService.verify<AuthUser>(token);
      request.user = payload;
      return true;
    } catch {
      throw new UnauthorizedException("Token invalido");
    }
  }
}
