import { NotificationService } from './notification.service';

describe('NotificationService', () => {
  let service: NotificationService;

  beforeEach(() => {
    service = new NotificationService();
  });

  it('should start with empty toasts', () => {
    expect(service.toasts()).toEqual([]);
  });

  it('should add a success toast', () => {
    service.success('It worked');
    const toasts = service.toasts();
    expect(toasts).toHaveLength(1);
    expect(toasts[0].message).toBe('It worked');
    expect(toasts[0].type).toBe('success');
  });

  it('should add an error toast', () => {
    service.error('Something failed');
    const toasts = service.toasts();
    expect(toasts).toHaveLength(1);
    expect(toasts[0].message).toBe('Something failed');
    expect(toasts[0].type).toBe('danger');
  });

  it('should add a warning toast', () => {
    service.warning('Watch out');
    const toasts = service.toasts();
    expect(toasts).toHaveLength(1);
    expect(toasts[0].type).toBe('warning');
  });

  it('should remove a toast by id', () => {
    service.success('One');
    service.success('Two');
    const id = service.toasts()[0].id;
    service.remove(id);
    expect(service.toasts()).toHaveLength(1);
    expect(service.toasts()[0].message).toBe('Two');
  });

  it('should assign unique ids', () => {
    service.success('A');
    service.success('B');
    const ids = service.toasts().map(t => t.id);
    expect(new Set(ids).size).toBe(2);
  });
});
