import { Component, ChangeDetectionStrategy, OnInit } from '@angular/core';
import { PulseTreeComponent } from './pulse-tree/pulse-tree.component';
import { PulseDetailComponent } from './pulse-detail/pulse-detail.component';
import { PulseService } from '../../services/pulse.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [PulseTreeComponent, PulseDetailComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
})
export class DashboardComponent implements OnInit {
  constructor(protected readonly pulseService: PulseService) {}

  ngOnInit(): void {
    this.pulseService.loadOverview();
  }
}
