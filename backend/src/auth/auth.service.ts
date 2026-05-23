import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { LoginDto } from "./dto/login.dto";
import { UserRole } from "./auth.types";

@Injectable()
export class AuthService {
  constructor(private readonly jwtService: JwtService) {}

  async login(dto: LoginDto) {
    // Stub inicial para MVP: reemplazar por verificacion real en users.
    if (!dto.email || !dto.password) {
      throw new UnauthorizedException("Credenciales invalidas");
    }

    const role = dto.email.includes("admin") ? UserRole.ADMIN : UserRole.TEACHER;
    const payload = {
      sub: dto.email,
      role,
      institutionId: "inst_default",
    };

    return {
      accessToken: await this.jwtService.signAsync(payload),
      user: payload,
    };
  }
}

