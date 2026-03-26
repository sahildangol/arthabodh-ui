
export interface User {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  isVerified: boolean;
}

export interface LoginResponse {
  token: string;
  user?: User;
}

export interface SignupRequest {
  firstName: string;
  lastName: string;
  email: string;
  password?: string;
}
export interface AuthContextType {
  user: User | null;
  token: string | null;
  login:(data:LoginResponse) => void;
  logout: () => void;
  loading: boolean;
}
