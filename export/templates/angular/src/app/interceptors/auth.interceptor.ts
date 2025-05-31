import { HttpInterceptorFn } from '@angular/common/http';
import { ApiService } from '../services/api.service';
import { inject } from '@angular/core';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const apiService = inject(ApiService);
  const authToken = apiService.getToken();

  if (authToken) {
    req = req.clone({
      setHeaders: {
        Authorization: `Bearer ${authToken}`
      }
    });
  }
  return next(req);
};
