import { HttpInterceptorFn, HttpRequest, HttpErrorResponse, provideHttpClient, withInterceptors, HttpContext } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { HttpClient } from '@angular/common/http';
import { errorInterceptor, SUPPRESS_NOT_FOUND } from './error.interceptor';
import { NotificationService } from '../services/notification.service';

describe('errorInterceptor', () => {
  let httpClient: HttpClient;
  let httpTesting: HttpTestingController;
  let notifications: NotificationService;

  beforeEach(() => {
    // Clear reload guard state
    sessionStorage.removeItem('pulseguard_401_reload');

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([errorInterceptor])),
        provideHttpClientTesting(),
      ],
    });

    httpClient = TestBed.inject(HttpClient);
    httpTesting = TestBed.inject(HttpTestingController);
    notifications = TestBed.inject(NotificationService);
  });

  afterEach(() => {
    httpTesting.verify();
    sessionStorage.removeItem('pulseguard_401_reload');
  });

  it('should show permission error on 403', () => {
    const spy = jest.spyOn(notifications, 'error');
    httpClient.get('/test').subscribe({ error: () => {} });

    httpTesting.expectOne('/test').error(new ProgressEvent('error'), { status: 403 });

    expect(spy).toHaveBeenCalledWith('You do not have permission to perform this action.');
  });

  it('should show connection error on status 0', () => {
    const spy = jest.spyOn(notifications, 'error');
    httpClient.get('/test').subscribe({ error: () => {} });

    httpTesting.expectOne('/test').error(new ProgressEvent('error'), { status: 0 });

    expect(spy).toHaveBeenCalledWith('Unable to connect to the server.');
  });

  it('should show server error on 500+', () => {
    const spy = jest.spyOn(notifications, 'error');
    httpClient.get('/test').subscribe({ error: () => {} });

    httpTesting.expectOne('/test').error(new ProgressEvent('error'), { status: 500 });

    expect(spy).toHaveBeenCalledWith('A server error occurred. Please try again later.');
  });

  it('should show generic error on 4xx (e.g. 400)', () => {
    const spy = jest.spyOn(notifications, 'error');
    httpClient.get('/test').subscribe({ error: () => {} });

    httpTesting.expectOne('/test').error(new ProgressEvent('error'), { status: 400 });

    expect(spy).toHaveBeenCalledWith('Request failed (400). Please check your input and try again.');
  });

  it('should show generic error on 404', () => {
    const spy = jest.spyOn(notifications, 'error');
    httpClient.get('/test').subscribe({ error: () => {} });

    httpTesting.expectOne('/test').error(new ProgressEvent('error'), { status: 404 });

    expect(spy).toHaveBeenCalledWith('Request failed (404). Please check your input and try again.');
  });

  it('should not show a toast for 404 when SUPPRESS_NOT_FOUND is set', () => {
    const spy = jest.spyOn(notifications, 'error');
    const ctx = new HttpContext().set(SUPPRESS_NOT_FOUND, true);
    httpClient.get('/test', { context: ctx }).subscribe({ error: () => {} });

    httpTesting.expectOne('/test').error(new ProgressEvent('error'), { status: 404 });

    expect(spy).not.toHaveBeenCalled();
  });

  it('should show session expired on repeated 401 within guard window', () => {
    const spy = jest.spyOn(notifications, 'error');
    // Simulate a recent reload
    sessionStorage.setItem('pulseguard_401_reload', String(Date.now()));

    httpClient.get('/test').subscribe({ error: () => {} });
    httpTesting.expectOne('/test').error(new ProgressEvent('error'), { status: 401 });

    expect(spy).toHaveBeenCalledWith('Your session has expired. Please refresh the page.');
  });
});
