import { describe, expect, it } from 'vitest';
import { Task } from '../models/task.model';
import { getVisibleTasks } from './task-utils';

describe('getVisibleTasks', () => {
  it('filters archived tasks, labels remaining tasks, and sorts by priority descending', () => {
    const tasks: Task[] = [
      { id: 'low', status: 'TODO', priority: 'LOW', owner: 'student' },
      { id: 'archived', status: 'ARCHIVED', priority: 'URGENT', owner: 'student' },
      { id: 'high', status: 'DONE', priority: 'HIGH', owner: 'student' }
    ];

    expect(getVisibleTasks(tasks)).toEqual([
      { id: 'low', status: 'TODO', priority: 'LOW', owner: 'student', label: 'LOW · STUDENT' },
      { id: 'high', status: 'DONE', priority: 'HIGH', owner: 'student', label: 'HIGH · STUDENT' }
    ]);
    expect(tasks[0].label).toBeUndefined();
  });

  it('returns an empty list when no tasks are provided', () => {
    expect(getVisibleTasks([])).toEqual([]);
  });

  it('sorts equal priorities without changing their relative order', () => {
    const tasks: Task[] = [
      { id: 'first', status: 'TODO', priority: 'HIGH' },
      { id: 'second', status: 'TODO', priority: 'HIGH' }
    ];

    expect(getVisibleTasks(tasks).map((task) => task.id)).toEqual(['first', 'second']);
  });

  it('sorts a lower priority after a higher priority regardless of input order', () => {
    const tasks: Task[] = [
      { id: 'high', status: 'TODO', priority: 'HIGH' },
      { id: 'low', status: 'TODO', priority: 'LOW' }
    ];

    expect(getVisibleTasks(tasks).map((task) => task.id)).toEqual(['low', 'high']);
  });
});
