export interface JwtPayload {
  sub: number; // ID del usuario
  email: string; // Email del usuario
  role: 'ADMIN' | 'CAJERO' | 'INVENTARIO'; // Roles definidos en tu sistema
  restaurantId: number | null; // ID del restaurante asociado (si aplica)
  isSuperAdmin: boolean; 
}