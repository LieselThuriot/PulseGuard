import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { UserInfo } from '../models/user-info.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly _userInfo = signal<UserInfo | null>(null);
  private readonly _loaded = signal(false);

  readonly userInfo = this._userInfo.asReadonly();
  readonly loaded = this._loaded.asReadonly();
  readonly isAdmin = computed(() => this._userInfo()?.roles?.includes('Administrator') ?? false);
  readonly hasCredentials = computed(() => this._userInfo()?.roles?.includes('Credentials') ?? false);

  constructor(private readonly http: HttpClient) {
    this.loadUser();
  }

  private loadUser(): void {
    this.http.get<UserInfo>('api/1.0/user').subscribe({
      next: (user) => {
        this._userInfo.set(user);
        this._loaded.set(true);
      },
      error: () => {
        this._userInfo.set(null);
        this._loaded.set(true);
      },
    });
  }
}
