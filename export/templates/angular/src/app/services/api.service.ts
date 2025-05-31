import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';

interface LoginResponse {
  token: string;
}
@Injectable({
  providedIn: 'root',
})
export class ApiService {
  apiUrl: string = ' ' //api poner la pai base
  tokenKey = 'authToken';

  constructor(private http: HttpClient, private router: Router) {}
  // Método para registrar un nuevo usuario
  register(name: string, email: string, password: string): Observable<any> {
    return this.http
      .post(`${this.apiUrl}/auth/register`, { name, email, password })
      .pipe(
        tap((response) => {
          console.log('Usuario registrado:', response);
        }),
        catchError((err) => {
          console.error('Error en el registro:', err);
          throw err;
        })
      );
  }
  login(email: string, password: string): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${this.apiUrl}/auth/login`, { email, password }) // Cambia 'username' por 'email'
      .pipe(
        tap((response) => {
          if (response.token) {
            console.log(response.token);
            this.setToken(response.token);
          }
        }),
        catchError((err) => {
          console.error('Error en el login:', err);
          throw err;
        })
      );
  }
  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }
  // Guardar el token en el localStorage
  private setToken(token: string): void {
    localStorage.setItem(this.tokenKey, token);
  }


  isAuthenticated(): boolean {
    const token = this.getToken();
    if (!token) {
      return false;
    }

    const payload = JSON.parse(atob(token.split('.')[1]));
    const exp = payload.exp * 1000;
    return Date.now() < exp;
  }

  // Crear una sala con el encabezado de autenticación
  createRoom(createRoomDto: any): Observable<any> {
    const headers = new HttpHeaders().set(
      'Authorization',
      `Bearer ${this.getToken()}`
    );
    return this.http.post<any>(`${this.apiUrl}/rooms`, createRoomDto, {
      headers,
    });
  }

  // Función para cerrar sesión
  logout(): void {
    console.log('logout');
    localStorage.removeItem(this.tokenKey); // Elimina el token del almacenamiento local
    this.router.navigate(['']); // Redirige al usuario a la página de login
  }
}
