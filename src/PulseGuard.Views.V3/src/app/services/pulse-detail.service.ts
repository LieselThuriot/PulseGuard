import { Injectable } from '@angular/core';
import { HttpClient, HttpContext } from '@angular/common/http';
import { Observable, map, retry, timer } from 'rxjs';
import { PulseDetailResultGroup, PulseMetricsResultGroup } from '../models/pulse-detail.model';
import { PulseHeatmaps } from '../models/pulse-heatmap.model';
import { PulseDeployments, PulseDetailGroupItem } from '../models/pulse-overview.model';
import { ProtobufService } from './protobuf.service';
import { SUPPRESS_NOT_FOUND } from '../interceptors/error.interceptor';

const suppressNotFound = () => new HttpContext().set(SUPPRESS_NOT_FOUND, true);

@Injectable({ providedIn: 'root' })
export class PulseDetailService {
  private readonly retryConfig = { count: 1, delay: (_err: unknown, retryCount: number) => timer(retryCount * 1000) } as const;

  constructor(
    private readonly http: HttpClient,
    private readonly proto: ProtobufService,
  ) {}

  getDetails(id: string): Observable<PulseDetailResultGroup> {
    return this.http
      .get(`api/1.0/pulses/details/${encodeURIComponent(id)}`, { responseType: 'arraybuffer' })
      .pipe(retry(this.retryConfig), map((buf) => this.proto.decodePulseDetails(buf)));
  }

  getArchivedDetails(id: string): Observable<PulseDetailResultGroup> {
    return this.http
      .get(`api/1.0/pulses/details/${encodeURIComponent(id)}/archived`, { responseType: 'arraybuffer', context: suppressNotFound() })
      .pipe(retry(this.retryConfig), map((buf) => this.proto.decodePulseDetails(buf)));
  }

  getMetrics(id: string): Observable<PulseMetricsResultGroup> {
    return this.http
      .get(`api/1.0/metrics/${encodeURIComponent(id)}`, { responseType: 'arraybuffer', context: suppressNotFound() })
      .pipe(retry(this.retryConfig), map((buf) => this.proto.decodeMetrics(buf)));
  }

  getArchivedMetrics(id: string): Observable<PulseMetricsResultGroup> {
    return this.http
      .get(`api/1.0/metrics/${encodeURIComponent(id)}/archived`, { responseType: 'arraybuffer', context: suppressNotFound() })
      .pipe(retry(this.retryConfig), map((buf) => this.proto.decodeMetrics(buf)));
  }

  getHeatmap(id: string): Observable<PulseHeatmaps> {
    return this.http
      .get(`api/1.0/pulses/heatmap/${encodeURIComponent(id)}`, { responseType: 'arraybuffer', context: suppressNotFound() })
      .pipe(retry(this.retryConfig), map((buf) => this.proto.decodeHeatmaps(buf)));
  }

  getDeployments(id: string): Observable<PulseDeployments> {
    return this.http
      .get<PulseDeployments>(`api/1.0/pulses/application/${encodeURIComponent(id)}/deployments`, { context: suppressNotFound() })
      .pipe(retry(this.retryConfig));
  }

  getLogs(id: string, continuationToken?: string, pageSize = 50): Observable<PulseDetailGroupItem> {
    let url = `api/1.0/pulses/application/${encodeURIComponent(id)}?pageSize=${pageSize}`;
    if (continuationToken) {
      url += `&continuationToken=${encodeURIComponent(continuationToken)}`;
    }
    return this.http.get<PulseDetailGroupItem>(url, { context: suppressNotFound() }).pipe(retry(this.retryConfig));
  }
}
