import { Component, ChangeDetectionStrategy, OnInit, DestroyRef, inject } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { skip } from 'rxjs';
import { toObservable, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterOutlet } from '@angular/router';
import { PulseTreeComponent } from './pulse-tree/pulse-tree.component';
import { PulseDetailComponent } from './pulse-detail/pulse-detail.component';
import { PulseService } from '../../services/pulse.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterOutlet, PulseTreeComponent, PulseDetailComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
})
export class DashboardComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  constructor(protected readonly pulseService: PulseService) {
    // Keep URL in sync whenever the selection changes (skip initial value)
    toObservable(this.pulseService.selectedPulseId)
      .pipe(skip(1), takeUntilDestroyed(this.destroyRef))
      .subscribe(id => {
        this.router.navigate(id ? ['/details', id] : ['/'], {
          queryParamsHandling: 'merge',
          replaceUrl: true,
        });
      });
  }

  ngOnInit(): void {
    this.pulseService.loadOverview();

    // Restore selected pulse from URL on first load
    const id = this.route.firstChild?.snapshot.params['id'];
    if (id) {
      this.pulseService.selectPulse(id);
    }
  }
}
