import { Task } from '../models/task.model';
import { formatTaskLabel } from './legacy-format';

export function getVisibleTasks(tasks: readonly Task[]): Task[] {
  return tasks
    .filter((task) => task.status !== 'ARCHIVED')
    .map((task) => ({ ...task, label: formatTaskLabel(task) }))
    .sort((first, second) => {
      if (first.priority === second.priority) {
        return 0;
      }
      return (first.priority ?? '') > (second.priority ?? '') ? -1 : 1;
    });
}
