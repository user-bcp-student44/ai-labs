import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthenticatedUser } from '../models/auth.models';
import { Task } from '../models/task.model';
import { SessionService } from '../services/session.service';
import { TasksService } from '../services/tasks.service';
import { getVisibleTasks } from '../utils/task-utils';

const STATUS_LABELS: Record<string, string> = {
  TODO: 'Por hacer',
  IN_PROGRESS: 'En progreso',
  DONE: 'Completado',
  RESUELTO: 'Resuelto',
  COMPLETED: 'Completado'
};

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit {
  tasks: Task[] = [];
  visibleTasks: Task[] = [];
  user: AuthenticatedUser = {};
  loading = true;
  error = '';

  constructor(
    private readonly router: Router,
    private readonly sessionService: SessionService,
    private readonly tasksService: TasksService
  ) {}

  statusLabel(status: string): string {
    return STATUS_LABELS[status.toUpperCase()] || status;
  }

  async ngOnInit(): Promise<void> {
    const session = this.sessionService.readSession();
    if (!session) {
      await this.router.navigate(['/login']);
      return;
    }

    this.user = session.user;
    try {
      this.tasks = await this.tasksService.getTasks(session.user.username ?? '');
      this.visibleTasks = getVisibleTasks(this.tasks);
    } catch (error: unknown) {
      console.error('Task request failed', error);
      this.error = 'No se pudo cargar el dashboard. Inténtalo de nuevo.';
    } finally {
      this.loading = false;
    }
  }

  async logout(): Promise<void> {
    this.sessionService.clearSession();
    await this.router.navigate(['/login']);
  }
}
