export enum UserRole {
  ADMIN = "admin",
  TEACHER = "teacher",
}

export interface AuthUser {
  sub: string;
  role: UserRole;
  institutionId: string;
}

