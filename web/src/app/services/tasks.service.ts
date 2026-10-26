import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { Task } from '../models/task.model';
import { SessionService } from './session.service';

@Injectable({ providedIn: 'root' })
export class TasksService {
  constructor(private readonly http: HttpClient, private readonly sessionService: SessionService) {}

  async getTasks(owner: string): Promise<Task[]> {
    const session = this.sessionService.readSession();
    if (!session) {
      throw new Error('Cannot request tasks without an active session');
    }

    return firstValueFrom(
      this.http.get<Task[]>(environment.tasksApiUrl, {
        params: new HttpParams().set('owner', owner),
        headers: new HttpHeaders({ Authorization: `Bearer ${session.token}` })
      })
    );
  }
}
