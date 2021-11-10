import {Inject, Injectable, ModuleWithProviders, NgModule} from '@angular/core';
import {HttpErrorResponse, HttpHandler, HttpHeaders, HttpInterceptor, HttpRequest, HttpResponse} from "@angular/common/http";
import {Observable, of, throwError, timer} from "rxjs";
import {delay, mergeMap} from "rxjs/operators";

export interface HttpMock<T = any> {
  url: string;
  method?: string;
  respBody: HttpResponse<T>;
  status?: number;
  headers?: {
    [name: string]: string;
  };
  delay?: number;
  active?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class MockService implements HttpInterceptor {

  constructor(@Inject('mockedUrls') private mockedUrls: HttpMock[]) {}

  intercept(request: HttpRequest<any>, next: HttpHandler) {
    for (const mock of this.mockedUrls.filter((m:HttpMock) => m.active !== false)) {
      if (request.url === mock.url) {
        if (mock.method && request.method !== mock.method) {
          continue;
        }

        const status = mock?.status || 200;

        let response: Observable<HttpResponse<any>> | HttpErrorResponse;

        if (status === 200) {
          response = of(
            new HttpResponse({
              status,
              body: mock.respBody,
              headers: new HttpHeaders(mock?.headers || {}),
            }),
          );
        } else {
          response = throwError(
            () => new HttpErrorResponse({
              status,
              error: mock.respBody,
            }),
          );
        }

        if (mock.delay) {
          return status === 200
            ? response.pipe(delay(mock.delay))
            : timer(mock.delay).pipe(mergeMap(() => response));
        } else {
          return response;
        }
      }
    }

    return next.handle(request);
  }
}

@NgModule()
export class HttpMockService {
  public static forRoot(mockedUrls: HttpMock[]): ModuleWithProviders<HttpMockService> {
    return {
      ngModule: HttpMockService,
      providers: [
        MockService,
        {
          provide: 'mockedUrls',
          useValue: mockedUrls,
        },
      ],
    };
  }
}
